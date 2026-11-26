package it.pagopa.io.wallet.cbor.cose

import androidx.annotation.CheckResult
import androidx.annotation.VisibleForTesting
import com.android.identity.crypto.EcSignature
import com.android.identity.crypto.toDer
import com.upokecenter.cbor.CBORObject
import it.pagopa.io.wallet.cbor.CborLogger
import it.pagopa.io.wallet.cbor.extensions.isDer
import it.pagopa.io.wallet.cbor.helper.addBcIfNeeded
import org.bouncycastle.asn1.x509.SubjectPublicKeyInfo
import org.bouncycastle.jce.ECNamedCurveTable
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec
import org.bouncycastle.jce.spec.ECPublicKeySpec
import org.json.JSONObject
import java.math.BigInteger
import java.security.KeyFactory
import java.security.PublicKey
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi
import org.bouncycastle.util.encoders.Base64 as B64BC

/**
 * With this class you can sign every object with COSE*/
class COSEManager {
    //ONLY FOR TEST PURPOSE
    private var createCOSE: CreateCOSE? = null

    init {
        addBcIfNeeded()
    }

    @VisibleForTesting
    internal fun withCreateCOSE(createCOSE: CreateCOSE) = apply {
        this.createCOSE = createCOSE
    }

    @CheckResult
    fun signWithCOSE(
        data: ByteArray,
        alias: String = "pagoPaAlias",
        isDetached: Boolean = false
    ): SignWithCOSEResult {
        return try {
            if (createCOSE != null)
                createCOSE!!.sign(data, isDetached)
            else
                CreateCOSE.build(alias).sign(data, isDetached)
        } catch (e: Exception) {
            CborLogger.e("signWithCOSE", e.toString())
            SignWithCOSEResult.Failure(FailureReason.EXCEPTION.apply {
                this.msg = e.message.orEmpty()
            })
        }
    }

    @VisibleForTesting
    fun algorithmFromProtectedHeader(protectedHeader: CBORObject): String {
        return when (protectedHeader[1].AsInt32()) {
            -7 -> "SHA256withECDSA"
            -35 -> "SHA384withECDSA"
            -36 -> "SHA512withECDSA"
            -37 -> "SHA256withRSA"
            -38 -> "SHA384withRSA"
            -39 -> "SHA512withRSA"
            else -> throw IllegalArgumentException("Unsupported algorithm")
        }
    }

    /**
     * Converts a JSON Web Key (JWK) with EC (Elliptic Curve) parameters into a Java PublicKey instance using Bouncy Castle.
     *
     * @param jwkJson A JSON string containing the JWK with EC parameters.
     *                The JWK must include the following fields:
     *                - "crv": The name of the elliptic curve (e.g., "P-256", "P-384", etc.).
     *                - "x": The x-coordinate of the public key, Base64URL-encoded.
     *                - "y": The y-coordinate of the public key, Base64URL-encoded.
     * @return A `PublicKey` instance representing the EC public key.
     * @throws Exception if the conversion fails due to invalid input or configuration.
     * @throws IllegalArgumentException if key type is not 'EC'
     */
    @VisibleForTesting
    fun jwkToPublicKey(jwkJson: String): PublicKey {
        // Parse the JWK JSON string into a JSONObject.
        // JSONObject is used to extract the required fields: "crv", "x", and "y".
        val jwk = JSONObject(jwkJson)
        // Extract the "crv" field, which specifies the name of the elliptic curve (e.g., "P-256").
        val crv = jwk.getString("crv")
        // Extract the "x" and "y" fields, which are the x and y coordinates of the public key.
        // These are Base64URL-encoded strings.
        val x = jwk.getString("x")
        val y = jwk.getString("y")
        val kty = jwk.getString("kty")
        if (kty != "EC")
            throw IllegalArgumentException("Unsupported key type")
        // Decode the x and y coordinates from Base64URL format into byte arrays.
        // Then convert these byte arrays into BigInteger instances.
        // '1' ensures the number is treated as positive
        val xCoordinate = BigInteger(1, B64BC.decode(x))
        val yCoordinate = BigInteger(1, B64BC.decode(y))
        // Use Bouncy Castle to fetch the elliptic curve parameters using the curve name ("crv").
        // ECNamedCurveTable.getParameterSpec() retrieves the specification for the given curve.
        val ecSpec: ECNamedCurveParameterSpec = ECNamedCurveTable.getParameterSpec(crv)
        // Create the elliptic curve point using the x and y coordinates.
        // ecSpec.curve is the mathematical representation of the elliptic curve.
        val ecPoint = ecSpec.curve.createPoint(xCoordinate, yCoordinate)
        // Create a public key specification (ECPublicKeySpec) using the curve parameters and the EC point.
        val keySpec = ECPublicKeySpec(ecPoint, ecSpec)
        // Use the Java KeyFactory to generate the public key from the key specification.
        // The provider "BC" refers to the Bouncy Castle library, which must be properly configured.
        val keyFactory = KeyFactory.getInstance(kty, BouncyCastleProvider.PROVIDER_NAME)
        // Generate and return the public key.
        return keyFactory.generatePublic(keySpec)
    }

