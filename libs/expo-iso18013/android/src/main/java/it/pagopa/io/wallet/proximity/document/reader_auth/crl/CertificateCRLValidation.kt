package it.pagopa.io.wallet.proximity.document.reader_auth.crl

import it.pagopa.io.wallet.proximity.ProximityLogger
import org.bouncycastle.asn1.DERIA5String
import org.bouncycastle.asn1.DEROctetString
import org.bouncycastle.asn1.x509.CRLDistPoint
import org.bouncycastle.asn1.x509.DistributionPointName
import org.bouncycastle.asn1.x509.Extension
import org.bouncycastle.asn1.x509.GeneralName
import org.bouncycastle.asn1.x509.GeneralNames
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.cert.CertificateFactory
import java.security.cert.X509CRL
import java.security.cert.X509Certificate
import java.util.Date
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutionException
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

private const val TAG = "CertificateCRLValidation"

internal object CertificateCRLValidation {
    @JvmStatic
    @Throws(CertificateCRLValidationException::class)
    fun verify(cert: X509Certificate) {
        ProximityLogger.d(TAG, "CRL verified started for cert: $cert")
        val crlDistPoints = getCrlDistributionPoints(cert)
        for (crlDP in crlDistPoints) {
            val crlFutureResult = downloadCRL(crlDP) ?: return
            var crl: X509CRL? = null
            try {
                crl = crlFutureResult[5000, TimeUnit.MILLISECONDS]
            } catch (e: Exception) {
                when (e) {
                    is InterruptedException -> ProximityLogger.e(
                        TAG,
                        "CRL Interrupted Exception: $e"
                    )

                    is ExecutionException -> ProximityLogger.e(TAG, "CRL Execution Exception: $e")
                    is TimeoutException -> ProximityLogger.e(TAG, "CRL Timeout Exception: $e")
                }
            }
            crl ?: run {
                ProximityLogger.d(TAG, "CRL not found")
                throw CertificateCRLValidationException("Crl not found")
            }
            Date().also { today ->
                if (crl.thisUpdate > today || crl.nextUpdate < today) {
                    ProximityLogger.d(TAG, "crl has expired.")
                }
            }
            if (!crl.isRevoked(cert)) {
                ProximityLogger.d(TAG, "The Certificate is not revoked")
            } else {
                throw CertificateCRLValidationException("The certificate is revoked by CRL: $crlDP")
            }
        }
    }

    private fun downloadCRL(crlURL: String): Future<X509CRL>? {
        return if (crlURL.startsWith("http://") || crlURL.startsWith("https://")) {
            CompletableFuture.supplyAsync {
                try {
                    val finalCrlURL = getFinalURL(crlURL)
                    ProximityLogger.d(TAG, "Final url: $finalCrlURL")
                    return@supplyAsync downloadCRLFromURL(finalCrlURL)
                } catch (e: IOException) {
                    ProximityLogger.e(TAG, "Exception on downloadCRL: $e")
                    return@supplyAsync null
                }
            }
        } else {
            ProximityLogger.d(TAG, "CRL url does not start with http or https")
            null
        }
    }

    private fun downloadCRLFromURL(crlURL: String): X509CRL? {
        var crlStream: InputStream? = null
        return try {
            val url = URL(crlURL)
            val con = url.openConnection()
            crlStream = con.getInputStream()
            val cf = CertificateFactory.getInstance("X.509")
            cf.generateCRL(crlStream) as X509CRL
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "An exception occurred while downloading the CRL... $e")
            null
        } finally {
            if (crlStream != null) {
                try {
                    crlStream.close()
                } catch (ignored: IOException) {
                    ProximityLogger.e(TAG, "ignored: $ignored")
                }
            }
        }
    }

    @Throws(IOException::class)
    private fun getFinalURL(url: String): String {
        val con = URL(url).openConnection() as HttpURLConnection
        con.instanceFollowRedirects = false
        con.connect()
        con.inputStream
        if (con.responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
            con.responseCode == HttpURLConnection.HTTP_MOVED_TEMP
        ) {
            val redirectUrl = con.getHeaderField("Location")
            return getFinalURL(redirectUrl)
        }
        return url
    }

    private fun getCrlDistributionPoints(cert: X509Certificate): List<String> {
        val crlExtValue = cert.getExtensionValue(Extension.cRLDistributionPoints.id)
            ?: return ArrayList()
        val distPoint = CRLDistPoint.getInstance(DEROctetString.getInstance(crlExtValue).octets)
        val crlUrls: MutableList<String> = ArrayList()
        for (dp in distPoint.distributionPoints) {
            val dpn = dp.distributionPoint
            if (dpn != null && dpn.type == DistributionPointName.FULL_NAME) {
                val genNames = GeneralNames.getInstance(dpn.name).names
                for (genName in genNames) {
                    if (genName.tagNo == GeneralName.uniformResourceIdentifier) {
                        val url: String = DERIA5String.getInstance(genName.name).string
                        crlUrls.add(url)
                    }
                }
            }
        }
        return crlUrls
    }
}