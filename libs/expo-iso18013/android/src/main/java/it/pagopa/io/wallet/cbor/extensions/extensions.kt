package it.pagopa.io.wallet.cbor.extensions

import com.android.identity.crypto.EcSignature
import com.android.identity.document.NameSpacedData
import com.upokecenter.cbor.CBORObject
import com.upokecenter.cbor.CBORType
import it.pagopa.io.wallet.cbor.CborLogger
import org.bouncycastle.asn1.ASN1InputStream
import org.bouncycastle.asn1.ASN1Integer
import org.bouncycastle.asn1.ASN1Sequence
import org.json.JSONArray
import java.io.ByteArrayInputStream
import java.io.IOException
import java.util.Base64

internal fun EcSignature.Companion.isDer(derEncodedSignature: ByteArray): Boolean {
    val asn1 = try {
        ASN1InputStream(ByteArrayInputStream(derEncodedSignature)).readObject() as? ASN1Sequence
    } catch (_: IOException) {
        return false
    } catch (_: ClassCastException) {
        return false
    }
    // Check if sequence has effectively two elements
    if (asn1 == null || asn1.size() != 2) return false

    // Check if both are valid integers
    val r = asn1.getObjectAt(0) as? ASN1Integer ?: return false
    val s = asn1.getObjectAt(1) as? ASN1Integer ?: return false
    // Check if r and s are positive
    return !(!isValidInteger(r.value) || !isValidInteger(s.value))
}

private fun isValidInteger(value: java.math.BigInteger): Boolean {
    if (value.signum() < 0) return false
    val bytes = value.toByteArray()
    return !(bytes.size > 1 && bytes[0].toInt() == 0 && bytes[1].toInt() and 0x80 == 0)
}

@JvmSynthetic
internal fun CBORObject.getEmbeddedCBORObject(): CBORObject {
    return if (HasTag(24)) {
        CBORObject.DecodeFromBytes(GetByteString())
    } else {
        this
    }
}

@JvmSynthetic
internal fun CBORObject.asNameSpacedData(): NameSpacedData {
    val builder = NameSpacedData.Builder()
    keys.forEach { nameSpace ->
        this[nameSpace].values.forEach { v ->
            val el = v.getEmbeddedCBORObject()
            builder.putEntry(
                nameSpace.AsString(),
                el["elementIdentifier"].AsString(),
                el["elementValue"].EncodeToBytes(),
            )
        }
    }
    return builder.build()
}

internal fun CBORObject.extractAlg() = this.AsInt32()
internal fun CBORObject.extractCrit() = this.values.map { it.AsString() }
internal fun CBORObject.extractContentType() = this.AsString()
internal fun CBORObject.extractX5U() = this.AsString()
internal fun CBORObject.toB64() = Base64.getUrlEncoder().withoutPadding().encodeToString(this.GetByteString())
internal fun CBORObject.toCertificates(): JSONArray {
    val base64Certificates = JSONArray()
    try {
        if (this.type == CBORType.Array) {
            // Handle the case where the CBOR object is an array of byte strings
            for (i in 0 until this.size()) {
                // Extract each byte string from the array
                val certBytes = this[i].GetByteString()
                val encodedCert = Base64.getUrlEncoder().withoutPadding().encodeToString(certBytes)
                base64Certificates.put(encodedCert)
            }
        } else if (this.type == CBORType.ByteString) {
            // Handle the case where the CBOR object is a single ByteString containing multiple certificates
            val encodedCert = Base64.getUrlEncoder().withoutPadding().encodeToString(this.GetByteString())
            base64Certificates.put(encodedCert)
        } else {
            CborLogger.e(
                "Parsing Unprotected header",
                "Unexpected CBOR type: ${this.type}"
            )
        }
    } catch (e: Exception) {
        CborLogger.e(
            "Parsing Unprotected header",
            "Error parsing certificates: ${e.message}"
        )
    }
    return base64Certificates
}