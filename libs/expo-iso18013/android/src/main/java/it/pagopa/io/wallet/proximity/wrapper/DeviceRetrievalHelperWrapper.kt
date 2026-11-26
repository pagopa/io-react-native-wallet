package it.pagopa.io.wallet.proximity.wrapper

import com.android.identity.android.mdoc.deviceretrieval.DeviceRetrievalHelper
import it.pagopa.io.wallet.proximity.retrieval.stopPresentation

class DeviceRetrievalHelperWrapper(
    private val deviceRetrievalHelper: DeviceRetrievalHelper
) {
    fun sendResponse(
        deviceResponseBytes: ByteArray?,
        status: Long
    ) {
        deviceRetrievalHelper.sendDeviceResponse(
            deviceResponseBytes,
            status
        )
    }

    fun disconnect() {
        deviceRetrievalHelper.stopPresentation(
            sendSessionTerminationMessage = true,
            useTransportSpecificSessionTermination = true
        )
    }

    fun sessionTranscript() = this.deviceRetrievalHelper.sessionTranscript

    internal fun getOriginal() = deviceRetrievalHelper
}