package com.ioreactnativeiso18013

import com.facebook.react.bridge.ReadableArray

internal enum class EngagementMode(val bridgeValue: String) {
  QR_CODE("qrcode"),
  NFC("nfc");

  companion object {
    fun fromBridgeValue(value: String): EngagementMode =
      entries.firstOrNull { it.bridgeValue == value.lowercase() }
        ?: throw IllegalArgumentException("Invalid retrieval method: '$value'. Expected 'ble' or 'nfc'.")
  }
}

internal fun parseEngagementModes(engagementModes: ReadableArray): List<EngagementMode> {
  if (engagementModes.size() == 0) return listOf(EngagementMode.QR_CODE)
  return (0 until engagementModes.size()).map { index ->
    val method = engagementModes.getString(index)
      ?: throw IllegalArgumentException("Engagement mode at index $index is null")
    EngagementMode.fromBridgeValue(method)
  }
}
internal enum class RetrievalMethod(val bridgeValue: String) {
  BLE("ble"),
  NFC("nfc");

  companion object {
    fun fromBridgeValue(value: String): RetrievalMethod =
      entries.firstOrNull { it.bridgeValue == value.lowercase() }
        ?: throw IllegalArgumentException("Invalid retrieval method: '$value'. Expected 'ble' or 'nfc'.")
  }
}

internal fun parseRetrievalMethods(retrievalMethods: ReadableArray): List<RetrievalMethod> {
  if (retrievalMethods.size() == 0) return listOf(RetrievalMethod.BLE)
  return (0 until retrievalMethods.size()).map { index ->
    val method = retrievalMethods.getString(index)
      ?: throw IllegalArgumentException("Retrieval method at index $index is null")
    RetrievalMethod.fromBridgeValue(method)
  }
}
