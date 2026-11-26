package it.pagopa.io.wallet.proximity.response

import androidx.annotation.VisibleForTesting
import com.android.identity.cbor.Bstr
import com.android.identity.cbor.Cbor
import com.android.identity.cbor.CborArray
import com.android.identity.cbor.CborMap
import com.android.identity.cbor.DataItem
import com.android.identity.cbor.RawCbor
import com.android.identity.cbor.Tagged
import com.android.identity.document.DocumentRequest
import com.android.identity.document.NameSpacedData
import com.android.identity.mdoc.mso.StaticAuthDataParser
import com.android.identity.mdoc.response.DeviceResponseGenerator
import com.android.identity.mdoc.util.MdocUtil
import com.android.identity.util.Constants
import it.pagopa.io.wallet.cbor.CborLogger
import it.pagopa.io.wallet.cbor.cose.COSEManager
import it.pagopa.io.wallet.cbor.cose.SignWithCOSEResult
import it.pagopa.io.wallet.cbor.model.IssuerSigned
import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.request.DocRequested
import org.json.JSONObject

class ResponseGenerator(
    private val sessionsTranscript: ByteArray
) {
    interface Response {
        /**@param [response] [ByteArray] generated for response*/
        fun onResponseGenerated(response: ByteArray)

        /**@param [message] [String] for error reached*/
        fun onError(message: String)
    }

    /**
     * It creates a mdoc response in ByteArray format respect documents requested and disclosed
     * @param fieldRequestedAndAccepted a JSON with values to share (I.E.:{
     *  "org.iso.18013.5.1.mDL": {
     *  "org.iso.18013.5.1": {
     *  "portrait": true,
     *  "birth_date": true,
     *  "given_name": true,
     *  "issue_date": true,
     *  "expiry_date": true,
     *  "family_name": true,
     *  "document_number": true,
     *  "issuing_country": true,
     *  "issuing_authority": true,
     *  "driving_privileges": true,
     *  "un_distinguishing_sign": true
     *  }
     *  }
     *  })
     * @return[Response.onResponseGenerated] if ByteArray is created without Exceptions, else
     * [Response.onError] if disclosedDocumentsArray is Empty with "no doc found" message or if an
     * [Exception] was reached with [Throwable.message].
     */
    @JvmName("createResponseWithCallback")
    fun createResponse(
        documents: Array<DocRequested>,
        fieldRequestedAndAccepted: String,
        response: Response
    ) {
        val (responseToSend, message) = this.createResponse(
            documents, fieldRequestedAndAccepted
        )
        responseToSend?.let {
            response.onResponseGenerated(it)
        } ?: run {
            response.onError(message)
            ProximityLogger.e(
                "Sending resp",
                "found doc but fail to generate raw response: $message"
            )
        }
    }

    /**
     * It creates a mdoc response in ByteArray format respect documents requested and disclosed
     * @return[Pair]-> out <[ByteArray],[String]> with first element nullable,
     * if ByteArray is created without Exceptions message back will be "created" else
     * [Throwable.message] reached or empty string if this is null
     */
    @JvmName("createResponseWithBase64")
    fun createResponse(
        documents: Array<DocRequested>,
        fieldRequestedAndAccepted: String
    ): Pair<ByteArray?, String> {
        try {
            val deviceResponse = DeviceResponseGenerator(Constants.DEVICE_RESPONSE_STATUS_OK)
            CborLogger.i("Fields requested initially:", fieldRequestedAndAccepted)
            val fieldsRequested = JSONObject(fieldRequestedAndAccepted)
            documents.filter {
                fieldsRequested.keys().asSequence().contains(it.docType)
            }.map {
                Triple(IssuerSigned.issuerSignedFromByteArray(it.issuerSignedContent), it.alias, it.docType)
            }.forEach { (doc, alias, docType) ->
                ProximityLogger.i("ADDING DOC", "adding doc to response")
                addDocToResponse(
                    responseGenerator = deviceResponse,
                    issuerSignedObj = doc,
                    fieldsRequested = fieldsRequested,
                    transcript = sessionsTranscript,
                    alias = alias,
                    docType = docType
                )
            }
            return deviceResponse.generate() to "created"
        } catch (e: Exception) {
            return null to e.message.orEmpty()
        }
    }

    private fun setDeviceNamespaces(
        sessionTranscript: ByteArray,
        alias: String, docType: String
    ): DataItem {
        val dataElements = NameSpacedData.Builder().build()
        val mapBuilder = CborMap.builder()
        for (nameSpaceName in dataElements.nameSpaceNames) {
            val nsBuilder = mapBuilder.putMap(nameSpaceName)
            for (dataElementName in dataElements.getDataElementNames(
                nameSpaceName
            )) {
                nsBuilder.put(
                    dataElementName,
                    RawCbor(
                        dataElements.getDataElement(
                            nameSpaceName,
                            dataElementName
                        )
                    )
                )
            }
        }
        mapBuilder.end()
        val encodedDeviceNameSpaces = Cbor.encode(mapBuilder.end().build())
        val deviceAuthentication = Cbor.encode(
            CborArray.builder()
                .add("DeviceAuthentication")
                .add(RawCbor(sessionTranscript))
                .add(docType)
                .addTaggedEncodedCbor(encodedDeviceNameSpaces)
                .end()
                .build()
        )
        val deviceAuthenticationBytes = Cbor.encode(
            Tagged(24, Bstr(deviceAuthentication))
        )
        var encodedDeviceSignature: ByteArray
        when (val result = COSEManager().signWithCOSE(
            data = deviceAuthenticationBytes,
            alias = alias,
            isDetached = true
        )) {
            is SignWithCOSEResult.Success -> encodedDeviceSignature = result.signature
            else -> throw IllegalArgumentException("Fail to sign Sign1 message")
        }
        val deviceAuthType = "deviceSignature"
        val deviceAuthDataItem = Cbor.decode(encodedDeviceSignature)
        return CborMap.builder()
            .putTaggedEncodedCbor("nameSpaces", encodedDeviceNameSpaces)
            .putMap("deviceAuth")
            .put(deviceAuthType, deviceAuthDataItem)
            .end()
            .end()
            .build()
    }

    @VisibleForTesting
    fun createDataElements(
        issuerSignedObj: IssuerSigned,
        fieldsRequested: JSONObject,
        docType: String
    ): ArrayList<DocumentRequest.DataElement> {
        val dataElements = ArrayList<DocumentRequest.DataElement>()
        val nameSpacesObj = fieldsRequested.optJSONObject(docType)
        nameSpacesObj?.keys()?.forEach { nameSpace ->
            val json = nameSpacesObj.optJSONObject(nameSpace)
            json?.keys()?.forEach { elementIdentifier ->
                val isRequested = json.optBoolean(elementIdentifier) == true
                if (isRequested) {
                    issuerSignedObj.nameSpaces?.get(nameSpace)?.filter {
                        it.elementIdentifier == elementIdentifier
                    }?.forEach {
                        dataElements.add(
                            DocumentRequest.DataElement(
                                nameSpace,
                                it.elementIdentifier!!,
                                false
                            )
                        )
                    }
                }
            }
        }
        return dataElements
    }

    private fun addDocToResponse(
        responseGenerator: DeviceResponseGenerator,
        issuerSignedObj: IssuerSigned?,
        fieldsRequested: JSONObject,
        transcript: ByteArray,
        alias: String,
        docType: String
    ) {
        if (issuerSignedObj == null) return
        val dataElements = this.createDataElements(issuerSignedObj, fieldsRequested, docType)
        CborLogger.i("dataElements", dataElements.toString())
        val deviceSigned = setDeviceNamespaces(
            transcript,
            alias,
            docType
        )
        val staticAuthData = StaticAuthDataParser(issuerSignedObj.rawValue!!).parse()
        val request = DocumentRequest(dataElements)
        val issuerNamespaces = MdocUtil.mergeIssuerNamesSpaces(
            request,
            NameSpacedData.fromDataItem(nameSpacedData(issuerSignedObj.nameSpacedData)),
            staticAuthData
        )
        val issuerSignedMapBuilder = CborMap.builder()
        val insOuter = CborMap.builder()
        for (ns in issuerNamespaces.keys) {
            val insInner = insOuter.putArray(ns)
            for (encodedIssuerSignedItemBytes in issuerNamespaces[ns]!!) {
                insInner.add(RawCbor(encodedIssuerSignedItemBytes))
            }
            insInner.end()
        }
        insOuter.end()
        issuerSignedMapBuilder.put("nameSpaces", insOuter.end().build())
        issuerSignedMapBuilder.put("issuerAuth", RawCbor(issuerSignedObj.issuerAuth!!.rawValue!!))
        val issuerSigned = issuerSignedMapBuilder.end().build()
        val mapBuilder = CborMap.builder().apply {
            put("docType", docType)
            put("issuerSigned", issuerSigned)
            put("deviceSigned", deviceSigned)
        }
        responseGenerator.addDocument(Cbor.encode(mapBuilder.end().build()))
    }

    private fun nameSpacedData(map: Map<String, Map<String, ByteArray>>): DataItem {
        CborMap.builder().run {
            for (namespaceName in map.keys) {
                val innerMapBuilder = putMap(namespaceName)
                val namespace = map[namespaceName]!!
                for ((dataElementName, dataElementValue) in namespace) {
                    innerMapBuilder.putTagged(
                        dataElementName,
                        Tagged.ENCODED_CBOR,
                        Bstr(dataElementValue)
                    )
                }
            }
            return end().build()
        }
    }
}