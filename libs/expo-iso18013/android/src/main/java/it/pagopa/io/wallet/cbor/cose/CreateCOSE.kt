package it.pagopa.io.wallet.cbor.cose

import COSE.AlgorithmID.ECDSA_256
import COSE.Sign1Message
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.annotation.CheckResult
import com.upokecenter.cbor.CBORObject
import org.bouncycastle.asn1.ASN1Integer
import org.bouncycastle.asn1.ASN1Sequence
import org.bouncycastle.crypto.signers.PlainDSAEncoding
import org.bouncycastle.math.ec.custom.sec.SecP256R1Curve
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import COSE.HeaderKeys.Algorithm as BaseAlgorithm

internal class CreateCOSE private constructor() {
    private var alias = ""
    private val keyStoreType by lazy {
        "AndroidKeyStore"
    }

    private fun keyExists(): Boolean {
        return try {
            val keyStore = KeyStore.getInstance(keyStoreType).apply { load(null) }
            keyStore.containsAlias(alias)
        } catch (_: Exception) {
            false
        }
    }

    private fun generateKey() {
        val keyPairGenerator =
            KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                keyStoreType
            )
        val keyGenParameterSpec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        ).setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .build()
        keyPairGenerator.initialize(keyGenParameterSpec)
        keyPairGenerator.generateKeyPair()
    }

    private fun getPrivateKeyAndPublicKey(): Pair<PrivateKey, PublicKey>? {
        val keyStore = KeyStore.getInstance(keyStoreType).apply { load(null) }
        val entry = keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry ?: return null
        return entry.privateKey to entry.certificate.publicKey
    }

    private fun signDataRaw(data: ByteArray, privateKey: PrivateKey): ByteArray? {
        return try {
            val signature = Signature.getInstance("SHA256withECDSA")
            signature.initSign(privateKey)
            signature.update(data)
            val derSignature = signature.sign()
            val seq = ASN1Sequence.getInstance(derSignature)
            val r = (seq.getObjectAt(0) as ASN1Integer).value
            val s = (seq.getObjectAt(1) as ASN1Integer).value
            val n = SecP256R1Curve().order
            PlainDSAEncoding.INSTANCE.encode(n, r, s)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun ByteArray.signWithCOSE(): SignWithCOSEResult {
        if (!keyExists())
            return SignWithCOSEResult.Failure(FailureReason.NO_KEY)
        val pair = getPrivateKeyAndPublicKey()
            ?: return SignWithCOSEResult.Failure(FailureReason.PRIVATE_KEY_AND_PUBLIC_KEY_FAILURE)
        val (private, public) = pair
        val signature = signDataRaw(this, private) ?: return SignWithCOSEResult.Failure(
            FailureReason.FAIL_TO_SIGN
        )
        return SignWithCOSEResult.Success(signature, public.encoded)
    }

    @CheckResult
    fun sign(data: ByteArray, isDetached: Boolean): SignWithCOSEResult {
        val msg = Sign1Message(false, true)
        val protectedAttr: CBORObject =
            msg.protectedAttributes.Add(BaseAlgorithm.AsCBOR(), ECDSA_256.AsCBOR())
        val unprotectedAttributes = msg.unprotectedAttributes
        val array = CBORObject.NewArray()
        array.Add("Signature1")
        array.Add(protectedAttr.EncodeToBytes())
        array.Add(byteArrayOf())
        array.Add(data)
        val dataToSign = array.EncodeToBytes()
        return when (val result = dataToSign.signWithCOSE()) {
            is SignWithCOSEResult.Failure -> SignWithCOSEResult.Failure(result.reason)
            is SignWithCOSEResult.Success -> {
                SignWithCOSEResult.Success(
                    CBORObject.NewArray().apply {
                        this.Add(protectedAttr.EncodeToBytes())
                        this.Add(unprotectedAttributes)
                        this.Add(if (isDetached) null else data)
                        this.Add(result.signature)
                    }.EncodeToBytes(),
                    result.publicKey
                )
            }
        }
    }

    companion object {
        fun build(alias: String) = CreateCOSE().apply {
            this.alias = alias
        }
    }
}