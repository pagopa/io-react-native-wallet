@file:JvmMultifileClass

package it.pagopa.io.wallet.proximity.request

import android.os.Parcelable
import com.upokecenter.cbor.CBORObject
import it.pagopa.io.wallet.cbor.parser.CBorParser
import kotlinx.parcelize.IgnoredOnParcel
import kotlinx.parcelize.Parcelize
import org.json.JSONObject
import java.math.BigInteger

@Parcelize
internal data class RequestWrapper(
    private val cborByte: ByteArray,
    val isAuthenticated: Boolean = false,
    val certSerialNumber: BigInteger?,
    val issuerRdnMap: Map<String, String>?,
) : Parcelable {
    @IgnoredOnParcel
    var requiredFields: CBORObject? = null

    @IgnoredOnParcel
    var docTypeCbor: String? = null

    fun prepare() = apply {
        val cbor = CBORObject.DecodeFromBytes(cborByte)
        docTypeCbor = cbor.get("docType")?.AsString()
        requiredFields = cbor.get("nameSpaces")
    }

    fun toJson(): JSONObject? {
        if (requiredFields == null) return null
        return CBorParser(requiredFields!!.EncodeToBytes()).toJson()?.let {
            JSONObject().apply {
                put("docType", docTypeCbor)
                put("values", JSONObject(it))
                put("isAuthenticated", isAuthenticated)
                certSerialNumber?.let { serial ->
                    put("certificateSerial", serial.toString())
                }
                issuerRdnMap?.let { map ->
                    put("issuerRdnMap", JSONObject(map))
                }
            }
        }
    }

    override fun toString(): String {
        return this.requiredFields.toString()
    }
}
