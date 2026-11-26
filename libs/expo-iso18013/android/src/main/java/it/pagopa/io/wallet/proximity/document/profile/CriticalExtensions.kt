package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import org.bouncycastle.asn1.x509.Extension
import java.security.cert.X509Certificate

internal class CriticalExtensions : ProfileValidation {

    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        val nonAllowedExtensions = listOf(
            Extension.policyMappings.id,
            Extension.nameConstraints.id,
            Extension.policyConstraints.id,
            Extension.inhibitAnyPolicy.id,
            Extension.freshestCRL.id,
        )
        for (ext in readerAuthCertificate.criticalExtensionOIDs) {
            if (nonAllowedExtensions.contains(ext)) {
                ProximityLogger.d(this.javaClass.name, "CriticalExtensions invalid contains: $ext")
                return false
            }
        }
        ProximityLogger.d(this.javaClass.name, "CriticalExtensions: valid")
        return true
    }
}