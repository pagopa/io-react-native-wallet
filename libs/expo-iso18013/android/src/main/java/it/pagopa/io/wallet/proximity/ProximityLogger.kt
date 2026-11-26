package it.pagopa.io.wallet.proximity

import android.util.Log
import com.android.identity.cbor.Cbor
import com.android.identity.cbor.DiagnosticOption
import com.android.identity.util.toHex
import it.pagopa.io.wallet.proximity.nfc.apdu.Utils

enum class KindOfLog {
    V, E, D, I, HEX, CBOR
}

object ProximityLogger {
    var enabled = false
    var filterLogs = KindOfLog.entries.toTypedArray()
    fun v(tag: String, message: String) {
        if (enabled && filterLogs.contains(KindOfLog.V))
            Log.v(tag, message)
    }

    fun e(tag: String, message: String) {
        if (enabled && filterLogs.contains(KindOfLog.E))
            Log.e(tag, message)
    }

    fun d(tag: String, message: String) {
        if (enabled && filterLogs.contains(KindOfLog.D))
            Log.d(tag, message)
    }

    fun i(tag: String, message: String) {
        if (enabled && filterLogs.contains(KindOfLog.I))
            Log.i(tag, message)
    }

    private fun cbor(message: String, encodedCbor: ByteArray): String {
        val sb = "$message: ${encodedCbor.size} bytes of CBOR: " + encodedCbor.toHex() +
                "\n" +
                "In diagnostic notation:\n" +
                Cbor.toDiagnostics(
                    encodedCbor,
                    setOf(DiagnosticOption.PRETTY_PRINT, DiagnosticOption.EMBEDDED_CBOR)
                )
        return sb
    }

    fun dHex(tag: String, message: String, bytes: ByteArray) {
        if (enabled && filterLogs.contains(KindOfLog.HEX))
            Log.d(tag, "$message: ${Utils.bytesToHex(bytes)}")
    }

    fun dCbor(tag: String, message: String, encodedCbor: ByteArray) {
        if (enabled && filterLogs.contains(KindOfLog.CBOR)) {
            Log.d(tag, cbor(message, encodedCbor))
        }
    }
}