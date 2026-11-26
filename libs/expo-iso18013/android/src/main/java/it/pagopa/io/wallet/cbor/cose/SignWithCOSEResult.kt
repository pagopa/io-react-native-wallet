package it.pagopa.io.wallet.cbor.cose

/**
 * The result of [CreateCOSE.sign] method
 */
sealed interface SignWithCOSEResult {
    /**
     * Success result containing the signature
     *
     * @property signature
     */
    data class Success(val signature: ByteArray, val publicKey: ByteArray) : SignWithCOSEResult

    /**
     * Failure while signing the data. Contains the throwable that caused the failure
     *
     * @property reason [FailureReason]
     */
    data class Failure(val reason: FailureReason) : SignWithCOSEResult
}

enum class FailureReason(var msg: String) {
    NO_KEY("Key doesn't exists!!"),
    PRIVATE_KEY_AND_PUBLIC_KEY_FAILURE("key not found"),
    FAIL_TO_SIGN("Fail to sign"),
    EXCEPTION("Exception")
}
