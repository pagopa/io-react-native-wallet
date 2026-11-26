package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import org.bouncycastle.asn1.DEROctetString
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.asn1.x509.KeyUsage
import java.security.cert.X509Certificate

internal class KeyUsage : ProfileValidation {

    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        val byteArray = readerAuthCertificate.getExtensionValue(Extension.keyUsage.id) ?: run {
            return false
        }

        return KeyUsage.getInstance(
            DEROctetString.getInstance(byteArray).octets,
        ).hasUsages(KeyUsage.digitalSignature).also {
            ProximityLogger.d(this.javaClass.name, "checkKeyUsageExtension: $it")
        }
    }
}