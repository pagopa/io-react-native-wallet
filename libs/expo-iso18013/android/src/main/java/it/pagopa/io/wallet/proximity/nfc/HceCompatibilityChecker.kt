package it.pagopa.io.wallet.proximity.nfc

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.os.Build
import it.pagopa.io.wallet.proximity.ProximityLogger

/**
 * Utility class to check HCE compatibility and service registration status.
 *
 * Some devices (particularly Xiaomi/MIUI, Huawei/EMUI) may have custom NFC implementations
 * that don't fully support standard Android HCE APIs or may block third-party HCE services.
 */
object HceCompatibilityChecker {

    private const val TAG = "HceCompatibilityChecker"

    /**
     * Comprehensive check if HCE service will work on this device.
     *
     * @param context Application context
     * @param serviceClass The HCE service class to check
     * @return HceServiceStatus indicating the service status
     */
    fun checkHceServiceStatus(
        context: Context,
        serviceClass: Class<out android.nfc.cardemulation.HostApduService>
    ): HceServiceStatus {
        // Check 1: NFC hardware support
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC)) {
            return HceServiceStatus.NfcNotSupported
        }

        // Check 2: HCE feature support
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)) {
            return HceServiceStatus.HceNotSupported
        }

        // Check 3: NFC adapter availability
        val nfcAdapter = try {
            NfcAdapter.getDefaultAdapter(context)
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error getting NFC adapter: ${e.message}")
            null
        }

        if (nfcAdapter == null) {
            return HceServiceStatus.NfcAdapterNotAvailable
        }

        // Check 4: NFC enabled
        if (!nfcAdapter.isEnabled) {
            return HceServiceStatus.NfcDisabled
        }

        // Check 5: Service declared in manifest via PackageManager
        val componentName = ComponentName(context, serviceClass)
        val isServiceDeclared = try {
            val intent = Intent("android.nfc.cardemulation.action.HOST_APDU_SERVICE")
            intent.component = componentName
            val resolveInfos =
                context.packageManager.queryIntentServices(intent, PackageManager.GET_META_DATA)
            resolveInfos.isNotEmpty()
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error checking service declaration: ${e.message}")
            false
        }

        // Check 6: CardEmulation instance
        val cardEmulation = try {
            CardEmulation.getInstance(nfcAdapter)
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error getting CardEmulation instance: ${e.message}")
            return HceServiceStatus.CardEmulationNotAvailable
        }

        // Check 7: Category allows foreground preference
        val allowsForeground = try {
            cardEmulation.categoryAllowsForegroundPreference(CardEmulation.CATEGORY_OTHER)
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error checking foreground preference: ${e.message}")
            false
        }

        if (!allowsForeground) {
            return HceServiceStatus.ForegroundPreferenceNotAllowed
        }

        // Check 8: Check if service is registered for specific AIDs
        val isRegisteredForAids = try {
            val ndefAidRegistered = cardEmulation.isDefaultServiceForAid(
                componentName,
                "D2760000850101" // NDEF AID
            )
            val mdlAidRegistered = cardEmulation.isDefaultServiceForAid(
                componentName,
                "A0000002480400" // MDL AID
            )
            ndefAidRegistered || mdlAidRegistered
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error checking AID registration: ${e.message}")
            false
        }

        // Check 9: Selection mode
        val selectionMode = try {
            cardEmulation.getSelectionModeForCategory(CardEmulation.CATEGORY_OTHER)
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error getting selection mode: ${e.message}")
            CardEmulation.SELECTION_MODE_ALWAYS_ASK
        }

        // Check 10: Check if default service for category (may return false even when working)
        val isDefaultService = try {
            cardEmulation.isDefaultServiceForCategory(
                componentName,
                CardEmulation.CATEGORY_OTHER
            )
        } catch (e: Exception) {
            ProximityLogger.e(TAG, "Error checking default service: ${e.message}")
            false
        }

        ProximityLogger.i(
            TAG, """
            HCE Service Status:
            - Service declared: $isServiceDeclared
            - Registered for AIDs: $isRegisteredForAids
            - Selection mode: ${selectionMode.toSelectionModeString()}
            - Is default service: $isDefaultService
            - Device manufacturer: ${Build.MANUFACTURER}
            - Device model: ${Build.MODEL}
        """.trimIndent()
        )

        if (!isServiceDeclared) {
            return HceServiceStatus.ServiceNotDeclaredInManifest
        }

        // Final verdict: Service can work if registered for AIDs
        // Note: isDefaultServiceForCategory may return false on some devices
        // even when the service actually works, so we rely on AID registration
        return when {
            isRegisteredForAids -> HceServiceStatus.FullyOperational(selectionMode.toSelectionModeString())
            selectionMode == CardEmulation.SELECTION_MODE_ALWAYS_ASK ||
                    selectionMode == CardEmulation.SELECTION_MODE_ASK_IF_CONFLICT ->
                HceServiceStatus.RequiresUserSelection(selectionMode.toSelectionModeString())

            else -> HceServiceStatus.NotRegistered(selectionMode.toSelectionModeString())
        }
    }

    /**
     * Check if device is known to have HCE compatibility issues.
     */
    fun isKnownProblematicDevice(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()

        return when {
            // Xiaomi/MIUI devices - some models have restricted HCE
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> {
                ProximityLogger.i(TAG, "Xiaomi/MIUI device detected - HCE may have limitations")
                true
            }
            // Huawei/EMUI devices - may have custom NFC stack
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                ProximityLogger.i(TAG, "Huawei/EMUI device detected - HCE may have limitations")
                true
            }
            // Add other known problematic manufacturers
            else -> false
        }
    }

    /**
     * Get a user-friendly message about HCE status.
     */
    fun getStatusMessage(status: HceServiceStatus): String {
        return when (status) {
            is HceServiceStatus.FullyOperational -> {
                "NFC card emulation is fully operational.\nselectionMode: ${status.selectionMode}"
            }

            is HceServiceStatus.RequiresUserSelection ->
                "NFC card emulation requires user selection in system settings.\nselectionMode: \${status.selectionMode}\""

            is HceServiceStatus.NotRegistered ->
                "HCE service is not registered. Please check app configuration.\nselectionMode: \${status.selectionMode}\""

            is HceServiceStatus.NfcNotSupported ->
                "This device does not support NFC"

            is HceServiceStatus.HceNotSupported ->
                "This device does not support Host Card Emulation"

            is HceServiceStatus.NfcAdapterNotAvailable ->
                "NFC adapter is not available"

            is HceServiceStatus.NfcDisabled ->
                "NFC is disabled. Please enable it in system settings."

            is HceServiceStatus.ServiceNotDeclaredInManifest ->
                "HCE service is not properly declared in AndroidManifest.xml"

            is HceServiceStatus.CardEmulationNotAvailable ->
                "Card emulation is not available on this device"

            is HceServiceStatus.ForegroundPreferenceNotAllowed ->
                "Foreground service preference is not allowed on this device"

            is HceServiceStatus.PreferredClassNotSet -> "Preferred class not set"
        }
    }

    private fun Int.toSelectionModeString(): String = when (this) {
        CardEmulation.SELECTION_MODE_PREFER_DEFAULT -> "PREFER_DEFAULT"
        CardEmulation.SELECTION_MODE_ASK_IF_CONFLICT -> "ASK_IF_CONFLICT"
        CardEmulation.SELECTION_MODE_ALWAYS_ASK -> "ALWAYS_ASK"
        else -> "UNKNOWN($this)"
    }
}

