package it.pagopa.io.wallet.proximity.qr_code

import android.content.Context
import com.android.identity.android.mdoc.deviceretrieval.DeviceRetrievalHelper
import com.android.identity.android.mdoc.engagement.QrEngagementHelper
import com.android.identity.android.mdoc.transport.DataTransport
import com.android.identity.crypto.EcPrivateKey
import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.engagement.Engagement
import it.pagopa.io.wallet.proximity.nfc.NfcEngagementEventBus
import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod
import it.pagopa.io.wallet.proximity.retrieval.connectionMethods
import it.pagopa.io.wallet.proximity.retrieval.transportOptions
import it.pagopa.io.wallet.proximity.wrapper.DeviceRetrievalHelperWrapper

/**
 * To build use [QrEngagement.build] static method and ***then call [configure] method***
 * */
class QrEngagement private constructor(
    context: Context
) : Engagement(context) {
    private lateinit var qrEngagementBuilder: QrEngagementHelper.Builder
    private lateinit var qrEngagement: QrEngagementHelper

    private fun createDeviceRetrievalHelper(transport: DataTransport): DeviceRetrievalHelperWrapper {
        ProximityLogger.d(
            this@QrEngagement.tag,
            "OnDeviceConnected via QR: qrEngagement=$qrEngagement"
        )
        val deviceRetrievalHelperBuilt = DeviceRetrievalHelper.Builder(
            context,
            deviceRetrievalHelperListener,
            context.mainExecutor(),
            eDevicePrivateKey,
        ).useForwardEngagement(
            transport,
            qrEngagement.deviceEngagement,
            qrEngagement.handover
        ).build()
        return DeviceRetrievalHelperWrapper(deviceRetrievalHelperBuilt)
    }

    override val qrEngagementListener = object : QrEngagementHelper.Listener {
        override fun onDeviceConnecting() {
            ProximityLogger.d(this@QrEngagement.tag, "QR Engagement: Device Connecting")
            listener?.onDeviceConnecting()
        }

        override fun onDeviceConnected(transport: DataTransport) {
            if (!checkQrEngagementInit())
                return
            if (deviceRetrievalHelper != null) {
                ProximityLogger.d(
                    this@QrEngagement.tag,
                    "OnDeviceConnected for QR engagement -> ignoring due to active presentation"
                )
                return
            }
            deviceRetrievalHelper = createDeviceRetrievalHelper(transport)
            qrEngagement.close()
            listener?.onDeviceConnected(
                requireNotNull(
                    deviceRetrievalHelper
                )
            )
        }

        override fun onError(error: Throwable) {
            ProximityLogger.e(this@QrEngagement.tag, "QR onError: ${error.message}")
            listener?.onError(error)
        }
    }

    /**
     * Gives back QR code string for engagement
     */
    override fun getQrCodeString(): String {
        if (!checkQrEngagementInit())
            return ""
        return qrEngagement.deviceEngagementUriEncoded
    }

    private fun checkQrEngagementInit(): Boolean {
        val back = ::qrEngagement.isInitialized
        if (!back)
            ProximityLogger.e(
                this.javaClass.name,
                "OnDeviceConnected for QR engagement -> Have you called .configure method?"
            )
        return back
    }

    override fun close() {
        if (!checkQrEngagementInit())
            return
        try {
            if (deviceRetrievalHelper != null)
                deviceRetrievalHelper!!.disconnect()
            qrEngagement.close()
        } catch (exception: RuntimeException) {
            ProximityLogger.e(this.javaClass.name, "Error closing QR engagement $exception")
        }
    }

    /**
     * builds [QrEngagementHelper] by com.android.identity package
     * @return [QrEngagement] instance created via [QrEngagement.build] static method
     * */
    override fun configure() = apply {
        qrEngagement = qrEngagementBuilder.build()
    }

    fun setupDeviceEngagementForNfc() {
        NfcEngagementEventBus.setupDeviceEngagementFromQr(this.qrEngagement.deviceEngagement to this.eDevicePrivateKey)
    }

    companion object {
        /**
         * Create an instance and configures the QR engagement.
         * First of all you must call [configure] to build QrEngagementHelper.
         * To accept just some certificates use [withReaderTrustStore] method.
         * To create a QrCode use [getQrCodeString] method.
         * To observe all events call [withListener] method.
         * To close the connection call [close] method.
         */
        fun build(context: Context, retrievalMethods: List<DeviceRetrievalMethod>): QrEngagement {
            return QrEngagement(context).apply {
                this.retrievalMethods = retrievalMethods
                qrEngagementBuilder = QrEngagementHelper.Builder(
                    context,
                    eDevicePrivateKey.publicKey,
                    retrievalMethods.transportOptions,
                    qrEngagementListener,
                    context.mainExecutor()
                ).setConnectionMethods(retrievalMethods.connectionMethods)
            }
        }
    }
}