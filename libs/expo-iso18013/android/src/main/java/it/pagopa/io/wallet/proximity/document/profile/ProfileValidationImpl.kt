package it.pagopa.io.wallet.proximity.document.profile

import java.security.cert.X509Certificate

internal class ProfileValidationImpl(private val profileValidations: Collection<ProfileValidation>) :
    ProfileValidation {
    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        return profileValidations.all {
            it.validate(readerAuthCertificate, trustCA)
        }
    }
}