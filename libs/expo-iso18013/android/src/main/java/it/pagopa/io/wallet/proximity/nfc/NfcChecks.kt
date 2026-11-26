package it.pagopa.io.wallet.proximity.nfc

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.provider.Settings

class NfcChecks(private val context: Context) {
    /**It checks if device has NFC feature*/
    fun hasNfcFeature() = NfcAdapter.getDefaultAdapter(context) != null

    /**It checks if device has NFC enabled or not*/
    fun isNfcAvailable() = NfcAdapter.getDefaultAdapter(context)?.isEnabled == true

    /**It opens NFC Settings*/
    fun openNfcSettings() {
        val intent = Intent(Settings.ACTION_NFC_SETTINGS)
        context.startActivity(intent)
    }

    /**It checks if device has Card host emulation*/
    fun hasCardHostEmulation(): Boolean {
        return context
            .packageManager
            .hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
    }

    /**It checks if all is ready for NFC engagement with Card host emulation*/
    fun isNfcReadyForEngagement() = this.isNfcAvailable() && this.hasCardHostEmulation()

    fun isSamsungDevice() = android.os.Build.MANUFACTURER.equals("samsung", ignoreCase = true)
    fun hasNxpMifare(): Boolean {
        return context.packageManager.hasSystemFeature("com.nxp.mifare")
    }
}