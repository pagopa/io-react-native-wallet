package com.ioreactnativeiso18013

import com.facebook.react.bridge.Arguments
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.toBridgePromise

class ExpoIso18013CborModule : Module() {
  private val implementation by lazy {
    IoReactNativeCborModule(checkNotNull(appContext.runtime.reactContext) { "React context is unavailable" })
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoIso18013Cbor")
    AsyncFunction("decode") { data: String, promise: Promise ->
      implementation.decode(data, promise.toBridgePromise())
    }
    AsyncFunction("decodeDocuments") { data: String, promise: Promise ->
      implementation.decodeDocuments(data, promise.toBridgePromise())
    }
    AsyncFunction("decodeIssuerSigned") { data: String, promise: Promise ->
      implementation.decodeIssuerSigned(data, promise.toBridgePromise())
    }
    AsyncFunction("sign") { data: String, keyTag: String, promise: Promise ->
      implementation.sign(data, keyTag, promise.toBridgePromise())
    }
    AsyncFunction("verify") { data: String, publicKey: Map<String, Any?>, promise: Promise ->
      implementation.verify(data, Arguments.makeNativeMap(publicKey), promise.toBridgePromise())
    }
  }
}