/**
 * Sealed class representing HCE service status.
 */
sealed class HceServiceStatus {
    /** Service is fully operational and ready to use */
    data class FullyOperational(val selectionMode: String) : HceServiceStatus()

    /** Service requires user to select it in system settings */
    data class RequiresUserSelection(val selectionMode: String) : HceServiceStatus()

    /** Service is not registered for any AIDs */
    data class NotRegistered(val selectionMode: String) : HceServiceStatus()

    /** Device does not have NFC hardware */
    object NfcNotSupported : HceServiceStatus()

    /** Device does not support HCE feature */
    object HceNotSupported : HceServiceStatus()

    /** NFC adapter is not available */
    object NfcAdapterNotAvailable : HceServiceStatus()

    /** NFC is disabled in settings */
    object NfcDisabled : HceServiceStatus()

    /** Service not declared in AndroidManifest.xml */
    object ServiceNotDeclaredInManifest : HceServiceStatus()

    /** CardEmulation API not available */
    object CardEmulationNotAvailable : HceServiceStatus()

    /** Foreground preference not allowed */
    object ForegroundPreferenceNotAllowed : HceServiceStatus()

    /** Preferred class not set */
    object PreferredClassNotSet : HceServiceStatus()

    /**
     * Check if service can potentially work.
     */
    fun canWork(): Boolean = when (this) {
        is FullyOperational, is RequiresUserSelection -> true
        else -> false
    }
}
