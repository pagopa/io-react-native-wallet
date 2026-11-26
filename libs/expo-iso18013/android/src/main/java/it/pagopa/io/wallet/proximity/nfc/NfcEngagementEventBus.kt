package it.pagopa.io.wallet.proximity.nfc

import com.android.identity.crypto.EcPrivateKey
import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow

/**Singleton event bus using SharedFlow for NFC notifications.  */
object NfcEngagementEventBus {
    // No replay; only current collectors receive events.
    private val _events = MutableSharedFlow<NfcEngagementEvent>(
        replay = 0,
        extraBufferCapacity = 1 // Optional: prevents lost fast events
    )
    val events = _events.asSharedFlow()

    private val _setupEvent = MutableStateFlow<ServiceEvents.SetupReady?>(null)
    internal val setupEvent = _setupEvent.asStateFlow()


    // QrCode: no replay, one-shot
    private val _qrEvent = MutableSharedFlow<ServiceEvents.QrCodeDeviceEngagement>(
        replay = 0,
        extraBufferCapacity = 1
    )
    internal val qrEvent = _qrEvent.asSharedFlow()
    private val _responseEvent = MutableSharedFlow<ByteArray>(
        replay = 0,
        extraBufferCapacity = 1
    )
    val responseEvent = _responseEvent.asSharedFlow()

    // Use outside coroutines (e.g., in listeners); non-suspending.
    internal fun tryEmit(event: NfcEngagementEvent) {
        _events.tryEmit(event)
    }

    internal fun resetSetup() {
        _setupEvent.tryEmit(null)
    }

    /**It emits the event for the [NfcEngagementService] to set up engagement
     * @return true-> if event is sent correctly*/
    fun setupNfcService(
        retrievalMethods: List<DeviceRetrievalMethod>,
        readerTrustStore: List<List<Any>>? = null,
        inactivityTimeoutSeconds: Int = 15
    ): Boolean {
        return _setupEvent.tryEmit(
            ServiceEvents.SetupReady(
                retrievalMethods,
                readerTrustStore,
                inactivityTimeoutSeconds
            )
        )
    }

    /**
     * It emits the event for the [NfcEngagementService] to send a document response
     * @return true-> if event is sent correctly*/
    fun sendDocumentResponse(response: ByteArray): Boolean {
        return _responseEvent.tryEmit(response)
    }

    /**
     * It emits the event for the [NfcEngagementService] to set up engagement
     * @return true-> if event is sent correctly*/
    internal fun setupDeviceEngagementFromQr(deviceEngagementSetup: Pair<ByteArray, EcPrivateKey>) {
        _qrEvent.tryEmit(ServiceEvents.QrCodeDeviceEngagement(deviceEngagementSetup))
    }
}