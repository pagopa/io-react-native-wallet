package it.pagopa.io.wallet.cbor.parser

import androidx.annotation.VisibleForTesting
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * class to convert an [Any] elementValue into a valid JSON value
 * [elementValue] could be a primitive or a JSON OBJECT or a JSON ARRAY,
 * that's why we need this converter*/
internal class ElValueToJson(private val elementValue: Any?) {
    @VisibleForTesting
    var forceScraping = false
    private fun convertToValidJson(elementValue: String): Any {
        // Check if the input is already valid JSON (object or array)
        try {
            return JSONObject(elementValue)
        } catch (_: JSONException) {
            // Not valid JSON object, try JSON array
            try {
                return JSONArray(elementValue)
            } catch (_: JSONException) {
                // Not valid JSON, proceed with custom conversion
            }
        }

        // Check for array-like structure
        if (elementValue.startsWith("[") && elementValue.endsWith("]")) {
            val array = JSONArray()
            val content = elementValue.trim().removePrefix("[").removeSuffix("]").trim()
            if (content.isNotEmpty()) {
                val items = content.split("},")
                for (item in items) {
                    val correctedItem = if (!item.endsWith("}")) "${item}}" else item
                    array.put(convertObjectToJson(correctedItem))
                }
            }
            return array
        }
        return convertObjectToJson(elementValue)
    }

    fun convertObjectToJson(elementValue: String): JSONObject {
        // Remove the outer curly braces and split into key-value pairs
        val content = elementValue.trim().removePrefix("{").removeSuffix("}").trim()
        if (content.isEmpty()) {
            return JSONObject()
        }

        val keyValuePairs = content.split(",")

        // Build the JSON structure
        val jsonObject = JSONObject()
        for (pair in keyValuePairs) {
            val parts = pair.trim().split("=")
            if (parts.size == 2) {
                val key = parts[0].trim()
                val value = parts[1].trim()
                jsonObject.put(key, value)
            }
        }

        return jsonObject
    }

    /**
     * parses all known types by [it.pagopa.io.wallet.cbor.helper.parse]
     * */
    private fun Any?.toJSON(): Any? {
        if (this == null) return null
        return when (this) {
            is Boolean, is String, is Number -> this
            is Map<*, *> -> {
                val obj = JSONObject()
                this.keys.forEach { key ->
                    obj.put(key.toString(), this[key].toJSON())
                }
                obj
            }

            is List<Any?> -> {
                val array = JSONArray()
                this.forEach {
                    array.put(it.toJSON())
                }
                array
            }

            else -> null
        }
    }

    private fun Any?.scrape(): Any? {
        return try {
            JSONObject(this.toString())
        } catch (_: Exception) {
            // not a JSONObject, trying JSON ARRAY
            try {
                JSONArray(this.toString())
            } catch (_: Exception) {
                // If is not a jsonObject or array, try to transform if it is an elementValue
                if (this.toString().contains("=") && this.toString()
                        .contains("{") && this.toString().contains("}") ||
                    this.toString().contains("=") && this.toString()
                        .contains("[") && this.toString().contains("]")
                )
                    convertToValidJson(this.toString())
                else
                    this
            }
        }
    }

    /**
     * First of all we will try to parse known types by [it.pagopa.io.wallet.cbor.helper.parse] method with [toJSON] method,
     * in Failure case we will try a scraping to have a valid elementValue.
     * Normally the algorithm should end without entering into run block for each element value.
     * */
    private fun Any?.elementValueToJson(): Any? {
        if (this == null) return null
        if (forceScraping) return this.scrape()
        this.toJSON()?.let {
            return it
        } ?: run {
            return this.scrape()
        }
    }

    fun elToJson() = elementValue.elementValueToJson()
}