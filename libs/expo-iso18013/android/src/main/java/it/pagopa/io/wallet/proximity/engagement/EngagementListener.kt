package it.pagopa.io.wallet.proximity.engagement

import it.pagopa.io.wallet.proximity.wrapper.DeviceRetrievalHelperWrapper

/**
 * Interface to listen all the events that can occur during the communication with the other device (mdocReader)
 * */
interface EngagementListener {
    /**Device is connecting with mdocReader*/
    fun onDeviceConnecting()

    /**Device is connected
     * @param deviceRetrievalHelper a wrapper around DeviceRetrievalHelper from mdoc library to send a response and disconnect from mdocReader*/
    fun onDeviceConnected(deviceRetrievalHelper: DeviceRetrievalHelperWrapper)

    /**Some error happened
     * @param error Exception reached*/
    fun onError(error: Throwable)

    /**A request was received, we can handle it using deviceRetrievalHelper obj from [onDeviceConnected]
     * @param request a JSONObject representing a doc request from mdocReader
     * @param sessionsTranscript a ByteArray representing the transcript of the session between mdocReader and the device*/
    fun onDocumentRequestReceived(request: String?, sessionsTranscript: ByteArray)

    /**The other device is disconnected
     * @param transportSpecificTermination true if is all ok and the other device has received all the data, false otherwise*/
    fun onDeviceDisconnected(transportSpecificTermination: Boolean)
}