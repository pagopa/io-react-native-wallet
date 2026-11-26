package it.pagopa.io.wallet.proximity

import com.android.identity.cbor.Cbor
import com.android.identity.cbor.CborArray
import com.android.identity.cbor.Simple
import com.android.identity.crypto.Algorithm
import com.android.identity.crypto.Crypto

/** class to generate a DeviceResponse for OpenID4VP 1.0 flows not using the Digital Credentials API.
 * @param clientId Authorization Request 'client_id', including its prefix
 * @param responseUri: Authorization Request 'response_uri'
 * @param authorizationRequestNonce: Authorization Request 'nonce'
 * @param jwkThumbprint: JWK SHA-256 Thumbprint (RFC 7638) of the Verifier's key used to encrypt
 * the response, null when the response is not encrypted
 **/
class OpenID4VP(
    private val clientId: String,
    private val responseUri: String,
    private val authorizationRequestNonce: String,
    private val jwkThumbprint: ByteArray?
) {
    /**Generate session transcript with the OpenID4VPHandover of OpenID4VP 1.0 (Appendix B.2.6.1):
     * ```
     * SessionTranscript = [null, null, OpenID4VPHandover]
     * OpenID4VPHandover = ["OpenID4VPHandover", sha-256(cbor(OpenID4VPHandoverInfo))]
     * OpenID4VPHandoverInfo = [clientId, nonce, jwkThumbprint / null, responseUri]
     * ```
     *@return A CBOR-encoded SessionTranscript object*/
    fun createSessionTranscript(): ByteArray {
        val handoverInfo = Cbor.encode(
            CborArray.builder()
                .add(clientId)
                .add(authorizationRequestNonce)
                .apply { if (jwkThumbprint != null) add(jwkThumbprint) else add(Simple.NULL) }
                .add(responseUri)
                .end()
                .build()
        )
        val handoverInfoHash = Crypto.digest(Algorithm.SHA256, handoverInfo)

        val oid4vpHandover = CborArray.builder()
            .add("OpenID4VPHandover")
            .add(handoverInfoHash)
            .end()
            .build()

        return Cbor.encode(
            CborArray.builder()
                .add(Simple.NULL)
                .add(Simple.NULL)
                .add(oid4vpHandover)
                .end()
                .build()
        )
    }
}
