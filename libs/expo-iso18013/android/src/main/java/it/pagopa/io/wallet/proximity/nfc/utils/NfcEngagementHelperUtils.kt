package it.pagopa.io.wallet.proximity.nfc.utils

import android.nfc.NdefMessage
import android.nfc.NdefRecord

internal object NfcEngagementHelperUtils {
    fun calculateStatusMessage(statusCode: Int = 0x00): ByteArray {
        val payload = byteArrayOf(statusCode.toByte())
        val record = NdefRecord(
            NdefRecord.TNF_WELL_KNOWN,
            "Te".toByteArray(),
            null,
            payload
        )
        val arrayOfRecords = arrayOfNulls<NdefRecord>(1)
        arrayOfRecords[0] = record
        val message = NdefMessage(arrayOfRecords)
        return message.toByteArray()
    }

    fun shouldUseGetResponse(resp: ByteArray, max: Int = 256) = resp.size > max
    fun parseLe(apdu: ByteArray): Int {
        // Case GET RESPONSE: Le present
        // If extended and Le=00 -> unlimited
        // Short Le 1 byte; Extended Le 2 bytes;
        return if (apdu.size >= 7 && apdu[4].toInt() == 0) {
            ((apdu[5].toInt() and 0xff) shl 8) or (apdu[6].toInt() and 0xff)
        } else if (apdu.size >= 5) {
            apdu[4].toInt() and 0xff
        } else {
            0
        }
    }
}