    private fun verifySign1(
        signature: ByteArray,
        publicKey: ByteArray,
        protectedHeader: CBORObject,
        data: ByteArray
    ): Boolean {
        return try {
            val subjectPublicKeyInfo = SubjectPublicKeyInfo.getInstance(publicKey)
            val publicKeySpec = X509EncodedKeySpec(subjectPublicKeyInfo.getEncoded())
            val keyFactory = KeyFactory.getInstance("ECDSA", BouncyCastleProvider.PROVIDER_NAME)
            val pubKey = keyFactory.generatePublic(publicKeySpec)
            val derSignature = if (EcSignature.isDer(signature))
                signature
            else
                EcSignature.fromCoseEncoded(signature).toDer()
            val alg = algorithmFromProtectedHeader(protectedHeader)
            Signature.getInstance(alg, BouncyCastleProvider.PROVIDER_NAME).apply {
                initVerify(pubKey)
                update(data)
            }.verify(derSignature)
        } catch (e: Exception) {
            CborLogger.e("verifying", e.toString())
            false
        }
    }

    /**It verifies sign1 with jwk
     * @param dataSigned dataSigned as [ByteArray]
     * @param jwk jwk string
     * @return true if data is valid, false otherwise*/
    fun verifySign1FromJWK(
        dataSigned: ByteArray,
        jwk: String
    ): Boolean = verifySign1(
        dataSigned,
        jwkToPublicKey(jwk).encoded
    )

    /**It verifies sign1 with public key
     * @param dataSigned dataSigned as [ByteArray]
     * @param publicKey publicKey as [ByteArray]]
     * @return true if data is valid, false otherwise*/
    @OptIn(ExperimentalEncodingApi::class)
    fun verifySign1(
        dataSigned: ByteArray,
        publicKey: ByteArray
    ): Boolean {
        try {
            CborLogger.i("dataSigned", Base64.encode(dataSigned))
            val cborArray = CBORObject.DecodeFromBytes(dataSigned)
            // extracting CBOR components
            val protectedHeader = cborArray[0].GetByteString()
            val data = cborArray[2].GetByteString()
            val array = CBORObject.NewArray()
            array.Add("Signature1")
            array.Add(protectedHeader)
            array.Add(byteArrayOf())
            array.Add(data)
            val dataToVerify = array.EncodeToBytes()
            CborLogger.i("dataToVerify", Base64.encode(dataToVerify))
            CborLogger.i("dataToVerify length", dataToVerify.size.toString())
            val signature = cborArray[3].GetByteString()
            CborLogger.i("PUBKEY HERE", Base64.encode(publicKey))
            CborLogger.i("DATA HERE", Base64.encode(data))
            return verifySign1(
                signature,
                publicKey,
                CBORObject.DecodeFromBytes(cborArray[0].GetByteString()),
                dataToVerify
            )
        } catch (e: Exception) {
            CborLogger.e("verifying", e.toString())
            return false
        }
    }
}