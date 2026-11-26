package it.pagopa.io.wallet.proximity.nfc

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ComponentName
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.annotation.CheckResult
import com.android.identity.android.util.NfcUtil
import com.android.identity.util.toHex
import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.bluetooth.BleRetrievalMethod
import it.pagopa.io.wallet.proximity.engagement.EngagementListener
import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod
import it.pagopa.io.wallet.proximity.wrapper.DeviceRetrievalHelperWrapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch

/**
 * Abstract Nfc engagement service.
 *
 * Implement this class to enable the NFC engagement.
 *
 * ```
 * class MyNfcEngagementService : NfcEngagementService()
 *```
 *
 * then add to application manifest file:
 *
 * ```
 * <service android:name=".MyNfcEngagementService"
 *         android:exported="true"
 *             android:label="@string/nfc_engagement_service_desc"
 *             android:permission="android.permission.BIND_NFC_SERVICE">
 *             <intent-filter>
 *                 <action android:name="android.nfc.action.NDEF_DISCOVERED" />
 *                 <action android:name="android.nfc.cardemulation.action.HOST_APDU_SERVICE"/>
 *             </intent-filter>
 *
 *             <meta-data
 *                 android:name="android.nfc.cardemulation.host_apdu_service"
 *                 android:resource="@xml/nfc_engagement_apdu_service" />
 *  </service>
 *  ```
 *
 * You can enable or disable the NFC device engagement in your app by calling the `enable()`
 * and `disable()` methods of the `NfcEngagementService` class.
 *
 * In the example below, the NFC device engagement is enabled when activity is resumed and disabled
 * when the activity is paused.
 *
 * ```
 * import androidx.appcompat.app.AppCompatActivity
 * import it.pagopa.io.wallet.proximity.nfc.NfcEngagementService
 *
 * class MainActivity : AppCompatActivity() {
 *
 *   override fun onResume() {
 *     super.onResume()
 *     NfcEngagementService.enable(this)
 *   }
 *
 *   override fun onPause() {
 *     super.onPause()
 *     NfcEngagementService.disable(this)
 *   }
 * }
 * ```
 * Optionally, in the `enable()` method you can define your class that implements `NfcEngagementService`, e.g.:
 *
 *```
 * NfcEngagementService.enable(this, NfcEngagementServiceImpl::class.java)
 *```
 *
 * This defines the nfc engagement service to be preferred while this activity is in the foreground.
 *
 * @constructor
 */
abstract class NfcEngagementService : HostApduService() {
    private val handler by lazy {
        Handler(Looper.getMainLooper())
    }
    private val runnable by lazy {
        Runnable {
            this.onDeactivated(0)
            NfcEngagementEventBus.tryEmit(
                NfcEngagementEvent.Error(
                    Throwable("NFC session timed out due to inactivity")
                )
            )
        }
    }

