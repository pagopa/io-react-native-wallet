package it.pagopa.io.wallet.cbor.model

import androidx.annotation.CheckResult
import com.upokecenter.cbor.CBORObject
import com.upokecenter.cbor.CBORType
import it.pagopa.io.wallet.cbor.exception.DocTypeNotValid
import it.pagopa.io.wallet.cbor.exception.MandatoryFieldNotFound
import it.pagopa.io.wallet.cbor.helper.oneDocument
import it.pagopa.io.wallet.cbor.helper.parseIssuerSigned
import it.pagopa.io.wallet.cbor.helper.toModelMDoc
import it.pagopa.io.wallet.cbor.parser.ElValueToJson
import org.json.JSONArray
import org.json.JSONObject
import java.util.Base64

data class ModelMDoc(
    var documents: List<Document>?,
    var status: Int?,
    var version: String?
) {
    fun toJson(separateElementIdentifier: Boolean): String {
        return JSONObject().apply {
            put("documents", this@ModelMDoc.documents?.map { it.toJson(separateElementIdentifier) })
            put("status", status)
            put("version", version)
        }.toString()
    }

    companion object {
        fun fromCBORObject(
            model: CBORObject,
            onComplete: (ModelMDoc) -> Unit,
            onError: (Exception) -> Unit
        ) {
            try {
                onComplete.invoke(model.toModelMDoc())
            } catch (ex: Exception) {
                onError.invoke(ex)
            }
        }
    }
}

data class Document(
    var deviceSigned: DeviceSigned? = null,
    var docType: String?,
    var issuerSigned: IssuerSigned?,
    val rawValue: ByteArray
) {
    fun toJson(separateElementIdentifier: Boolean) = JSONObject().apply {
        put("deviceSigned", deviceSigned?.toJson())
        put("docType", docType)
        put("issuerSigned", issuerSigned?.toJson(separateElementIdentifier))
    }

    @CheckResult
    fun verifyValidity(): Pair<Boolean, Exception?> {
        val needDataForMdl = listOf(
            "family_name",
            "given_name",
            "birth_date",
            "issue_date",
            "expiry_date",
            "issuing_country",
            "issuing_authority",
            "document_number",
            "portrait",
            "driving_privileges",
            "un_distinguishing_sign"
        )

        val needDataForEuPid = listOf(
            "family_name",
            "given_name",
            "birth_date"
        )

        val needData = when (this.docType) {
            MDL_DOCTYPE -> needDataForMdl
            EU_PID_DOCTYPE -> needDataForEuPid
            else -> {
                return false to DocTypeNotValid(this.docType)
            }
        }

        val usedKeys = this.issuerSigned?.nameSpaces?.get(this.docType)
            ?.filter { it.elementValue != null }
            ?.map { it.elementIdentifier }

        val list = needData
            .filter {
                usedKeys?.contains(it)?.not() != false
            }

        return if (list.isEmpty())
            true to null
        else
            false to MandatoryFieldNotFound(list)
    }

    companion object {
        fun fromByteArray(
            model: ByteArray
        ): Document {
            val cbor = CBORObject.DecodeFromBytes(model)
            return cbor.oneDocument()
        }
    }
}

data class DeviceSigned(
    val deviceAuth: DeviceAuth?,
    var nameSpaces: Map<String, Any>?
) {
    fun toJson() = JSONObject().apply {
        put("deviceAuth", deviceAuth?.toJson())
        put("nameSpaces", JSONObject().apply {
            nameSpaces?.forEach {
                this.put(it.key, it.value)
            }
        })
    }
}

data class DeviceAuth(
    val deviceSignature: String?
) {
    fun toJson() = JSONObject().apply {
        put("deviceSignature", deviceSignature)
    }
}

data class IssuerSigned(
    var nameSpaces: Map<String, List<DocumentX>>?,
    val rawValue: ByteArray? = null,
    val nameSpacedData: Map<String, Map<String, ByteArray>>,
    val issuerAuth: IssuerAuth? = null
) {
    fun toJson(separateElementIdentifier: Boolean) = JSONObject().apply {
        put("issuerAuth", issuerAuth?.getValues()?.toJson())
        put("nameSpaces", JSONObject().apply {
            nameSpaces?.forEach {
                this.put(it.key, it.value.map { it.toJson(separateElementIdentifier) })
            }
        })
    }

    companion object {
        fun issuerSignedFromByteArray(
            nameSpaces: ByteArray
        ): IssuerSigned? {
            val cbor = CBORObject.DecodeFromBytes(nameSpaces)
            return cbor.parseIssuerSigned()
        }
    }
}

