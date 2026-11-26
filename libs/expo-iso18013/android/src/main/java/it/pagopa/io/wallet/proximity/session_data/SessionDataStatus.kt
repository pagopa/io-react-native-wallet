package it.pagopa.io.wallet.proximity.session_data
/**
**Table 20 — SessionData status codes**
__________________________________________________________________________
| Status code | Description               | Action required                 |
--------------------------------------------------------------------------
|     10      | Error: session encryption | The session shall be terminated.|
|     11      | Error: CBOR decoding      | The session shall be terminated.|
|     20      | Session termination       | The session shall be terminated.|
--------------------------------------------------------------------------
 */
enum class SessionDataStatus(val value: Long) {
    ERROR_SESSION_ENCRYPTION(10L),
    ERROR_CBOR_DECODING(11L),
    SESSION_TERMINATION(20L)
}