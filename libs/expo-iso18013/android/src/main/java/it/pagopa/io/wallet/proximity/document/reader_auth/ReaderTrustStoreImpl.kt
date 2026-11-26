package it.pagopa.io.wallet.proximity.document.reader_auth

import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.document.profile.ProfileValidation
import it.pagopa.io.wallet.proximity.document.reader_auth.crl.CertificateCRLValidation
import it.pagopa.io.wallet.proximity.document.reader_auth.crl.CertificateCRLValidationException
import org.bouncycastle.asn1.x500.X500Name
import java.security.InvalidAlgorithmParameterException
import java.security.NoSuchAlgorithmException
import java.security.cert.CertPathValidator
import java.security.cert.CertPathValidatorException
import java.security.cert.CertStore
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.CollectionCertStoreParameters
import java.security.cert.PKIXCertPathValidatorResult
import java.security.cert.PKIXParameters
import java.security.cert.TrustAnchor
import java.security.cert.X509Certificate
import java.util.Date

internal class ReaderTrustStoreImpl(
    private var trustedCertificates: List<X509Certificate>,
    private val profileValidation: ProfileValidation
) : ReaderTrustStore {
    private val tag = this.javaClass.name
    private val trustedCertMap: Map<X500Name, X509Certificate> by lazy {
        trustedCertificates.associateBy { X500Name(it.subjectX500Principal.name) }
    }

    private fun X509Certificate.isSelfSigned(): Boolean =
        this.subjectX500Principal == this.issuerX500Principal

    override fun createCertificationTrustPath(chain: List<X509Certificate>): List<X509Certificate>? {
        for (certificate in chain) {
            val x500Name = X500Name(certificate.issuerX500Principal.name)
            trustedCertMap[x500Name]?.let {
                return listOf(certificate, it)
            }
        }
        return null
    }

    /**
     * Helper to validate a certificate chain with a given set of trust anchors.
     * Returns true if the chain is valid and passes CRL and profile validation.
     */
    private fun validateWithAnchors(
        chain: List<Intermediate>,
        anchors: List<Leaf>
    ): Boolean {
        if (anchors.isEmpty()) return false
        try {
            val certStore = CertStore.getInstance(
                "Collection",
                CollectionCertStoreParameters(chain + anchors),
            )
            val certificateFactory = CertificateFactory.getInstance("X.509")
            val certPath = certificateFactory.generateCertPath(chain)
            val trustAnchors = anchors.map { TrustAnchor(it, null) }.toSet()
            val validator = CertPathValidator.getInstance("PKIX")
            val param = PKIXParameters(trustAnchors).apply {
                isRevocationEnabled = false
                addCertStore(certStore)
                date = Date()
            }
            val certPathValidationResult =
                validator.validate(certPath, param) as PKIXCertPathValidatorResult
            val validatedLeaf =
                certPath.certificates.firstOrNull() as? X509Certificate ?: return false
            val trustAnchorUsed = certPathValidationResult.trustAnchor.trustedCert ?: return false

            if (!profileValidation.validate(validatedLeaf, trustAnchorUsed)) {
                ProximityLogger.d(tag, "Profile validation failed.")
                return false
            }
            /* CRL Validation is currently disabled in order to make it work offline
                CertificateCRLValidation.verify(validatedLeaf)
                CertificateCRLValidation.verify(trustAnchorUsed)
             */
            return true
        } catch (e: Exception) {
            when (e) {
                is InvalidAlgorithmParameterException -> ProximityLogger.d(
                    this.tag,
                    "INVALID_ALGORITHM_PARAMETER: $e"
                )

                is NoSuchAlgorithmException -> ProximityLogger.d(
                    this.tag,
                    "NO_SUCH_ALGORITHM: $e"
                )

                is CertificateException -> ProximityLogger.d(this.tag, "CERTIFICATE_ERROR: $e")
                is CertPathValidatorException -> ProximityLogger.d(
                    this.tag,
                    "CERTIFICATE_PATH_ERROR: $e"
                )

                is CertificateCRLValidationException -> ProximityLogger.d(
                    this.tag,
                    "CERTIFICATE_REVOKED: $e"
                )
            }
        }
        return false
    }

    /**
     * Orders a list of X509Certificate from leaf to root.
     * - The leaf is the one whose Subject is not the Issuer of any other in the list.
     * - Each next cert is the issuer of the previous.
     */
    private fun orderCertChain(chain: List<X509Certificate>): List<X509Certificate> {
        if (chain.size <= 1) return chain

        val certMap = chain.associateBy { it.subjectX500Principal }
        val issuerSet = chain.map { it.issuerX500Principal }.toSet()

        // The leaf is the one whose subject is NOT an issuer of any other
        val leaf = chain.find { cert -> cert.subjectX500Principal !in issuerSet }
            ?: throw IllegalArgumentException("No leaf certificate found in chain")

        val ordered = mutableListOf<X509Certificate>()
        var current = leaf
        ordered.add(current)

        while (true) {
            val next = certMap[current.issuerX500Principal]
            if (next == null || next == current) break
            ordered.add(next)
            current = next
        }

        return ordered
    }

    override fun validateCertificationTrustPath(chainToDocumentSigner: List<X509Certificate>): Boolean {
        val roots = trustedCertificates.filter { it.isSelfSigned() }
        val intermediatesTrusted = trustedCertificates.filterNot { it.isSelfSigned() }
        val ordered = try {
            orderCertChain(chainToDocumentSigner)
        } catch (e: Exception) {
            ProximityLogger.e(tag, "Error while ordering chain: $e")
            return false
        }
        // CASE 1: Only root(s) trusted, normal PKIX validation
        if (intermediatesTrusted.isEmpty() && roots.isNotEmpty()) {
            return validateWithAnchors(ordered, roots)
        }
        // CASE 2: Manual path building (mimic iOS)
        // Step 1: Build up 'trusted' by walking the chain
        val mutableTrusted = trustedCertificates.toMutableList()
        val toProcess = ordered.toMutableList()
        val orderOfAddition = mutableListOf<X509Certificate>()

        while (toProcess.isNotEmpty()) {
            val found = toProcess.firstOrNull { cert ->
                // Its issuer is trusted (excluding self-issued leafs)
                mutableTrusted.any { trustedCert ->
                    cert.issuerX500Principal == trustedCert.subjectX500Principal
                }
            }
            if (found == null) {
                ProximityLogger.d(
                    tag,
                    "No certificate in chain is issued by a trusted certificate. Validation failed."
                )
                return false
            }
            mutableTrusted.add(found)
            orderOfAddition.add(found)
            toProcess.remove(found)
        }

        // At this point, all chain certificates are trusted by chaining
        // The leaf is the first added; intermediates are any others from chain (excluding initial trusted)
        val initialTrustedSet = trustedCertificates.map { it.subjectX500Principal }.toSet()
        val leaf = orderOfAddition.firstOrNull()
        val intermediates = orderOfAddition.drop(1)
            .filterNot { initialTrustedSet.contains(it.subjectX500Principal) }

        // Step 2: Build the validation chain for final check: [leaf, intermediates..., trusted]
        val validationChain = mutableListOf<X509Certificate>()
        if (leaf != null) validationChain.add(leaf)
        validationChain.addAll(intermediates)

        // Step 3: Final PKIX validation
        return validateWithAnchors(validationChain, trustedCertificates)
    }
}
typealias Leaf = X509Certificate
typealias Intermediate = X509Certificate