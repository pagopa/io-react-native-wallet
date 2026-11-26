package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import org.bouncycastle.asn1.x9.X9ObjectIdentifiers
import java.security.cert.X509Certificate

internal class SignatureAlgorithm : ProfileValidation {
    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        val result =
            readerAuthCertificate.sigAlgOID == X9ObjectIdentifiers.ecdsa_with_SHA256.id ||
                    readerAuthCertificate.sigAlgOID == X9ObjectIdentifiers.ecdsa_with_SHA384.id ||
                    readerAuthCertificate.sigAlgOID == X9ObjectIdentifiers.ecdsa_with_SHA512.id
        ProximityLogger.d(this.javaClass.name, "SignatureAlgorithm: $result")
        return result
    }
}