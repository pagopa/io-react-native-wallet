package it.pagopa.io.wallet.proximity.document.profile

import it.pagopa.io.wallet.proximity.ProximityLogger
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit

internal class Period : ProfileValidation {

    companion object {
        internal const val MAX_VALIDITY_PERIOD_DAYS = 1187
    }

    override fun validate(
        readerAuthCertificate: X509Certificate,
        trustCA: X509Certificate,
    ): Boolean {
        val expireDate = readerAuthCertificate.notAfter
        val fromDate = readerAuthCertificate.notBefore
        val diff = expireDate.time - fromDate.time

        return (
                TimeUnit.DAYS.convert(
                    diff,
                    TimeUnit.MILLISECONDS,
                ) <= MAX_VALIDITY_PERIOD_DAYS
                ).also {
                ProximityLogger.d(this.javaClass.name, "ValidityPeriod: $it")
            }
    }
}