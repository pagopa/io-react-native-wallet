package com.ioreactnativeiso18013

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import it.pagopa.io.wallet.proximity.OpenID4VP
import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.bluetooth.BleRetrievalMethod
import it.pagopa.io.wallet.proximity.engagement.EngagementListener
import it.pagopa.io.wallet.proximity.nfc.NfcEngagementEvent
import it.pagopa.io.wallet.proximity.nfc.NfcEngagementEventBus
import it.pagopa.io.wallet.proximity.nfc.NfcEngagementService
import it.pagopa.io.wallet.proximity.nfc.NfcRetrievalMethod
import it.pagopa.io.wallet.proximity.qr_code.QrEngagement
import it.pagopa.io.wallet.proximity.request.DocRequested
import it.pagopa.io.wallet.proximity.response.ResponseGenerator
import it.pagopa.io.wallet.proximity.retrieval.sendErrorResponse
import it.pagopa.io.wallet.proximity.session_data.SessionDataStatus
import it.pagopa.io.wallet.proximity.wrapper.DeviceRetrievalHelperWrapper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class IoReactNativeIso18013Module(
  reactContext: ReactApplicationContext,
  private val emitEvent: (String, Any?) -> Unit
) :
  ReactContextBaseJavaModule(reactContext) {

  private var qrEngagement: QrEngagement? = null
  private var deviceRetrievalHelper: DeviceRetrievalHelperWrapper? = null

  private var nfcEventJob: Job? = null
  private val nfcScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

  private var sessionRetrievalMethod: RetrievalMethod? = null

  // Session transcript received by the NFC engagement, stored for the current session
  private var sessionTranscript: ByteArray? = null

  init {
    ProximityLogger.enabled = BuildConfig.DEBUG
  }

  override fun getName(): String {
    return NAME
  }

  override fun invalidate() {
    this.dispose()
    super.invalidate()
  }

  /**
   * Starts the NFC proximity flow by allocating the necessary resources, enabling NFC
   * engagement/HCE and initializing the Bluetooth stack (if required).
   * Resolves to true or rejects with an error code defined in [ModuleErrorCodes].
   * @param peripheralMode whether the device is in peripheral mode. Defaults to true
   * @param centralClientMode whether the device is in central client mode. Defaults to false
   * @param clearBleCache whether the BLE cache should be cleared. Defaults to true
   * @param certificates two-dimensional array of base64 strings representing DER encoded X.509 certificate which are used to authenticate the verifier app
   * @param enagementModes array of strings representing the engagement modes (e.g. QR_CODE, BLE) to be used.
   * @param retrievalMethods array of strings representing the retrieval methods (e.g. NFC, BLE) to be used.
   * @param promise the promise which will be resolved in case of success or rejected in case of failure.
   */
  @ReactMethod
  fun startEngagement(
    peripheralMode: Boolean,
    centralClientMode: Boolean,
    clearBleCache: Boolean,
    certificates: ReadableArray,
    enagementModes: ReadableArray,
    retrievalMethods: ReadableArray,
    promise: Promise
  ) {
    try {
      val activity = checkNotNull(reactApplicationContext.currentActivity) { "No activity available" }

      val certificatesList = parseCertificates(certificates)
      val parsedEngagementModes = parseEngagementModes(enagementModes)
      val parsedRetrievalMethods = parseRetrievalMethods(retrievalMethods)

      val methods = buildList {
        if (parsedRetrievalMethods.any { it == RetrievalMethod.BLE }) {
          add(
            BleRetrievalMethod(
              peripheralServerMode = peripheralMode,
              centralClientMode = centralClientMode,
              clearBleCache = clearBleCache
            )
          )
        }
        if (parsedRetrievalMethods.any { it == RetrievalMethod.NFC }) {
          add(NfcRetrievalMethod())
        }
      }

      // NFC engagement

      if (parsedEngagementModes.any { it == EngagementMode.NFC }) {
        val readerTrustStore = certificatesList.map { chain -> chain.map<ByteArray, Any> { it } }

        check(
          NfcEngagementEventBus.setupNfcService(
            retrievalMethods = methods, readerTrustStore = readerTrustStore
          )
        ) { "Unable to setup NFC engagement service" }

        val status = NfcEngagementService.enable(
          activity = activity, preferredNfcEngSerCls = IoNfcEngagementService::class.java
        )
        check(status.canWork()) { "HCE not available: $status" }
        setupNfcHandler()
        sendEvent("onNfcStarted", null)
      }

      // QR Code engagement

      if (parsedEngagementModes.any { it == EngagementMode.QR_CODE }) {
        qrEngagement = QrEngagement.build(reactApplicationContext, methods).apply {
          withReaderTrustStore(certificatesList)
        }
        qrEngagement?.configure()
        setupProximityHandler()
        emitQrCodeString()
      }

      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.START_ERROR, e.message, e)
    }
  }

  /**
   * Generates and send QR Code string payload to React Native via `RCTEventEmitter`.
   */
  private fun emitQrCodeString() {
    val qrCodeString =
      checkNotNull(qrEngagement?.getQrCodeString()) { NOT_INITIALIZED_ERROR_MESSAGE }

    val data: WritableMap = Arguments.createMap()
    data.putString("data", qrCodeString)
    sendEvent("onQrCodeString", data)
  }

  /**
   * Closes the bluetooth connection and clears any resource.
   * Resolves to true after closing the connection or rejects with an error code
   * defined in [ModuleErrorCodes].
   * @param promise the promise which will be resolved in case of success or rejected
   * in case of failure.
   */
  @ReactMethod
  fun close(promise: Promise) {
    try {
      this.dispose()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.CLOSE_ERROR, message = e.message, e)
    }
  }


  /**
   * Sends an error response during the presentation according to the SessionData status codes
   * defined in table 20 of the ISO18013-5 standard.
   * Resolves to true or rejects with an error code defined in [ModuleErrorCodes].
   * @param code the status error to be sent is a long type but the bridge only maps
   * double values. It is converted to a long.
   * The accepted values are defined in ``SessionDataStatus`` as follows:
   *  10 -> Error: session encryption
   *  11 -> Error: CBOR decoding
   *  20 -> Session termination
   * @param promise the promise which will be resolved in case of success or rejected in case of failure.
   */
  @ReactMethod
  fun sendErrorResponse(code: Double, promise: Promise) {
    try {
      deviceRetrievalHelper?.let { drh ->
        val sessionDataStatus =
          checkNotNull(SessionDataStatus.entries.find { it.value == code.toLong() }) {
            "Invalid status code"
          }
        drh.sendErrorResponse(sessionDataStatus)
        promise.resolve(true)
      } ?: run {
        promise.reject(
          ModuleErrorCodes.DRH_NOT_DEFINED, message = NOT_INITIALIZED_ERROR_MESSAGE
        )
      }
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.SEND_ERROR_RESPONSE_ERROR, message = e.message, e)
    }
  }

  /**
   * Generates a response which can later be sent with {sendResponse} with the provided
   * CBOR documents and the requested attributes.
   * Resolves with a base64 encoded response or rejects with an error code defined in [ModuleErrorCodes].
   * @param documents [ReadableArray] containing documents. Each document is defined as a map containing:
   * - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
   * - alias which is the alias of the key used to sign the credential;
   * - docType which is the document type.
   * @param acceptedFields A dictionary of elements, where each element must adhere to a Map<String, Map<String, Map<String,Boolean>>>.
   * The outermost key represents the credential doctype. The inner dictionary contains namespaces, and for each namespace, there is another dictionary mapping requested claims to a boolean value, which indicates whether the user is willing to present the corresponding claim. Example:
   * ```
   * {
   *    "org.iso.18013.5.1.mDL": {
   *      "org.iso.18013.5.1": {
   *        "hair_colour": true,
   *        "given_name_national_character": true,
   *        "family_name_national_character": true,
   *        "given_name": true,
   *      },
   *      {...}
   *    },
   *   {...}
   * }
   * ```
   * @param promise The promise which will be resolved in case of success or rejected in case of failure.
   */
  @ReactMethod
  fun generateResponse(
    documents: ReadableArray, acceptedFields: ReadableMap, promise: Promise
  ) {
    try {
      when (sessionRetrievalMethod) {

        // For NFC retrievals we use the session transcript received during the device connection event
        RetrievalMethod.NFC -> {
          val sessionTranscript = checkNotNull(sessionTranscript) { "Session transcript is null" }
          createAndResolveResponse(
            sessionTranscript = sessionTranscript,
            documents = documents,
            acceptedFields = acceptedFields,
            errorCode = ModuleErrorCodes.GENERATE_RESPONSE_ERROR,
            promise = promise
          )
        }

        // For BLE retrievals we use the session transcript obtained from the DeviceRetrievalHelper
        RetrievalMethod.BLE -> {
          deviceRetrievalHelper?.let { drh ->
            createAndResolveResponse(
              sessionTranscript = drh.sessionTranscript(),
              documents = documents,
              acceptedFields = acceptedFields,
              errorCode = ModuleErrorCodes.GENERATE_RESPONSE_ERROR,
              promise = promise
            )
          } ?: run {
            promise.reject(
              ModuleErrorCodes.DRH_NOT_DEFINED, message = NOT_INITIALIZED_ERROR_MESSAGE
            )
          }
        }

        else -> {
          promise.reject(
            ModuleErrorCodes.GENERATE_RESPONSE_ERROR, message = "Invalid retrieval method"
          )
        }
      }
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.GENERATE_RESPONSE_ERROR, message = e.message, e)
    }
  }

  /**
   * Sends a response containing the documents and the fields which the user decided to present generated by {generateResponse}.
   * Currently there's not evidence of the verifier app responding to this request, thus we don't handle the response.
   * Resolves with a true boolean in case of success or rejects with an error code defined in [ModuleErrorCodes].
   * @param response base64 encoded string containing the response generated by {generateResponse}
   * @param promise the promise which will be resolved in case of success or rejected in case of failure.
   */
  @ReactMethod
  fun sendResponse(response: String, promise: Promise) {
    try {
      val responseBytes = Base64Utils.decodeBase64(response)

      when (sessionRetrievalMethod) {

        // For NFC retrievals we use NfcEngagementEventBus to send the response over NFC
        RetrievalMethod.NFC -> {
          check(
            NfcEngagementEventBus.sendDocumentResponse(response = responseBytes)
          ) { "Unable to send response over NFC" }
          promise.resolve(true)
        }

        // For BLE retrievals we use the DeviceRetrievalHelper to send the response over BLE
        RetrievalMethod.BLE -> {
          deviceRetrievalHelper?.let { drh ->
            drh.sendResponse(responseBytes, 0L)
            promise.resolve(true)
          } ?: run {
            promise.reject(
              ModuleErrorCodes.DRH_NOT_DEFINED, message = NOT_INITIALIZED_ERROR_MESSAGE
            )
          }
        }

        else -> {
          promise.reject(
            ModuleErrorCodes.SEND_RESPONSE_ERROR, message = "Invalid retrieval method"
          )
        }
      }

    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.SEND_RESPONSE_ERROR, e.message, e)
    }
  }

  /**
   * Generates a CBOR encoded device response for ISO 18013-7 mDL remote presentation using OID4VP.
   * Resolves with the base64 encoded device response or rejects with an error code
   * defined in [ModuleErrorCodes].
   * @param clientId the client id extracted from OID4VP session
   * @param responseUri the response URI extracted from OID4VP session
   * @param authorizationRequestNonce the authorization request nonce extracted from OID4VP session
   * @param jwkThumbprint the base64url-encoded SHA-256 thumbprint (RFC 7638) of the response encryption key, or null for an unencrypted response
   * @param documents [ReadableArray] containing documents. Each document is defined as a map containing:
   * - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
   * - alias which is the alias of the key used to sign the credential;
   * - docType which is the document type.
   * @param acceptedFields dictionary of elements, where each element must adhere to a Map<String, Map<String, Map<String,Boolean>>>.
   * The outermost key represents the credential doctype. The inner dictionary contains namespaces, and for each namespace, there is another dictionary mapping requested claims to a boolean value, which indicates whether the user is willing to present the corresponding claim. Example:
   * ```
   * {
   *    "org.iso.18013.5.1.mDL": {
   *      "org.iso.18013.5.1": {
   *        "hair_colour": true,
   *        "given_name_national_character": true,
   *        "family_name_national_character": true,
   *        "given_name": true,
   *      }
   *    }
   * }
   * ```
   * @param promise the promise which will be resolved in case of success or rejected in case of failure.
   */
  @ReactMethod
  fun generateOID4VPDeviceResponse(
    clientId: String,
    responseUri: String,
    authorizationRequestNonce: String,
    jwkThumbprint: String?,
    documents: ReadableArray,
    acceptedFields: ReadableMap,
    promise: Promise
  ) {
    try {
      val thumbprintBytes = parseJwkThumbprint(jwkThumbprint)
      val sessionTranscript = OpenID4VP(
        clientId, responseUri, authorizationRequestNonce, thumbprintBytes
      ).createSessionTranscript()

      createAndResolveResponse(
        sessionTranscript = sessionTranscript,
        documents = documents,
        acceptedFields = acceptedFields,
        errorCode = ModuleErrorCodes.GENERATE_OID4VP_RESPONSE_ERROR,
        promise = promise
      )
    } catch (e: Exception) {
      promise.reject(ModuleErrorCodes.GENERATE_OID4VP_RESPONSE_ERROR, e.message, e)
    }
  }

  @ReactMethod
  fun setHceModalMessage(message: String) {
    // Android does not support alert messages for NFC reading
  }

  /**
   * Sets the proximity handler along with the possible dispatched events and their callbacks.
   * The events are then sent to React Native via `RCTEventEmitter`.
   * onDeviceConnecting: Emitted when the device is connecting to the verifier app.
   * onDeviceConnected: Emitted when the device is connected to the verifier app.
   * onDocumentRequestReceived: Emitted when a document request is received from the verifier app. Carries a payload containing the request data.
   * onDeviceDisconnected: Emitted when the device is disconnected from the verifier app.
   * onError: Emitted when an error occurs. Carries a payload containing the error data.
   */
  private fun setupProximityHandler() {
    qrEngagement?.withListener(object : EngagementListener {
      /**
       * This event currently doesn't get called due to an issue with the underlying native library.
       */
      override fun onDeviceConnecting() {
        sendEvent("onDeviceConnecting", null)
      }

      override fun onDeviceConnected(deviceRetrievalHelper: DeviceRetrievalHelperWrapper) {
        this@IoReactNativeIso18013Module.deviceRetrievalHelper = deviceRetrievalHelper
        sendEvent("onDeviceConnected", "")
      }

      override fun onError(error: Throwable) {
        val data: WritableMap = Arguments.createMap()
        data.putString("error", error.message ?: "")
        sendEvent("onError", data)
      }

      override fun onDocumentRequestReceived(request: String?, sessionsTranscript: ByteArray) {
        sessionRetrievalMethod = RetrievalMethod.BLE

        val data: WritableMap = Arguments.createMap()
        data.putString("data", request ?: "")
        data.putString("retrievalMethod", sessionRetrievalMethod?.bridgeValue)
        sendEvent("onDocumentRequestReceived", data)
      }

      override fun onDeviceDisconnected(transportSpecificTermination: Boolean) {
        sendEvent("onDeviceDisconnected", transportSpecificTermination.toString())
      }
    })
  }

  /**
   * Sets the NFC handler along with the possible dispatched events and their callbacks.
   * The events are then sent to React Native via `RCTEventEmitter`.
   * onDeviceConnecting: Emitted when the device is connecting to the verifier app.
   * onDeviceConnected: Emitted when the device is connected to the verifier app.
   * onDocumentRequestReceived: Emitted when a document request is received from the verifier app. Carries a payload containing the request data.
   * onDeviceDisconnected: Emitted when the device is disconnected from the verifier app.
   * onError: Emitted when an error occurs. Carries a payload containing the error data.
   * onNfcStopped: Emitted when the NFC handler is stopped.
   */
  private fun setupNfcHandler() {
    nfcEventJob?.cancel()
    nfcEventJob = nfcScope.launch {
      NfcEngagementEventBus.events.collect { event ->
        when (event) {
          is NfcEngagementEvent.Connecting -> {
            sendEvent("onDeviceConnecting", null)
          }

          is NfcEngagementEvent.Connected -> {
            deviceRetrievalHelper = event.device
            sendEvent("onDeviceConnected", null)
          }

          is NfcEngagementEvent.Error -> {
            val data: WritableMap = Arguments.createMap()
            data.putString("error", event.error.message ?: "")
            sendEvent("onError", data)
          }

          is NfcEngagementEvent.Disconnected -> sendEvent(
            "onDeviceDisconnected", null
          )

          is NfcEngagementEvent.DocumentRequestReceived -> {
            sessionRetrievalMethod = if (event.onlyNfc) RetrievalMethod.NFC else RetrievalMethod.BLE
            sessionTranscript = event.sessionTranscript

            val data: WritableMap = Arguments.createMap()
            data.putString("data", event.request)
            data.putString("retrievalMethod", sessionRetrievalMethod?.bridgeValue)
            sendEvent("onDocumentRequestReceived", data)
          }

          is NfcEngagementEvent.NotSupported -> sendEvent("onNfcStopped", null)

          is NfcEngagementEvent.NfcOnlyEventListener -> { /* NOT HANDLED */
          }

          is NfcEngagementEvent.DocumentSent -> sendEvent("onDeviceDisconnected", null)
        }
      }
    }
  }

  /**
   * Utility function that generates the response using the ResponseGeneration from a session
   * transcript
   * @param sessionTranscript the session transcript to be used to generate the response
   * @param documents the documents to be included in the response
   * @param acceptedFields the accepted fields to be presented
   * @param errorCode the error code to be used in case of error
   * @param promise the promise which will be resolved in case of success or rejected in case of failure.
   */
  private fun createAndResolveResponse(
    sessionTranscript: ByteArray,
    documents: ReadableArray,
    acceptedFields: ReadableMap,
    errorCode: String,
    promise: Promise
  ) {
    val docRequestedList = parseDocRequested(documents)
    val parsedAcceptedFields = parseAcceptedFields(acceptedFields)
    ResponseGenerator(sessionTranscript).createResponse(
      docRequestedList, parsedAcceptedFields, object : ResponseGenerator.Response {
        override fun onResponseGenerated(response: ByteArray) =
          promise.resolve(Base64Utils.encodeBase64(response))

        override fun onError(message: String) {
          promise.reject(errorCode, message)
        }
      })
  }

  /**
   * Wrapper function to send an event via `RCTEventEmitter`
   * @param eventName - The event name
   * @param data - The data attached to eventName
   */
  private fun sendEvent(eventName: String, data: Any?) {
    emitEvent(eventName, data)
  }

  /**
   * Disposes the resources
   */
  private fun dispose() {
    qrEngagement?.close()
    qrEngagement = null
    deviceRetrievalHelper?.disconnect()
    deviceRetrievalHelper = null
    sessionRetrievalMethod = null
    sessionTranscript = null
    nfcEventJob?.cancel()
    nfcEventJob = null
    reactApplicationContext.currentActivity?.let { NfcEngagementService.disable(it) }
  }

  /**
   * Keep: Required for RN built in Event Emitter Calls.
   * This fixes the warning: `new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method
   */
  @ReactMethod
  fun addListener(eventName: String?) = Unit

  /**
   * Keep: Required for RN built in Event Emitter Calls.
   * This fixes the warning: `new NativeEventEmitter()` was called with a non-null argument without the required `removeListeners` method
   */
  @ReactMethod
  fun removeListeners(count: Int?) = Unit

  companion object {
    internal fun parseJwkThumbprint(jwkThumbprint: String?): ByteArray? =
      jwkThumbprint?.let {
        Base64Utils.decodeBase64AndBase64Url(it).also { bytes ->
          require(bytes.size == 32) { "jwkThumbprint must contain a SHA-256 digest (32 bytes)" }
        }
      }

    const val NAME = "IoReactNativeIso18013"
    const val NOT_INITIALIZED_ERROR_MESSAGE =
      "Resources not initialized properly, call the start method before this one."

    // Errors which this module uses to reject a promise
    private object ModuleErrorCodes {
      // ISO18013-5 related errors
      const val DRH_NOT_DEFINED = "DRH_NOT_DEFINED"
      const val START_ERROR = "START_ERROR"
      const val GENERATE_RESPONSE_ERROR = "GENERATE_RESPONSE_ERROR"
      const val SEND_RESPONSE_ERROR = "SEND_RESPONSE_ERROR"
      const val SEND_ERROR_RESPONSE_ERROR = "SEND_ERROR_RESPONSE_ERROR"
      const val CLOSE_ERROR = "CLOSE_ERROR"

      // ISO18013-7 related errors
      const val GENERATE_OID4VP_RESPONSE_ERROR = "GENERATE_OID4VP_RESPONSE_ERROR"
    }

    /**
     * Utility function which checks if the input map is consistent with what we expects before parsing
     * it to a string.
     * It loops through each credential and each namespace, checking if the accepted fields contain
     * a boolean value.
     * @param acceptedFields - A map contained the accepted fields to be presented with the following shape:
     * {
     * "org.iso.18013.5.1.mDL": {
     *  "org.iso.18013.5.1": {
     *    "hair_colour": true,
     *    "given_name_national_character": true,
     *    "family_name_national_character": true,
     *    "given_name": true,
     *    },
     *    {...}
     *   },
     *   {...}
     * }
     * @throw IllegalArgumentException if the value provided is not a ReadableMap which contains
     * at least a credential type. If a namespace doesn't contain at least one value.
     * @returns String representation of [acceptedFields]
     */
    internal fun parseAcceptedFields(acceptedFields: ReadableMap): String {
      try {
        // Loop for each credential and throw if something different than map is found
        acceptedFields.entryIterator.forEach { credentialEntry ->
          val credentialName = credentialEntry.key
          val credentialValue = credentialEntry.value
          if (credentialValue !is ReadableMap) {
            throw IllegalArgumentException("Credential '$credentialName' must be a map")
          }

          // We don't check for a namespace, if there's none that's a valid structure and thus should pass the validation

          // Loop for each namespace in credential and throw if something different than map is found
          credentialValue.entryIterator.forEach { namespaceEntry ->
            val namespaceName = namespaceEntry.key
            val namespaceValue = namespaceEntry.value
            if (namespaceValue !is ReadableMap) {
              throw IllegalArgumentException("Namespace '$namespaceName' in credential '$credentialName' must be a map")
            }

            // If no field is found then throw
            if (!namespaceValue.entryIterator.hasNext()) {
              throw IllegalArgumentException("Credential '$credentialName' with namespace `$namespaceName` must define at least one field")
            }

            // Loop for each field in namespace and throw if something different than boolean is found
            namespaceValue.entryIterator.forEach { fieldEntry ->
              val fieldName = fieldEntry.key
              val fieldValue = fieldEntry.value
              if (fieldValue !is Boolean) {
                throw IllegalArgumentException("Field '$fieldName' in namespace '$namespaceName' of credential '$credentialName' must be a boolean")
              }
            }
          }
        }
        // If no exception is thrown then we can convert it to string
        return acceptedFields.toString()
      } catch (e: Exception) {
        throw IllegalArgumentException("Failed to parse accepted fields: ${e.message}", e)
      }
    }


    /**
     * Utility function which extracts the document shape we expect to receive from the bridge
     * in the one expected by {DocRequested}.
     * @param documents a {ReadableArray} containing documents. Each document is defined as a map containing:
     * - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
     * - alias which is the alias of the key used to sign the credential;
     * - docType which is the document type.
     * @returns an array containing a {DocRequested} object for each document in {documents}
     * @throws IllegalArgumentException if the provided document doesn't adhere to the expected format
     */
    fun parseDocRequested(documents: ReadableArray): Array<DocRequested> {
      return try {
        (0 until documents.size()).map { i ->
          val entry = documents.getMap(i)
            ?: throw IllegalArgumentException("Entry at index $i in ReadableArray is null")
          val alias = entry.getString("alias")
          val issuerSignedContentStr = entry.getString("issuerSignedContent")
          val docType = entry.getString("docType")

          if (alias == null || entry.getType("alias") != ReadableType.String || issuerSignedContentStr == null || entry.getType(
              "issuerSignedContent"
            ) != ReadableType.String || docType == null || entry.getType("docType") != ReadableType.String
          ) throw IllegalArgumentException("Unable to decode the provided documents at index $i")

          val issuerSignedContent = Base64Utils.decodeBase64AndBase64Url(issuerSignedContentStr)

          DocRequested(
            issuerSignedContent, alias, docType
          )
        }.toTypedArray()
      } catch (e: Exception) {
        throw IllegalArgumentException("Failed to parse documents: ${e.message}", e)
      }
    }

    /**
     * Utility function to parse an array coming from the React Native Bridge into an ArrayList
     * of ByteArray representing DER encoded X.509 certificates.
     * @param certificates two-dimensional array of base64 strings representing DER encoded X.509 certificate
     * @returns ArrayList of ByteArray representing DER encoded X.509 certificates.
     * @throws IllegalArgumentException if an element in the array is not base64 encoded
     */
    fun parseCertificates(certificates: ReadableArray): List<List<ByteArray>> =
      /** Map the chain arrays and remove null entries. On each chain call the getArray method which
       * can throw and if it does rethrow an exception with information on its position
       */
      (0 until certificates.size()).mapNotNull { chainIndex ->
        val chain = runCatching { certificates.getArray(chainIndex) }.getOrElse {
          throw IllegalArgumentException(
            "Certificate chain at $chainIndex is not an array", it
          )
        } ?: throw IllegalArgumentException("Certificate chain at index $chainIndex is null")

        /**
         * Map each chain certificate and remove null entries. On each certificate call the getString
         * method which can throw and if it does rethrow an exception with information on its position
         */
        (0 until chain.size()).mapNotNull { certIndex ->
          val base64 = runCatching { chain.getString(certIndex) }.getOrElse {
            throw IllegalArgumentException(
              "Failed to get certificate string at chain $chainIndex, cert $certIndex", it
            )
          } ?: throw java.lang.IllegalArgumentException("Certificate at index $certIndex is null")

          /**
           * Decode the base64 string for each mapped certificate and if an error occurs rethrow
           * an exception with information on its position
           */
          runCatching {
            Base64Utils.decodeBase64(base64)
          }.getOrElse {
            throw IllegalArgumentException(
              "Certificate at index $certIndex in the chain at index $chainIndex is not a valid base64 string",
              it
            )
          }
        }
      }
  }
}
