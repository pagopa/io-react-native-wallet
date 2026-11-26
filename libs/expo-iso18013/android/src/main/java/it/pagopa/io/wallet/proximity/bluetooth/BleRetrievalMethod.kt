package it.pagopa.io.wallet.proximity.bluetooth

import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod

/**
 * BLE Retrieval Method
 * @property peripheralServerMode set if the peripheral server mode is enabled
 * @property centralClientMode set if the central client mode is enabled
 * @property clearBleCache set if the BLE cache should be cleared
 */
data class BleRetrievalMethod(
    val peripheralServerMode: Boolean,
    val centralClientMode: Boolean,
    val clearBleCache: Boolean
) : DeviceRetrievalMethod