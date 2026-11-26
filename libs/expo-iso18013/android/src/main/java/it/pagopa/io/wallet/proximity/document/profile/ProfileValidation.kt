package it.pagopa.io.wallet.proximity.document.profile

import java.security.cert.X509Certificate

internal fun interface ProfileValidation {

    companion object {
        @JvmStatic
        val DEFAULT: ProfileValidation = ProfileValidationImpl(
            listOf(
                MandatoryExtensions(),
                SerialNumber(),
                IssuerAlternativeName(),
                AuthorityKey(),
                CommonName(),
                CriticalExtensions(),
                KeyExtended(),
                KeyUsage(),
                Period(),
                SignatureAlgorithm(),
                SubjectKey(),
            ),
        )
    }
    fun validate(readerAuthCertificate: X509Certificate, trustCA: X509Certificate): Boolean
}