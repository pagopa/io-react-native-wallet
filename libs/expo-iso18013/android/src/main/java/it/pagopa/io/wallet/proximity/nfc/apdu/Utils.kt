package it.pagopa.io.wallet.proximity.nfc.apdu

import androidx.annotation.VisibleForTesting
import java.security.SecureRandom
import kotlin.math.sign

object Utils {
    fun hexStringToByteArray(s: String): ByteArray {
        return hexToByte(s)
    }

    fun intToByteArray(value: Int): ByteArray {
        return byteArrayOf(value.ushr(8).toByte(), value.toByte())
    }

    private fun hexToByte(ch: Char): Int {
        if (ch in '0'..'9') return ch.code - '0'.code
        if (ch in 'A'..'F') return ch.code - 'A'.code + 10
        return if (ch in 'a'..'f') ch.code - 'a'.code + 10 else -1
    }

    fun getRandomByte(numByte: Int): ByteArray {
        val random = SecureRandom()
        return random.generateSeed(numByte)
    }

    /**
     *
     * @param array
     * @param num
     * @return
     * @throws Exception
     */
    @Throws(Exception::class)
    fun getRight(array: ByteArray, num: Int): ByteArray {
        if (num > array.size)
            return array.clone()
        val data = ByteArray(num)
        System.arraycopy(array, array.size - num, data, 0, num)
        return data
    }

    private fun hexToByte(hexString: String): ByteArray {
        val byteArray = ByteArray(hexString.length / 2)
        var i = 0
        while (i < hexString.length) {
            byteArray[i / 2] = (hexToByte(hexString[i]) * 16 + hexToByte(hexString[i + 1])).toByte()
            i += 2
        }
        return byteArray
    }

    @Throws(Exception::class)
    fun getSub(array: ByteArray, start: Int): ByteArray {
        val data = ByteArray(array.size - start)
        System.arraycopy(array, start, data, 0, data.size)
        return data
    }

    fun getSub(array: ByteArray, start: Int, num: Int): ByteArray {
        var numHere = num
        if (sign(num.toFloat()) < 0) numHere = num and 0xff
        val data = ByteArray(numHere)
        System.arraycopy(array, start, data, 0, data.size)
        return data
    }

    fun appendByteArray(a: ByteArray, b: ByteArray): ByteArray {
        val c = ByteArray(a.size + b.size)
        a.copyInto(c)
        b.copyInto(c, a.size, 0, b.size)
        return c
    }

    fun appendByte(a: ByteArray, b: Byte): ByteArray {
        val c = ByteArray(a.size + 1)
        a.copyInto(c)
        c[a.size] = b
        return c
    }

    fun bytesToString(bytes: ByteArray): String {
        return bytesToHex(bytes)
    }

    private val byteToHexTable = arrayOf(
        "00",
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "0A",
        "0B",
        "0C",
        "0D",
        "0E",
        "0F",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "1A",
        "1B",
        "1C",
        "1D",
        "1E",
        "1F",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "2A",
        "2B",
        "2C",
        "2D",
        "2E",
        "2F",
        "30",
        "31",
        "32",
        "33",
        "34",
        "35",
        "36",
        "37",
        "38",
        "39",
        "3A",
        "3B",
        "3C",
        "3D",
        "3E",
        "3F",
        "40",
        "41",
        "42",
        "43",
        "44",
        "45",
        "46",
        "47",
        "48",
        "49",
        "4A",
        "4B",
        "4C",
        "4D",
        "4E",
        "4F",
        "50",
        "51",
        "52",
        "53",
        "54",
        "55",
        "56",
        "57",
        "58",
        "59",
        "5A",
        "5B",
        "5C",
        "5D",
        "5E",
        "5F",
        "60",
        "61",
        "62",
        "63",
        "64",
        "65",
        "66",
        "67",
        "68",
        "69",
        "6A",
        "6B",
        "6C",
        "6D",
        "6E",
        "6F",
        "70",
        "71",
        "72",
        "73",
        "74",
        "75",
        "76",
        "77",
        "78",
        "79",
        "7A",
        "7B",
        "7C",
        "7D",
        "7E",
        "7F",
        "80",
        "81",
        "82",
        "83",
        "84",
        "85",
        "86",
        "87",
        "88",
        "89",
        "8A",
        "8B",
        "8C",
        "8D",
        "8E",
        "8F",
        "90",
        "91",
        "92",
        "93",
        "94",
        "95",
        "96",
        "97",
        "98",
        "99",
        "9A",
        "9B",
        "9C",
        "9D",
        "9E",
        "9F",
        "A0",
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "A7",
        "A8",
        "A9",
        "AA",
        "AB",
        "AC",
        "AD",
        "AE",
        "AF",
        "B0",
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "B6",
        "B7",
        "B8",
        "B9",
        "BA",
        "BB",
        "BC",
        "BD",
        "BE",
        "BF",
        "C0",
        "C1",
        "C2",
        "C3",
        "C4",
        "C5",
        "C6",
        "C7",
        "C8",
        "C9",
        "CA",
        "CB",
        "CC",
        "CD",
        "CE",
        "CF",
        "D0",
        "D1",
        "D2",
        "D3",
        "D4",
        "D5",
        "D6",
        "D7",
        "D8",
        "D9",
        "DA",
        "DB",
        "DC",
        "DD",
        "DE",
        "DF",
        "E0",
        "E1",
        "E2",
        "E3",
        "E4",
        "E5",
        "E6",
        "E7",
        "E8",
        "E9",
        "EA",
        "EB",
        "EC",
        "ED",
        "EE",
        "EF",
        "F0",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "FA",
        "FB",
        "FC",
        "FD",
        "FE",
        "FF"
    )

