package it.pagopa.io.wallet.proximity.document

import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import java.math.BigInteger
import java.security.cert.X509Certificate

/**
 * Reader authentication
 *
 * @property readerAuth the reader authentication structure as CBOR encoded [ByteArray]
 * @property readerSignIsValid indicates if the signature of reader authentication is valid
 * @property readerCertificateChain reader auth certificate chain as [List] of [X509Certificate]
 * @property readerCertificatedIsTrusted result of reader auth certificate path validation
 * @property readerCommonName the Common Name (CN) field of the reader authentication certificate
 * @property issuerRdnMap the complete map of the reader authentication certificate subject fields.
 * @constructor Create empty Reader auth
 */
@Parcelize
class ReaderAuth(
    val readerAuth: ByteArray,
    val readerSignIsValid: Boolean,
    val readerCertificateChain: List<X509Certificate>,
    val readerCertificatedIsTrusted: Boolean,
    val readerCommonName: String,
    val certSerialNumber: BigInteger?,
    val issuerRdnMap: Map<String, String>
) : Parcelable {
    /**
     * Whether the reader authentication is success (including that the signature of reader authentication is valid and reader auth
     * certificate path is valid)
     *
     * @return a [Boolean] value indicating if reader authentication is success or not
     */
    fun isSuccess(): Boolean {
        return readerSignIsValid &&
                readerCertificatedIsTrusted
    }
}