package it.pagopa.io.wallet.proximity.nfc

import com.android.identity.crypto.EcPrivateKey
import it.pagopa.io.wallet.proximity.nfc.utils.OnlyNfcEvents
import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod
import it.pagopa.io.wallet.proximity.wrapper.DeviceRetrievalHelperWrapper

/** Represents the possible NFC event notifications.*/
sealed class NfcEngagementEvent {
    data object Connecting : NfcEngagementEvent()
    data object NotSupported : NfcEngagementEvent()
    data class Connected(val device: DeviceRetrievalHelperWrapper) : NfcEngagementEvent()
    data class Error(val error: Throwable) : NfcEngagementEvent()
    data class Disconnected(val transportSpecificTermination: Boolean) : NfcEngagementEvent()
    data class DocumentRequestReceived(
        val request: String?,
        val sessionTranscript: ByteArray,
        val onlyNfc: Boolean = false
    ) : NfcEngagementEvent()

    data class NfcOnlyEventListener(val event: OnlyNfcEvents) : NfcEngagementEvent()

    data object DocumentSent : NfcEngagementEvent()
}


internal sealed class ServiceEvents {
    data class SetupReady(
        val retrievalMethods: List<DeviceRetrievalMethod>,
        val readerTrustStore: List<List<Any>>?,
        val inactivityTimeout: Int = 15
    ) : ServiceEvents()

    data class QrCodeDeviceEngagement(
        val deviceEngagementSetup: Pair<ByteArray, EcPrivateKey>
    ) : ServiceEvents()
}
