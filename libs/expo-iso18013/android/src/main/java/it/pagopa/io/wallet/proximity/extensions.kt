package it.pagopa.io.wallet.proximity

import org.json.JSONObject

internal fun Array<JSONObject?>.toRequest(): JSONObject {
    val jsonToSend = JSONObject()
    this.forEach {
        if (it != null) {
            val start = it.getJSONObject("values")
            val docType = it.getString("docType")
            if (!jsonToSend.has("request")) {
                jsonToSend.put("request", JSONObject().apply {
                    put(docType, start)
                })
                jsonToSend
                    .getJSONObject("request")
                    .getJSONObject(docType)
                    .put("isAuthenticated", it.getBoolean("isAuthenticated"))
                jsonToSend
                    .getJSONObject("request")
                    .getJSONObject(docType)
                    .put("certificateData", it.optJSONObject("issuerRdnMap"))
            } else {
                jsonToSend
                    .getJSONObject("request")
                    .put(docType, start)
                jsonToSend.getJSONObject("request")
                    .getJSONObject(docType)
                    .put("isAuthenticated", it.getBoolean("isAuthenticated"))
                jsonToSend
                    .getJSONObject("request")
                    .getJSONObject(docType)
                    .put("certificateData", it.optJSONObject("issuerRdnMap"))
            }
        }
    }
    return jsonToSend
}
