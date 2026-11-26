package it.pagopa.io.wallet.cbor

import android.util.Log

object CborLogger {
    var enabled = false
    fun v(tag: String, message: String) {
        if (enabled)
            Log.v(tag, message)
    }

    fun e(tag: String, message: String) {
        if (enabled)
            Log.e(tag, message)
    }

    fun d(tag: String, message: String) {
        if (enabled)
            Log.d(tag, message)
    }

    fun i(tag: String, message: String) {
        if (enabled)
            Log.i(tag, message)
    }
}