data class IssuerAuth(
    val rawValue: ByteArray?,
) {
    private var protectedHeader: ByteArray? = null
    private var unprotectedHeader: List<UnprotectedHeader>? = null
    private var payload: Payload? = null
    private var signature: ByteArray? = null

    data class Payload(private val cbor: CBORObject) {
        var docType: String? = null
        var version: String? = null
        var validityInfo: JSONObject? = null
        var valueDigests: List<ValueDigest>? = null
        var digestAlgorithm: String? = null
        var deviceKeyInfo: ByteArray? = null
        fun construct(): Payload {
            if (cbor.type != CBORType.Map) return this
            cbor.keys.distinct().forEach {
                when (it.AsString()) {
                    "docType" -> this.docType = cbor[it].AsString()
                    "version" -> this.version = cbor[it].AsString()
                    "validityInfo" -> this.validityInfo = JSONObject(cbor[it].ToJSONString())
                    "digestAlgorithm" -> this.digestAlgorithm = cbor[it].AsString()
                    "deviceKeyInfo" -> this.deviceKeyInfo = cbor[it]?.EncodeToBytes()
                    "valueDigests" -> {
                        this.valueDigests = cbor[it].keys?.map { key ->
                            ValueDigest(
                                key?.AsString(),
                                cbor[it][key].keys?.map { keyInside ->
                                    ValueDigest.ValueValueDigest(
                                        keyInside.AsInt32(),
                                        cbor[it][key][keyInside.AsInt32()]?.GetByteString()
                                    )
                                }
                            )
                        }
                    }
                }
            }
            return this
        }

        data class ValueDigest(
            val key: String? = null,
            val values: List<ValueValueDigest>?
        ) {
            data class ValueValueDigest(val key: Int, val value: ByteArray?)

            fun toJson() = JSONObject().apply {
                values?.forEach {
                    put(it.key.toString(), Base64.getUrlEncoder().encodeToString(it.value))
                }
            }
        }


        private fun ByteArray.convertDeviceKeyInfoToJson(): JSONObject? {
            val back = JSONObject()
            val cbor = CBORObject.DecodeFromBytes(this)
            if (cbor.type != CBORType.Map) return null
            try {
                cbor.keys.forEach { key ->
                    if (key?.AsString() != "deviceKey")
                        back.put(key.AsString(), JSONObject(cbor[key].ToJSONString()))
                    else {
                        back.put("deviceKey", convertCborToJwk(cbor[key].EncodeToBytes()))
                    }
                }
                return back
            } catch (_: Exception) {
                return null
            }
        }

        private fun convertCborToJwk(cborData: ByteArray): JSONObject? {
            try {
                val cborObject = CBORObject.DecodeFromBytes(cborData)
                val keyType = cborObject[1].AsInt32()
                if (keyType != 2) return null
                val crv = when (cborObject[-1].AsInt32()) {
                    1 -> "P-256"
                    2 -> "P-384"
                    3 -> "P-521"
                    else -> return null
                }
                val xBytes = cborObject[-2].GetByteString()
                val yBytes = cborObject[-3].GetByteString()
                val x = Base64.getUrlEncoder().withoutPadding().encodeToString(xBytes)
                val y = Base64.getUrlEncoder().withoutPadding().encodeToString(yBytes)
                return JSONObject().apply {
                    put("kty", "EC")
                    put("crv", crv)
                    put("x", x)
                    put("y", y)
                }
            } catch (_: Exception) {
                return null
            }
        }

        fun toJson() = JSONObject().apply {
            put("docType", docType)
            put("version", version)
            put("validityInfo", validityInfo)
            put("digestAlgorithm", digestAlgorithm)
            put("deviceKeyInfo", deviceKeyInfo?.convertDeviceKeyInfoToJson())
            val jsonValueDigests = JSONObject()
            valueDigests?.forEach {
                if (it.key != null)
                    jsonValueDigests.put(it.key, it.toJson())
            }
            put("valueDigests", jsonValueDigests)
        }
    }

    fun getValues(): IssuerAuth {
        if (this.rawValue == null) return this
        val cborArray = CBORObject.DecodeFromBytes(this.rawValue)
        if (cborArray[0].type != CBORType.ByteString) return this
        protectedHeader = cborArray[0].GetByteString()
        if (cborArray[1].type != CBORType.Map) return this
        unprotectedHeader = cborArray[1].keys.map {
            UnprotectedHeader(
                COSEHeaderAlgorithm.fromInt(it.AsInt32()),
                cborArray[1][it].EncodeToBytes()
            )
        }
        if (cborArray[2].type != CBORType.ByteString) return this
        payload = Payload(
            CBORObject.DecodeFromBytes(
                CBORObject.DecodeFromBytes(cborArray[2].GetByteString()).GetByteString()
            )
        )
        if (cborArray[3].type != CBORType.ByteString) return this
        signature = cborArray[3].GetByteString()
        return this
    }

    fun toJson() = JSONObject().apply {
        if (this@IssuerAuth.rawValue != null)
            put("rawValue", Base64.getUrlEncoder().encodeToString(this@IssuerAuth.rawValue))
        if (protectedHeader != null)
            put("protectedHeader", Base64.getUrlEncoder().encodeToString(protectedHeader))
        if (unprotectedHeader != null) {
            val unprotectedHeaderObj = JSONObject()
            unprotectedHeader?.forEach {
                val (headerAlgorithm, value) = it.toPair()
                unprotectedHeaderObj.put(headerAlgorithm,value)
            }
            put("unprotectedHeader", unprotectedHeaderObj)
        }
        if (payload != null)
            put("payload", payload?.construct()?.toJson())
        if (signature != null)
            put("signature", Base64.getUrlEncoder().encodeToString(signature))
    }

    data class UnprotectedHeader(val headerAlgorithm: String, private val value: ByteArray) {
        fun toPair() =
            headerAlgorithm to COSEHeaderAlgorithm.cborValueFromString(headerAlgorithm, value)
    }
}

/**
 * elementIdentifier->es.:Name
 * elementValue->es:John*/
data class DocumentX(
    val digestID: Int?,
    val random: ByteArray?,
    val elementIdentifier: String?,
    val elementValue: Any?
) {
    fun toJson(separateElementIdentifier: Boolean) = JSONObject().apply {
        put("digestID", digestID)
        put("random", random?.let {
            Base64.getUrlEncoder().encodeToString(random)
        })
        if (separateElementIdentifier) {
            put("elementIdentifier", elementIdentifier)
            put("elementValue", ElValueToJson(elementValue).elToJson())
        } else {
            if (elementIdentifier != null)
                put(elementIdentifier, ElValueToJson(elementValue).elToJson())
        }
    }
}

