package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import org.bouncycastle.asn1.x509.Extension
import java.security.cert.X509Certificate
import java.util.Date
import kotlin.math.abs

internal class MandatoryExtensions : ProfileValidation {
    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        if (readerAuthCertificate.getExtensionValue(Extension.authorityKeyIdentifier.id) == null) {
            return false
        }
        if (readerAuthCertificate.getExtensionValue(Extension.subjectKeyIdentifier.id) == null) {
            ProximityLogger.d(this.javaClass.name, "subjectKeyIdentifier: null")
        }
        if (readerAuthCertificate.keyUsage == null || readerAuthCertificate.keyUsage.isEmpty()) {
            return false
        }
        if (readerAuthCertificate.extendedKeyUsage == null || readerAuthCertificate.extendedKeyUsage.isEmpty()) {
            ProximityLogger.d(this.javaClass.name, "extendedKeyUsage: null")
        }
        if (readerAuthCertificate.getExtensionValue(Extension.cRLDistributionPoints.id) == null) {
            val twoDaysInSeconds = 60 * 60 * 24 * 2
            val isShortLived = abs(
                (readerAuthCertificate.notAfter.time / 1000) - (readerAuthCertificate.notBefore.time / 1000)
            ) <= twoDaysInSeconds
            if (isShortLived) {
                ProximityLogger.d(this.javaClass.name, "subjectKeyIdentifier: null")
                ProximityLogger.d(this.javaClass.name, "certificate is short lived")
            } else
                return false
        }
        return true
    }
}