    fun bytesToHex(bytes: ByteArray): String {
        val sb = StringBuilder(bytes.size * 2)
        for (aByte in bytes) {
            sb.append(byteToHexTable[aByte.toInt() and 0xFF])
        }
        return sb.toString()
    }

    fun toUint(dataB: ByteArray?): Int {
        if (dataB == null) return 0
        var `val` = +0
        for (b in dataB) {
            `val` = `val` shl 8 or b.toInt()
        }
        return `val`
    }

    fun byteCompare(a: Int, b: Int): Int {
        return a.compareTo(b)
    }

    fun getLeft(array: ByteArray, num: Int): ByteArray {
        if (num > array.size) return array
        val data = ByteArray(num)
        array.copyInto(data, 0, 0, num)
        return data
    }

    fun asn1Tag(array: ByteArray, tag: Int): ByteArray {
        val tagInside: ByteArray = tagToByte(tag) //1
        val len: ByteArray = lenToBytes(array.size) //2
        val data = ByteArray(tagInside.size + len.size + array.size) //131
        tagInside.copyInto(data, 0, 0, tagInside.size)
        len.copyInto(data, tagInside.size, 0, len.size)
        array.copyInto(data, tagInside.size + len.size, 0, array.size)
        return data
    }

    @VisibleForTesting
    fun tagToByte(value: Int): ByteArray {
        return if (value <= 0xff) {
            byteArrayOf((value and 0xFF).toByte())
        } else if (value <= 0xffff) {
            byteArrayOf((value shr 8).toByte(), (value and 0xff).toByte())
        } else if (value <= 0xffffff) {
            byteArrayOf(
                (value shr 16).toByte(),
                (value shr 8 and 0xff).toByte(),
                (value and 0xff).toByte()
            )
        } else
            byteArrayOf()
    }

    @VisibleForTesting
    fun lenToBytes(value: Int): ByteArray {
        if (value < 0x80)
            return byteArrayOf(value.toByte())
        return if (value <= 0xff) {
            byteArrayOf(0x81.toByte(), value.toByte())
        } else if (value <= 0xffff) {
            byteArrayOf(0x82.toByte(), (value shr 8).toByte(), (value and 0xff).toByte())
        } else if (value <= 0xffffff) {
            byteArrayOf(
                0x83.toByte(),
                (value shr 16).toByte(),
                (value shr 8 and 0xff).toByte(),
                (value and 0xff).toByte()
            )
        } else
            byteArrayOf()
    }

    /**
     * ISO kind padding
     * @param data original array
     * @return the padding array
     * @throws Exception
     */
    @Throws(Exception::class)
    fun getIsoPad(data: ByteArray): ByteArray {
        val padLen: Int = if (data.size and 0x7 == 0)
            data.size + 8
        else
            data.size - (data.size and 0x7) + 0x08
        val padData = ByteArray(padLen)
        System.arraycopy(data, 0, padData, 0, data.size)
        padData[data.size] = 0x80.toByte()
        for (i in data.size + 1 until padData.size)
            padData[i] = 0
        return padData
    }

    /**
     * it compares two byte arrays
     * @param a first array
     * @param b second array
     * @return true if are equals
     */
    fun byteArrayCompare(a: ByteArray, b: ByteArray): Boolean {
        var equals = true
        if (a.size == b.size) {
            for (i in a.indices)
                if (byteCompare(a[i], b[i])) {
                    equals = false
                    break
                }
        }
        return equals
    }

    fun byteCompare(a: Byte, b: Byte): Boolean {
        return a.compareTo(b) == 0
    }

    /**
     * converte un byte in intero
     * @param b il byte da convertire
     * @return l'intero senza segno
     * @throws Exception
     */
    @Throws(Exception::class)
    fun unsignedToBytes(b: Byte): Int {
        return b.toInt() and 0xFF
    }

    /**
     * converte  un intero in byte
     * @param b l'intero in input
     * @return il byte senza segno
     * @throws Exception
     */
    @Throws(Exception::class)
    fun unsignedToBytes(b: Int): Byte {
        return (b and 0xFF).toByte()
    }

    @Throws(Exception::class)
    @JvmOverloads
    fun increment(array: ByteArray, index: Int = array.size - 1) {
        if (array[index].compareTo(0xff.toByte()) == 0) { //Byte.MAX_VALUE) {
            array[index] = 0x00//Byte.MIN_VALUE;
            increment(array, index - 1)
        } else {
            array[index] = (array[index] + 1).toByte()
        }
    }

    @Throws(Exception::class)
    fun isoRemove(data: ByteArray): ByteArray {
        var i: Int = data.size - 1
        while (i >= 0) {
            if (data[i] == 0x80.toByte())
                break
            if (data[i].toInt() != 0x00)
                throw Exception("Padding ISO non presente")
            i--
        }
        return getLeft(data, i)
    }
}