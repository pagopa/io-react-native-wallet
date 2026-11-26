package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import java.security.cert.X509Certificate

class IssuerAlternativeName : ProfileValidation {
    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate
    ): Boolean {
        if (readerAuthCertificate.issuerAlternativeNames == null) {
            ProximityLogger.i(this.javaClass.name, "IssuerAlternativeNames is null")
            return true
        }
        val issuerAltNames = readerAuthCertificate.issuerAlternativeNames

        return issuerAltNames.any { altNameList ->
            if (altNameList.size == 2 && altNameList[0] is Int) {
                val tag = altNameList[0] as Int
                when (tag) {
                    TAG_RFC822_NAME,   // 1: rfc822Name (Email address)
                    TAG_DNS_NAME,      // 2: dNSName
                    TAG_URI,           // 6: uniformResourceIdentifier
                    TAG_IP_ADDRESS -> return@any true
                    else -> false
                }
            } else {
                false
            }
        }
    }

    companion object {
        private const val TAG_OTHER_NAME = 0 // otherName
        private const val TAG_RFC822_NAME = 1 // rfc822Name (Email)
        private const val TAG_DNS_NAME = 2    // dNSName
        private const val TAG_X400_ADDRESS = 3 // x400Address
        private const val TAG_DIRECTORY_NAME = 4 // directoryName
        private const val TAG_EDI_PARTY_NAME = 5 // ediPartyName
        private const val TAG_URI = 6 // uniformResourceIdentifier
        private const val TAG_IP_ADDRESS = 7 // iPAddress
        private const val TAG_REGISTERED_ID = 8 // registeredID
    }
}