    companion object {
        @SuppressLint("StaticFieldLeak")
        private var nfcEngagement: NfcEngagement? = null
        @SuppressLint("StaticFieldLeak")
        private var activeService: NfcEngagementService? = null
        private var inactivityTimeout = 15
        private var serviceClass: Class<out NfcEngagementService>? = null

        val RESPONSE_GENERATION_ERROR = NfcUtil.STATUS_WORD_FILE_NOT_FOUND

        /**
         * Enable NFC engagement
         *
         * @param activity
         */
        @JvmStatic
        @CheckResult
        fun enable(
            activity: Activity,
            preferredNfcEngSerCls: Class<out NfcEngagementService>? = null,
        ): HceServiceStatus {
            serviceClass = preferredNfcEngSerCls
            // Enable the service component programmatically
            preferredNfcEngSerCls?.let {
                activity.packageManager.setComponentEnabledSetting(
                    ComponentName(activity, it),
                    android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    android.content.pm.PackageManager.DONT_KILL_APP
                )
            }
            // set preferred Nfc Engagement Service
            return preferredNfcEngSerCls?.let {
                setAsPreferredNfcEngagementService(activity, it)
            } ?: HceServiceStatus.PreferredClassNotSet
        }

        /**
         * Disable NFC engagement
         *
         * @param activity
         */
        @JvmStatic
        fun disable(activity: Activity) {
            ProximityLogger.i("NfcEngagementService", "disable")
            activeService?.cancelInactivityTimeout()
            nfcEngagement?.nfcEngagementHelper?.close()
            nfcEngagement = null
            NfcEngagementEventBus.resetSetup()
            unsetAsPreferredNfcEngagementService(activity)
            // Disable the service component programmatically
            serviceClass?.let {
                activity.packageManager.setComponentEnabledSetting(
                    ComponentName(activity, it),
                    android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    android.content.pm.PackageManager.DONT_KILL_APP
                )
            }
            serviceClass = null
        }

        private fun Int.cardEmulationClearLog() = when (this) {
            CardEmulation.SELECTION_MODE_PREFER_DEFAULT -> "Default"
            CardEmulation.SELECTION_MODE_ASK_IF_CONFLICT -> "Ask if conflict"
            CardEmulation.SELECTION_MODE_ALWAYS_ASK -> "Always ask"
            else -> "Unknown"
        }

        @JvmStatic
        private fun setAsPreferredNfcEngagementService(
            activity: Activity,
            nfcEngagementServiceClass: Class<out NfcEngagementService>,
        ): HceServiceStatus {
            // Check device compatibility first
            if (HceCompatibilityChecker.isKnownProblematicDevice()) {
                ProximityLogger.i(
                    "NfcEngagementService",
                    "Device may have HCE compatibility issues. Proceeding with caution."
                )
            }

            // Perform comprehensive HCE status check
            val hceStatus = HceCompatibilityChecker.checkHceServiceStatus(
                activity.applicationContext,
                nfcEngagementServiceClass as Class<out HostApduService>
            )

            ProximityLogger.i(
                "NfcEngagementService",
                "HCE Status: ${HceCompatibilityChecker.getStatusMessage(hceStatus)}"
            )

            // If service cannot work, return early
            if (!hceStatus.canWork()) {
                ProximityLogger.e(
                    "NfcEngagementService",
                    "HCE service cannot work on this device: ${
                        HceCompatibilityChecker.getStatusMessage(
                            hceStatus
                        )
                    }"
                )
                return hceStatus
            }

            val cardEmulation = CardEmulation.getInstance(NfcAdapter.getDefaultAdapter(activity))
            val allowsForeground =
                cardEmulation.categoryAllowsForegroundPreference(CardEmulation.CATEGORY_OTHER)
            if (allowsForeground) {
                val hceComponentName = ComponentName(
                    activity,
                    nfcEngagementServiceClass,
                )
                cardEmulation.setPreferredService(activity, hceComponentName)
                val selectionMode =
                    cardEmulation.getSelectionModeForCategory(CardEmulation.CATEGORY_OTHER)

                // Use more reliable AID-based check instead of category check
                // as isDefaultServiceForCategory may return false on some devices even when working
                val isNdefAidRegistered = try {
                    cardEmulation.isDefaultServiceForAid(
                        hceComponentName,
                        "D2760000850101"
                    )
                } catch (e: Exception) {
                    ProximityLogger.e(
                        "NfcEngagementService",
                        "Error checking NDEF AID: ${e.message}"
                    )
                    false
                }

                val isMdlAidRegistered = try {
                    cardEmulation.isDefaultServiceForAid(
                        hceComponentName,
                        "A0000002480400"
                    )
                } catch (e: Exception) {
                    ProximityLogger.e(
                        "NfcEngagementService",
                        "Error checking MDL AID: ${e.message}"
                    )
                    false
                }

                val isServiceRegistered = isNdefAidRegistered || isMdlAidRegistered

                ProximityLogger.i(
                    "NfcEngagementService",
                    """HCE Service Configuration:
                        |Selection mode: ${selectionMode.cardEmulationClearLog()}
                        |NDEF AID (D2760000850101): $isNdefAidRegistered
                        |MDL AID (A0000002480400): $isMdlAidRegistered
                        |Service registered: $isServiceRegistered
                    """.trimMargin()
                )
                return hceStatus
            }
            return hceStatus
        }

