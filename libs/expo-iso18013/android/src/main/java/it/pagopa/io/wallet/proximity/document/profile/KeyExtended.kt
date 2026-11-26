package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import java.security.cert.X509Certificate

private const val READER_AUTH_OID = "1.0.18013.5.1.6"

internal class KeyExtended : ProfileValidation {

    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        if (readerAuthCertificate.extendedKeyUsage == null) {
            ProximityLogger.i(this.javaClass.name, "KeyExtendedKeyUsage: null")
        } else if (readerAuthCertificate.extendedKeyUsage?.contains(READER_AUTH_OID) != true) {
            ProximityLogger.i(
                this.javaClass.name,
                "KeyExtendedKeyUsage not contains $READER_AUTH_OID"
            )
        } else {
            ProximityLogger.i(this.javaClass.name, "KeyExtendedKeyUsage: true")
        }
        return true
    }
}