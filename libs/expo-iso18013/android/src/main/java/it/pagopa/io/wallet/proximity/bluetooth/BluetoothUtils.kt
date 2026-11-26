package it.pagopa.io.wallet.proximity.bluetooth

import android.bluetooth.BluetoothManager
import android.content.Context

object BluetoothUtils {
    fun isBluetoothEnabled(context: Context): Boolean {
        val bluetoothManager = context.getSystemService(Context.BLUETOOTH_SERVICE)
        val bluetoothAdapter = (bluetoothManager as BluetoothManager).adapter
        return bluetoothAdapter?.isEnabled == true
    }
}