        @JvmStatic
        private fun unsetAsPreferredNfcEngagementService(activity: Activity) {
            val cardEmulation = CardEmulation.getInstance(NfcAdapter.getDefaultAdapter(activity))
            val allowsForeground =
                cardEmulation.categoryAllowsForegroundPreference(CardEmulation.CATEGORY_OTHER)
            if (allowsForeground) {
                cardEmulation.unsetPreferredService(activity)
            }
        }
    }

    private fun createListeners() {
        nfcEngagement?.withListener(object : EngagementListener {
            override fun onDeviceConnecting() {
                NfcEngagementEventBus.tryEmit(NfcEngagementEvent.Connecting)
            }

            override fun onDeviceConnected(deviceRetrievalHelper: DeviceRetrievalHelperWrapper) {
                ProximityLogger.i(this.javaClass.name, "CONNECTED")
                NfcEngagementEventBus.tryEmit(NfcEngagementEvent.Connected(deviceRetrievalHelper))
            }

            override fun onError(error: Throwable) {
                NfcEngagementEventBus.tryEmit(NfcEngagementEvent.Error(error))
                nfcEngagement?.close()
            }

            override fun onDocumentRequestReceived(
                request: String?,
                sessionsTranscript: ByteArray
            ) {
                NfcEngagementEventBus.tryEmit(
                    NfcEngagementEvent.DocumentRequestReceived(
                        request,
                        sessionsTranscript,
                        onlyNfc = false
                    )
                )
            }

            override fun onDeviceDisconnected(transportSpecificTermination: Boolean) {
                nfcEngagement?.close()
                NfcEngagementEventBus.tryEmit(
                    NfcEngagementEvent.Disconnected(
                        transportSpecificTermination
                    )
                )
            }
        })
    }

    private fun buildNfcEngagement(retrievalMethods: List<DeviceRetrievalMethod>) {
        if (nfcEngagement == null) {
            ProximityLogger.i("NfcEngagementService", "Building")
            nfcEngagement = NfcEngagement
                .build(
                    this@NfcEngagementService.baseContext,
                    retrievalMethods
                ).configure()
            createListeners()
        }
    }

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    private fun cancelInactivityTimeout() {
        handler.removeCallbacks(runnable)
        ProximityLogger.i("NfcEngagementService", "Inactivity timeout canceled")
    }

    @Suppress("UNCHECKED_CAST")
    override fun onCreate() {
        super.onCreate()
        activeService = this
        ProximityLogger.i("NfcEngagementService", "On Create")
        serviceScope.launch {
            NfcEngagementEventBus.setupEvent.filterNotNull().collectLatest { event ->
                ProximityLogger.i("NfcEngagementService", "SetupReady: $event")
                buildNfcEngagement(event.retrievalMethods)
                inactivityTimeout = event.inactivityTimeout
                val readerTrustStore = event.readerTrustStore
                readerTrustStore?.firstOrNull()?.let { list ->
                    list.firstOrNull()?.let {
                        when (it) {
                            is Int -> nfcEngagement?.withReaderTrustStore(readerTrustStore as List<List<Int>>)
                            is ByteArray -> nfcEngagement?.withReaderTrustStore(
                                readerTrustStore as List<List<ByteArray>>
                            )

                            is String -> nfcEngagement?.withReaderTrustStore(
                                readerTrustStore as List<List<String>>
                            )

                            else -> throw Exception("readerTrustStore type not supported")
                        }
                    } ?: run {
                        throw Exception("readerTrustStore type not supported")
                    }
                }
            }
        }
        serviceScope.launch {
            NfcEngagementEventBus.qrEvent.collectLatest { event ->
                nfcEngagement
                    ?.nfcEngagementHelper
                    ?.deviceEngagementFromQr(
                        event.deviceEngagementSetup.first
                    )?.setKeyFromQr(
                        event.deviceEngagementSetup.second
                    )
            }
        }
        serviceScope.launch {
            NfcEngagementEventBus.responseEvent.collectLatest {
                ProximityLogger.i("NfcEngagementService", "responseEvent")
                val (back, theEnd) = nfcEngagement?.nfcEngagementHelper?.processDocResponse(
                    it
                ) ?: (null to true)
                sendResponseApdu(
                    back
                )
                if (theEnd)
                    this@NfcEngagementService.onDeactivated(0)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        ProximityLogger.i("NfcEngagementService", "On Destroy")
        cancelInactivityTimeout()
        if (activeService === this) {
            activeService = null
        }
        serviceJob.cancel()
    }

    override fun onDeactivated(reason: Int) {
        cancelInactivityTimeout()
        if (nfcEngagement != null) {
            nfcEngagement?.nfcEngagementHelper?.nfcOnDeactivated(reason)
            val ble =
                nfcEngagement?.nfcEngagementHelper?.retrievalMethods?.any { it is BleRetrievalMethod } == true
            if (!ble)
                nfcEngagement?.close()
        }
    }

    /**
     * Processes incoming NFC APDU commands.
     */
    override fun processCommandApdu(
        commandApdu: ByteArray, extras: Bundle?
    ): ByteArray? {
        serviceScope.launch {
            ProximityLogger.i("NfcEngagementService", "processCommandApdu: ${commandApdu.toHex()}")
            if (nfcEngagement?.nfcEngagementHelper == null) {
                NfcEngagementEventBus.tryEmit(
                    NfcEngagementEvent.Error(
                        Throwable("NFC Engagement setup not DONE")
                    )
                )
                return@launch
            }
            val (back, theEnd) = nfcEngagement?.nfcEngagementHelper?.nfcProcessCommandApdu(
                commandApdu
            ) ?: (null to true)
            ProximityLogger.i("Giving back (theEnd=$theEnd)", back?.toHex().orEmpty())
            back?.let {
                ProximityLogger.i(
                    "Giving back LAST (theEnd=$theEnd)",
                    byteArrayOf(back[back.size - 2], back[back.size - 1]).toHex()
                )
            }
            val ble =
                nfcEngagement?.nfcEngagementHelper?.retrievalMethods?.any { it is BleRetrievalMethod } == true
            cancelInactivityTimeout()

            if (theEnd) {
                this@NfcEngagementService.onDeactivated(0)
            } else {
                if (!ble) {
                    val timeoutSeconds = inactivityTimeout.toLong()
                    handler.postDelayed(runnable, timeoutSeconds * 1000L)
                    ProximityLogger.i("NfcEngagementService", "Inactivity timeout registered")
                }
            }
            sendResponseApdu(back)
        }
        return null
    }
}