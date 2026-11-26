package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import org.bouncycastle.asn1.ASN1Sequence
import org.bouncycastle.asn1.DEROctetString
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.asn1.x509.SubjectKeyIdentifier
import org.bouncycastle.asn1.x509.SubjectPublicKeyInfo
import java.security.MessageDigest
import java.security.cert.X509Certificate

internal class SubjectKey : ProfileValidation {
    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        val byteArray = readerAuthCertificate
            .getExtensionValue(
                Extension.subjectKeyIdentifier.id
            ) ?: run {
                ProximityLogger.i(this.javaClass.name, "SubjectKeyIdentifier: null")
            return true
        }

        val subjectKeyIdentifier: SubjectKeyIdentifier =
            SubjectKeyIdentifier.getInstance(DEROctetString.getInstance(byteArray).octets)

        val publicKeyInfoByteArray: ByteArray = SubjectPublicKeyInfo.getInstance(
            ASN1Sequence.getInstance(readerAuthCertificate.publicKey.encoded),
        ).publicKeyData.octets

        val hash = MessageDigest.getInstance("SHA-1").digest(publicKeyInfoByteArray)

        return subjectKeyIdentifier.keyIdentifier.contentEquals(hash).also {
            ProximityLogger.d(this.javaClass.name, "SubjectKeyIdentifier: $it")
        }
    }
}