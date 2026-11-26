package com.ioreactnativeiso18013

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableMap
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.toBridgePromise

class ExpoIso18013Module : Module() {
  private var implementation: IoReactNativeIso18013Module? = null

  private fun implementation(): IoReactNativeIso18013Module =
    implementation ?: IoReactNativeIso18013Module(
      checkNotNull(appContext.runtime.reactContext) { "React context is unavailable" }
    ) { name, data ->
      if (data is ReadableMap) sendEvent(name, data.toHashMap())
      else sendEvent(name)
    }.also { implementation = it }

  override fun definition() = ModuleDefinition {
    Name("ExpoIso18013")
    Events(
      "onQrCodeString", "onNfcStarted", "onNfcStopped", "onDeviceConnecting",
      "onDeviceConnected", "onDocumentRequestReceived", "onDeviceDisconnected", "onError", "unknown"
    )

    OnDestroy {
      implementation?.invalidate()
      implementation = null
    }

    AsyncFunction("startEngagement") {
      peripheral: Boolean, central: Boolean, clearCache: Boolean,
      certificates: List<List<String>>, engagement: List<String>, retrieval: List<String>, promise: Promise ->
      implementation().startEngagement(
        peripheral, central, clearCache, Arguments.makeNativeArray(certificates),
        Arguments.makeNativeArray(engagement), Arguments.makeNativeArray(retrieval), promise.toBridgePromise()
      )
    }
    AsyncFunction("close") { promise: Promise ->
      implementation().close(promise.toBridgePromise())
    }
    AsyncFunction("sendErrorResponse") { code: Double, promise: Promise ->
      implementation().sendErrorResponse(code, promise.toBridgePromise())
    }
    AsyncFunction("generateResponse") {
      documents: List<Map<String, Any?>>, acceptedFields: Map<String, Any?>, promise: Promise ->
      implementation().generateResponse(
        Arguments.makeNativeArray(documents), Arguments.makeNativeMap(acceptedFields), promise.toBridgePromise()
      )
    }
    AsyncFunction("sendResponse") { response: String, promise: Promise ->
      implementation().sendResponse(response, promise.toBridgePromise())
    }
    AsyncFunction("generateOID4VPDeviceResponse") {
      clientId: String, responseUri: String, nonce: String, thumbprint: String?,
      documents: List<Map<String, Any?>>, acceptedFields: Map<String, Any?>, promise: Promise ->
      implementation().generateOID4VPDeviceResponse(
        clientId, responseUri, nonce, thumbprint, Arguments.makeNativeArray(documents),
        Arguments.makeNativeMap(acceptedFields), promise.toBridgePromise()
      )
    }
    Function("setHceModalMessage") { message: String ->
      implementation().setHceModalMessage(message)
    }
  }
}
