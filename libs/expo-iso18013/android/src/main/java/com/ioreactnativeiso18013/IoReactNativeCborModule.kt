package com.ioreactnativeiso18013

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import it.pagopa.io.wallet.cbor.cose.COSEManager
import it.pagopa.io.wallet.cbor.cose.SignWithCOSEResult
import it.pagopa.io.wallet.cbor.parser.CBorParser

class IoReactNativeCborModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  /**
   * Decode base64 or base64url encoded CBOR data to JSON object.
   * Resolves with a string containing the parsed data or rejects with an error code
   * defined in [ModuleErrorCodes].
   * This method does not handle nested CBOR data, which will need additional parsing.
   * @param data the base64 or base64url encoded CBOR string
   */
  @ReactMethod
  fun decode(data: String, promise: Promise) {
    try {
      val buffer = Base64Utils.decodeBase64AndBase64Url(data)
      val result = CBorParser(buffer).toJson()
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.DECODE_ERROR, e.message, e)
    }
  }

  /**
   * Decode base64 or base64url encoded mDOC-CBOR data to a JSON object.
   * Resolves with a string containing the parsed data or rejects with an error code
   * @param data the base64 or base64url encoded mDOC-CBOR string
   */
  @ReactMethod
  fun decodeDocuments(data: String, promise: Promise) {
    try {
      val buffer = Base64Utils.decodeBase64AndBase64Url(data)
      CBorParser(buffer).documentsCborToJson(separateElementIdentifier = true, onComplete = {
        promise.resolve(it)
      }, onError = { e ->
        promise.reject(ModuleErrorCodes.DECODE_DOCUMENTS_ERROR, e.message, e)
      })
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.DECODE_DOCUMENTS_ERROR, e.message, e)
    }
  }

  /**
   * Decode base64 or base64url encoded issuerSigned attribute part of an mDOC-CBOR.
   * @param data the base64 or base64url encoded mDOC-CBOR containing the issuerSigned data string
   * Resolves with a string containing the parsed data or rejects with an error code
   * defined in [ModuleErrorCodes].
   */
  @ReactMethod
  fun decodeIssuerSigned(data: String, promise: Promise) {
    try {
      val buffer =
        Base64Utils.decodeBase64AndBase64Url(data)
      val result =
        CBorParser(buffer).issuerSignedCborToJson(separateElementIdentifier = true) ?: run {
          // We don't have the exact error here for some reason
          promise.reject(
            ModuleErrorCodes.DECODE_ISSUER_SIGNED_ERROR,
            "An error occurred while decoding the issuer signed content"
          )
        }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.DECODE_ISSUER_SIGNED_ERROR, e.message, e)
    }
  }

  /**
   * Sign base64 encoded data with COSE and return the COSE-Sign1 object in base64 encoding.
   * Resolves with a string containing the COSE-Sign1 object in base64 encoding or rejects with an
   * error code defined in [ModuleErrorCodes].
   * @param data the base64 or base64url encoded payload to sign
   * @param keyTag the alias of the key to use for signing.
   */
  @ReactMethod
  fun sign(data: String, keyTag: String, promise: Promise) {
    try {
      val buffer = Base64Utils.decodeBase64AndBase64Url(data)
      val result = COSEManager().signWithCOSE(
        data = buffer,
        alias = keyTag
      )
      when (result) {
        is SignWithCOSEResult.Failure -> {
          // We don't have a throwable to pass here from the onError callback
          promise.reject(ModuleErrorCodes.SIGN_ERROR, result.reason.msg)
        }

        is SignWithCOSEResult.Success -> {
          promise.resolve(Base64Utils.encodeBase64(result.signature))
        }
      }
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.SIGN_ERROR, e.message, e)
    }
  }

  /**
   * Verifies a COSE-Sign1 object with the provided public key.
   * Resolves with a boolean indicating whether or not the verification succeeded or not or rejects
   * with an error code defined in [ModuleErrorCodes].
   * @param data the COSE-Sign1 object in base64 or base64url encoding
   * @param publicKey the public key in JWK format
   */
  @ReactMethod
  fun verify(data: String, publicKey: ReadableMap, promise: Promise) {
    try {
      val buffer = Base64Utils.decodeBase64AndBase64Url(data)
      val result = COSEManager().verifySign1FromJWK(
        dataSigned = buffer,
        jwk = publicKey.toString()
      )
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.VERIFY_ERROR, e.message, e)
    }
  }

  companion object {
    const val NAME = "IoReactNativeCbor"

    // Errors which this module uses to reject a promise
    private object ModuleErrorCodes {
      const val DECODE_ERROR = "DECODE_ERROR"
      const val DECODE_DOCUMENTS_ERROR = "DECODE_DOCUMENTS_ERROR"
      const val DECODE_ISSUER_SIGNED_ERROR = "DECODE_ISSUER_SIGNED_ERROR"
      const val SIGN_ERROR = "SIGN_ERROR"
      const val VERIFY_ERROR = "VERIFY_ERROR"
    }
  }
}
