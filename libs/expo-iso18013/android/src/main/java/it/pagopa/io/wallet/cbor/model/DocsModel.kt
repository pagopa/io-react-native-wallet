package it.pagopa.io.wallet.cbor.model

import it.pagopa.io.wallet.cbor.CborLogger
import kotlinx.serialization.Serializable
import org.json.JSONArray
import org.json.JSONObject

@Serializable
data class DocsModel(
    val docList: List<DocModel>?,
    var status: Int?,
    var version: String?
) {
    companion object {
        fun fromJson(json: JSONObject): DocsModel {
            val array = try {
                json.optJSONArray("documents") ?: JSONArray(json.getString("documents"))
            } catch (e: Exception) {
                CborLogger.e("EXCEPTION PARSING", e.message.orEmpty())
                null
            }
            return DocsModel(
                DocModel.fromJsonArray(array),
                json.optInt("status"),
                json.optString("version")
            )
        }
    }

    fun toJson() = JSONObject().apply {
        put("documents", JSONArray().apply {
            this@DocsModel.docList?.forEach { doc ->
                this.put(doc.toJson())
            }
        })
    }
}

@Serializable
data class DocModel(val docType: String?, val issuerSigned: DocIssuerSigned?) {
    companion object {
        fun fromJsonArray(jsonArray: JSONArray?): List<DocModel> {
            val backList = ArrayList<DocModel>()
            if (jsonArray != null)
                for (i in 0 until jsonArray.length()) {
                    backList.add(
                        DocModel(
                            jsonArray.optJSONObject(i)?.optString("docType"),
                            DocIssuerSigned.fromJson(
                                jsonArray.optJSONObject(i)?.optJSONObject("issuerSigned")
                            )
                        )
                    )
                }
            return backList.toList()
        }
    }

    fun toJson() = JSONObject().apply {
        put("docType", this@DocModel.docType)
        put("issuerSigned", this@DocModel.issuerSigned?.toJson())
    }
}

@Serializable
data class DocIssuerSigned(val issuerAuth: String?, val nameSpaces: String?) {
    companion object {
        fun fromJson(json: JSONObject?): DocIssuerSigned? {
            if (json == null) return null
            return DocIssuerSigned(
                json.optJSONObject("issuerAuth")?.toString(),
                json.optJSONObject("nameSpaces")?.toString()
            )
        }
    }

    fun toJson() = JSONObject().apply {
        if (this@DocIssuerSigned.issuerAuth == null)
            put("issuerAuth", null)
        else {
            put("issuerAuth", JSONObject(this@DocIssuerSigned.issuerAuth))
        }
        if (this@DocIssuerSigned.nameSpaces == null)
            put("nameSpaces", null)
        else {
            val obj = JSONObject(this@DocIssuerSigned.nameSpaces)
            put("nameSpaces", obj)
        }
    }
}