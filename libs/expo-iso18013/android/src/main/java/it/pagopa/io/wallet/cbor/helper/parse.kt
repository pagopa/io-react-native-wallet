package it.pagopa.io.wallet.cbor.helper

import com.upokecenter.cbor.CBORObject
import com.upokecenter.cbor.CBORType
import it.pagopa.io.wallet.cbor.extensions.asNameSpacedData
import it.pagopa.io.wallet.cbor.model.DeviceAuth
import it.pagopa.io.wallet.cbor.model.DeviceSigned
import it.pagopa.io.wallet.cbor.model.Document
import it.pagopa.io.wallet.cbor.model.DocumentX
import it.pagopa.io.wallet.cbor.model.IssuerAuth
import it.pagopa.io.wallet.cbor.model.IssuerSigned
import it.pagopa.io.wallet.cbor.model.ModelMDoc
import java.util.Base64

internal fun CBORObject.parse(): Any? {
    if (isNull) return null
    if (isTrue) return true
    if (isFalse) return false

    return when (this.type) {
        CBORType.Boolean, CBORType.SimpleValue -> isTrue
        CBORType.ByteString -> Base64.getUrlEncoder().encodeToString(GetByteString())
        CBORType.TextString -> AsString()
        CBORType.Array -> values.map { it.parse() }.toList()
        CBORType.Map -> keys.associate { it.parse() to this[it].parse() }
        CBORType.Number, CBORType.Integer -> when {
            CanValueFitInInt32() -> ToObject(Int::class.java)
            CanValueFitInInt64() -> ToObject(Long::class.java)
            else -> ToObject(Double::class.java)
        }

        CBORType.FloatingPoint -> ToObject(Float::class.java)
        else -> null
    }
}

private fun CBORObject?.parseNameSpaces() = this?.let { cbor ->
    val map = mutableMapOf<String, Any>()
    cbor.keys?.forEach { key ->
        map[key?.AsString() ?: ""] = cbor.get(key)
    }
    map
}

private fun Collection<CBORObject>?.parseNameSpaces(nameSpaces: CBORObject?) = this?.let { keys ->
    val mNameSpaces =
        mutableMapOf<String, List<DocumentX>>()
    keys
        .distinct()
        .forEach { key ->
            val mList = mutableListOf<DocumentX>()
            nameSpaces?.get(key)?.values?.forEach {
                val value =
                    CBORObject.DecodeFromBytes(it.GetByteString())
                mList.add(
                    DocumentX(
                        digestID = value.get("digestID")
                            ?.AsInt32(),
                        random = value.get("random")
                            ?.GetByteString(),
                        elementIdentifier = value.get("elementIdentifier")
                            ?.AsString(),
                        elementValue = value.get("elementValue")
                            ?.parse()
                    )
                )
            }
            mNameSpaces[key.AsString()] = mList
        }
    mNameSpaces
}

internal fun CBORObject?.parseIssuerSigned(): IssuerSigned? {
    if(this==null) return null
    val nameSpaces = this.get("nameSpaces")
    val nameSpacesKeys = nameSpaces?.keys
    val data = nameSpaces?.asNameSpacedData()
    return IssuerSigned(
        nameSpaces = nameSpacesKeys.parseNameSpaces(nameSpaces),
        nameSpacedData = if (data?.nameSpaceNames != null) {
            data.nameSpaceNames.associateWith { nameSpace ->
                data.getDataElementNames(nameSpace)
                    .associateWith { elementIdentifier ->
                        data.getDataElement(nameSpace, elementIdentifier)
                    }
            }
        } else {
            mapOf<String, Map<String, ByteArray>>()
        },
        rawValue = this.EncodeToBytes(),
        issuerAuth = IssuerAuth(this.get("issuerAuth")?.EncodeToBytes()),
    )
}

internal fun CBORObject.oneDocument(): Document {
    val issuerSigned = this.get("issuerSigned")
    val deviceSigned = this.get("deviceSigned")
    val mDeviceSigned = if (deviceSigned != null) {
        val deviceAuth = deviceSigned.get("deviceAuth")
        val deviceSignature = try {
            Base64.getUrlEncoder()
                .encodeToString(deviceAuth.get("deviceSignature")?.EncodeToBytes())
        } catch (_: Exception) {
            null
        }
        DeviceSigned(
            deviceAuth = DeviceAuth(deviceSignature = deviceSignature),
            nameSpaces = try {
                deviceSigned.get("nameSpaces")?.parseNameSpaces()
            } catch (_: Exception) {
                null
            }
        )
    } else
        null
    return Document(
        deviceSigned = mDeviceSigned,
        docType = this.get("docType")?.AsString(),
        issuerSigned = issuerSigned.parseIssuerSigned(),
        rawValue = this.EncodeToBytes()
    )
}

internal fun CBORObject.toModelMDoc(): ModelMDoc {
    fun isSingleDoc(): Boolean = this.get("docType") != null

    return if (isSingleDoc()) {
        ModelMDoc(
            documents = listOf(
                this.oneDocument()
            ),
            status = null,
            version = null
        )
    } else {
        ModelMDoc(
            version = this.get("version")?.AsString(),
            status = this.get("status")?.AsInt32(),
            documents = this.get("documents")?.values
                ?.map { doc ->
                    doc.oneDocument()
                }
        )
    }
}