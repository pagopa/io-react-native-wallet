package it.pagopa.io.wallet.cbor.model

enum class DocType(
    val value: String,
    val nameSpacesValue: String
) {
    MDL("org.iso.18013.5.1.mDL", "org.iso.18013.5.1"),
    EU_PID("eu.europa.ec.eudi.pid.1", "eu.europa.ec.eudi.pid.1"),
    ANY_OTHER("", "");

    val isAccepted get() = this != ANY_OTHER

    companion object {
        @JvmSynthetic
        operator fun invoke(string: String?): DocType {
            return when (string) {
                MDL.value -> MDL
                EU_PID.value -> EU_PID
                else -> ANY_OTHER
            }
        }
    }
}