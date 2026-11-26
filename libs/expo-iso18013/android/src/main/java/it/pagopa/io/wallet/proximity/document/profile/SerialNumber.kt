package it.pagopa.io.wallet.proximity.document.profile

import java.security.cert.X509Certificate

class SerialNumber: ProfileValidation {
    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate
    ): Boolean {
        return readerAuthCertificate.serialNumber.bitLength() >= 63
                && readerAuthCertificate.serialNumber.bitLength() <= 160
    }
}