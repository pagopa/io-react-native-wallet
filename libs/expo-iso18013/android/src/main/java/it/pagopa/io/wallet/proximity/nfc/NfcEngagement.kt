package it.pagopa.io.wallet.proximity.nfc

import android.content.Context
import com.android.identity.android.mdoc.deviceretrieval.DeviceRetrievalHelper
import com.android.identity.android.mdoc.engagement.NfcEngagementHelper
import com.android.identity.android.mdoc.transport.DataTransport
import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.document.reader_auth.ReaderTrustStore
import it.pagopa.io.wallet.proximity.engagement.Engagement
import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod
import it.pagopa.io.wallet.proximity.retrieval.connectionMethods
import it.pagopa.io.wallet.proximity.wrapper.DeviceRetrievalHelperWrapper

internal class NfcEngagement(
    context: Context
) : Engagement(context) {
    private lateinit var nfcEngagementBuilder: NfcEngagementHelperRefactor.Builder
    lateinit var nfcEngagementHelper: NfcEngagementHelperRefactor
    override val nfcEngagementListener = object : NfcEngagementHelperRefactor.Listener {
        override fun onTwoWayEngagementDetected() {
            ProximityLogger.i(this@NfcEngagement.tag, "Two way engagement detected")
        }

        override fun onDeviceConnecting() {
            ProximityLogger.i(this@NfcEngagement.tag, "Device connecting")
            this@NfcEngagement.listener?.onDeviceConnecting()
        }

        override fun onDeviceConnected(transport: DataTransport) {
            ProximityLogger.i(this@NfcEngagement.tag, "Device connected")
            if (deviceRetrievalHelper != null) {
                ProximityLogger.d(
                    this@NfcEngagement.tag,
                    "OnDeviceConnected for NFC engagement -> ignoring due to active presentation"
                )
                return
            }
            ProximityLogger.d(
                this@NfcEngagement.tag,
                "OnDeviceConnected via NFC: qrEngagement=$nfcEngagementHelper"
            )
            val deviceRetrievalHelperBuilt = DeviceRetrievalHelper.Builder(
                this@NfcEngagement.context,
                deviceRetrievalHelperListener,
                this@NfcEngagement.context.mainExecutor(),
                eDevicePrivateKey,
            ).useForwardEngagement(
                transport,
                nfcEngagementHelper.deviceEngagement,
                nfcEngagementHelper.handover,
            ).build()
            deviceRetrievalHelper = DeviceRetrievalHelperWrapper(deviceRetrievalHelperBuilt)
            listener?.onDeviceConnected(
                requireNotNull(
                    deviceRetrievalHelper
                )
            )
        }

        override fun onError(error: Throwable) {
            ProximityLogger.e(this@NfcEngagement.tag, "Error: ${error.message}")
            nfcEngagementHelper.close()
            listener?.onError(error)
        }

        override fun onHandoverSelectMessageSent() {
            ProximityLogger.i(this@NfcEngagement.tag, "Handover select message sent")
        }
    }

    override fun postReaderTrustStoresSetup(readerTrustStores: List<ReaderTrustStore>) {
        nfcEngagementHelper.readerTrustStores = readerTrustStores
    }

    override fun close() {
        ProximityLogger.i(NfcEngagement::class.java.name, "CLOSING NFC CONNECTION")
        try {
            if (deviceRetrievalHelper != null)
                deviceRetrievalHelper!!.disconnect()
            nfcEngagementHelper.close()
            deviceRetrievalHelper = null
        } catch (exception: RuntimeException) {
            ProximityLogger.e(this.javaClass.name, "Error closing NFC engagement $exception")
        }
    }

    /**
     * builds [NfcEngagementHelper] by com.android.identity package
     * @return [NfcEngagement] instance created via [NfcEngagement.build] static method
     * */
    override fun configure() = apply {
        nfcEngagementHelper = nfcEngagementBuilder.build()
    }


    companion object {
        /**
         * Create an instance and configures the NFC engagement.
         * First of all you must call [configure] to build NfcEngagementBuilder.
         * To accept just some certificates use [withReaderTrustStore] method.
         * To observe all events call [withListener] method.
         * To close the connection call [close] method.
         */
        fun build(
            context: Context,
            retrievalMethods: List<DeviceRetrievalMethod>
        ) = NfcEngagement(context).apply {
            this@apply.retrievalMethods = retrievalMethods
            this@apply.nfcEngagementBuilder = NfcEngagementHelperRefactor.Builder(
                context,
                this@apply.eDevicePrivateKey,
                this@apply.retrievalMethods,
                this@apply.nfcEngagementListener,
                context.mainExecutor()
            ).staticHandoverWith(this@apply.retrievalMethods.connectionMethods)
        }
    }
}