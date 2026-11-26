package it.pagopa.io.wallet.proximity.document.reader_auth

import it.pagopa.io.wallet.proximity.document.profile.ProfileValidation
import java.security.cert.X509Certificate

/**
 * Interface that defines a trust manager, used to check the validity of a
 * document signer and the associated certificate chain.
 *
 *
 * Note that each document type should have a different trust manager; this
 * trust manager is selected by OID in the DS certificate. These trust managers
 * should have a specific TrustStore for each certificate and may implement
 * specific checks required for the document type.
 */
interface ReaderTrustStore {
    /**
     * This method creates a certification trust path by finding a certificate in the
     * trust store that is the issuer of a certificate in the certificate chain.
     * It returns `null` if no trusted certificate can be found.
     *
     * @param chain the chain, leaf certificate first, followed by any certificate that signed the previous certificate
     * @return the certification path in the same order, or null if no certification trust path could be created
     */
    fun createCertificationTrustPath(chain: List<X509Certificate>): List<X509Certificate>?

    /**
     * This method validates that the given certificate chain is a valid chain that
     * includes a document signer. Accepts a chain of certificates, starting with
     * the document signer certificate, followed by any intermediate certificates up
     * to the optional root certificate.
     *
     *
     * The trust manager should be initialized with a set of trusted certificates.
     * The chain is trusted if a trusted certificate can be found that has signed
     * any certificate in the chain. The trusted certificate itself will be
     * validated as well.
     *
     * @param chainToDocumentSigner the document signer, intermediate certificates                              and optional root certificate
     * @return false if no trusted certificate could be found for the certificate chain or if the certificate chain is invalid for any reason
     */
    fun validateCertificationTrustPath(chainToDocumentSigner: List<X509Certificate>): Boolean

    companion object {
        /**
         * Returns a default trust store that uses the given list of trusted certificates.
         *
         * @param trustedCertificates the trusted certificates
         */
        fun getDefault(trustedCertificates: List<X509Certificate>): ReaderTrustStore {
            return ReaderTrustStoreImpl(trustedCertificates, ProfileValidation.DEFAULT)
        }
    }
}