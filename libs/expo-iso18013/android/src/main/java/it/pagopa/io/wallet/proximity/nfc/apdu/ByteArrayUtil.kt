package it.pagopa.io.wallet.proximity.nfc.apdu


import kotlinx.io.bytestring.ByteString
import kotlinx.io.bytestring.buildByteString

/**
 * Extension functions for working with [ByteArray] in Kotlin.
 */

/**
 * Reads an Int16 value from the byte array at the specified offset.
 *
 * This function reads two bytes (Int16) from the byte array at the specified `offset` and interprets them as a signed
 * 16-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the Int16 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The Int16 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 1 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getInt16(offset: Int): Short {
    val higher = this[offset].toInt() and 0xFF
    val lower = this[offset + 1].toInt() and 0xFF
    return ((higher shl 8) or lower).toShort()
}

/**
 * Reads an Int16 value from the byte array at the specified offset in little-endian order.
 *
 * This function reads two bytes (Int16) from the byte array at the specified `offset` and interprets them as a signed
 * 16-bit integer using little-endian byte order.
 *
 * @param offset The offset (index) in the byte array from which the Int16 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The Int16 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 1 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getInt16Le(offset: Int): Short {
    val lower = this[offset].toInt() and 0xFF
    val higher = this[offset + 1].toInt() and 0xFF
    return ((higher shl 8) or lower).toShort()
}

/**
 * Reads an Int32 value from the byte array at the specified offset.
 *
 * This function reads four bytes (Int32) from the byte array at the specified `offset` and interprets them as a signed
 * 32-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the Int32 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The Int32 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 3 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getInt32(offset: Int): Int {
    val b1 = this[offset].toInt() and 0xFF
    val b2 = this[offset + 1].toInt() and 0xFF
    val b3 = this[offset + 2].toInt() and 0xFF
    val b4 = this[offset + 3].toInt() and 0xFF
    return (b1 shl 24) or (b2 shl 16) or (b3 shl 8) or b4
}

/**
 * Reads an Int32 value from the byte array at the specified offset in little-endian order.
 *
 * This function reads four bytes (Int32) from the byte array at the specified `offset` and interprets them as a signed
 * 32-bit integer using little-endian byte order.
 *
 * @param offset The offset (index) in the byte array from which the Int32 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The Int32 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 3 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getInt32Le(offset: Int): Int {
    val b1 = this[offset].toInt() and 0xFF
    val b2 = this[offset + 1].toInt() and 0xFF
    val b3 = this[offset + 2].toInt() and 0xFF
    val b4 = this[offset + 3].toInt() and 0xFF
    return (b4 shl 24) or (b3 shl 16) or (b2 shl 8) or b1
}

/**
 * Reads an Int64 value from the byte array at the specified offset.
 *
 * This function reads eight bytes (Int64) from the byte array at thespecified `offset` and interprets them as a signed
 * 64-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the Int64 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The Int64 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 7 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getInt64(offset: Int): Long {
    val b1 = this[offset].toLong() and 0xFF
    val b2 = this[offset + 1].toLong() and 0xFF
    val b3 = this[offset + 2].toLong() and 0xFF
    val b4 = this[offset + 3].toLong() and 0xFF
    val b5 = this[offset + 4].toLong() and 0xFF
    val b6 = this[offset + 5].toLong() and 0xFF
    val b7 = this[offset + 6].toLong() and 0xFF
    val b8 = this[offset + 7].toLong() and 0xFF
    return (b1 shl 56) or (b2 shl 48) or (b3 shl 40) or (b4 shl 32) or (b5 shl 24) or (b6 shl 16) or (b7 shl 8) or b8
}

/**
 * Reads an Int64 value from the byte array at the specified offset in little-endian order.
 *
 * This function reads eight bytes (Int64) from the byte array at the specified `offset` and interprets them as a signed
 * 64-bit integer using little-endian byte order.
 *
 * @param offset The offset (index) in the byte array from which the Int64 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The Int64 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 7 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getInt64Le(offset: Int): Long {
    val b1 = this[offset].toLong() and 0xFF
    val b2 = this[offset + 1].toLong() and 0xFF
    val b3 = this[offset + 2].toLong() and 0xFF
    val b4 = this[offset + 3].toLong() and 0xFF
    val b5 = this[offset + 4].toLong() and 0xFF
    val b6 = this[offset + 5].toLong() and 0xFF
    val b7 = this[offset + 6].toLong() and 0xFF
    val b8 = this[offset + 7].toLong() and 0xFF
    return (b8 shl 56) or (b7 shl 48) or (b6 shl 40) or (b5 shl 32) or (b4 shl 24) or (b3 shl 16) or (b2 shl 8) or b1
}

/**
 * Reads a UInt8 value from the byte array at the specified offset.
 *
 * This function reads a single byte (UInt8) from the byte array at the specified `offset` and interprets it as an
 * unsigned 8-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the UInt8 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The UInt8 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` is negative or greater than or equal to the array's size.
 */
fun ByteArray.getUInt8(offset: Int): UByte {
    return (this[offset].toInt() and 0xFF).toUByte()
}

/**
 * Reads a UInt16 value from the byte array at the specified offset.
 *
 * This function reads two bytes (UInt16) from the byte array at the specified `offset` and interprets them as an
 * unsigned 16-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the UInt16 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The UInt16 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 1 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getUInt16(offset: Int): UShort {
    val higher = this[offset].toInt() and 0xFF
    val lower = this[offset + 1].toInt() and 0xFF
    return ((higher shl 8) or lower).toUShort()
}

/**
 * Reads a UInt16 value from the byte array at the specified offset in little-endian order.
 *
 * This function reads two bytes (UInt16) from the byte array at the specified `offset` and interprets them as an
 * unsigned 16-bit integer using little-endian byte order.
 *
 * @param offset The offset (index) in the byte array from which the UInt16 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The UInt16 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 1 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getUInt16Le(offset: Int): UShort {
    val lower = this[offset].toInt() and 0xFF
    val higher = this[offset + 1].toInt() and 0xFF
    return ((higher shl 8) or lower).toUShort()
}

/**
 * Reads a UInt32 value from the byte array at the specified offset.
 *
 * This function reads four bytes (UInt32) from the byte array at the specified `offset` and interprets them as an
 * unsigned 32-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the UInt32 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The UInt32 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 3 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getUInt32(offset: Int): UInt {
    val b1 = this[offset].toInt() and 0xFF
    val b2 = this[offset + 1].toInt() and 0xFF
    val b3 = this[offset + 2].toInt() and 0xFF
    val b4 = this[offset + 3].toInt() and 0xFF
    return ((b1 shl 24) or (b2 shl 16) or (b3 shl 8) or b4).toUInt()
}

/**
 * Reads a UInt32 value from the byte array at the specified offset in little-endian order.
 *
 * This function reads four bytes (UInt32) from the byte array at the specified `offset` and interprets them as an
 * unsigned 32-bit integer using little-endian byte order.
 *
 * @param offset The offset (index) in the byte array from which the UInt32 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The UInt32 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 3 is negative or greater than or equal to the array's
 *    size.
 */
fun ByteArray.getUInt32Le(offset: Int): UInt {
    val b1 = this[offset].toInt() and 0xFF
    val b2 = this[offset + 1].toInt() and 0xFF
    val b3 = this[offset + 2].toInt() and 0xFF
    val b4 = this[offset + 3].toInt() and 0xFF
    return ((b4 shl 24) or (b3 shl 16) or (b2 shl 8) or b1).toUInt()
}

/**
 * Reads a UInt64 value from the byte array at the specified offset.
 *
 * This function reads eight bytes (UInt64) from the byte array at the specified `offset` and interprets them as an
 * unsigned 64-bit integer.
 *
 * @param offset The offset (index) in the byte array from which the UInt64 value should be read. Must be within the
 *      valid range of the array's indices.
 * @return The UInt64 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 7 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getUInt64(offset: Int): ULong {
    val b1 = this[offset].toLong() and 0xFF
    val b2 = this[offset + 1].toLong() and 0xFF
    val b3 = this[offset + 2].toLong() and 0xFF
    val b4 = this[offset + 3].toLong() and 0xFF
    val b5 = this[offset + 4].toLong() and 0xFF
    val b6 = this[offset + 5].toLong() and 0xFF
    val b7 = this[offset + 6].toLong() and 0xFF
    val b8 = this[offset + 7].toLong() and 0xFF
    return ((b1 shl 56) or (b2 shl 48) or (b3 shl 40) or (b4 shl 32) or (b5 shl 24) or (b6 shl 16) or (b7 shl 8) or b8)
        .toULong()
}

/**
 * Reads a UInt64 value from the byte array at the specified offset in little-endian order.
 *
 * This function reads eight bytes (UInt64) from the byte array at the specified `offset` and interprets them as an
 * unsigned 64-bit integer using little-endian byte order.
 *
 * @param offset The offset (index) in the byte array from which the UInt64 value should be read. Must be within the
 *     valid range of the array's indices.
 * @return The UInt64 value read from the byte array.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `offset` + 7 is negative or greater than or equal to the array's
 *     size.
 */
fun ByteArray.getUInt64Le(offset: Int): ULong {
    val b1 = this[offset].toLong() and 0xFF
    val b2 = this[offset + 1].toLong() and 0xFF
    val b3 = this[offset + 2].toLong() and 0xFF
    val b4 = this[offset + 3].toLong() and 0xFF
    val b5 = this[offset + 4].toLong() and 0xFF
    val b6 = this[offset + 5].toLong() and 0xFF
    val b7 = this[offset + 6].toLong() and 0xFF
    val b8 = this[offset + 7].toLong() and 0xFF
    return ((b8 shl 56) or (b7 shl 48) or (b6 shl 40) or (b5 shl 32) or (b4 shl 24) or (b3 shl 16) or (b2 shl 8) or b1)
        .toULong()
}

/**
 * Extracts a `ByteString` from a portion of the byte array.
 *
 * This function creates a `ByteString` from a specified range of bytes within the `ByteArray`. It allows you to extract
 * a subset of bytes starting at a given `offset` and continuing for `numBytes` in length.
 *
 * @param offset The starting index in the `ByteArray` from which to begin the extraction. Must be a non-negative
 *     integer.
 * @param numBytes The number of bytes to extract, starting from the `offset`. Must be a non-negative integer.
 * @return A `ByteString` containing the extracted bytes. If `numBytes` is 0, an empty `ByteString` is returned.
 *
 * @throws IllegalArgumentException If the `offset` or `numBytes` is negative, or if the requested range
 *     (`offset` + `numBytes`) extends beyond the bounds of the `ByteArray`.
 */
fun ByteArray.getByteString(offset: Int, numBytes: Int): ByteString {
    require(offset >= 0) { "Offset must be non-negative" }
    require(numBytes >= 0) { "Number of bytes must be non-negative" }
    require(offset + numBytes <= size) { "Offset and number of bytes must be within the bounds of the array" }
    return buildByteString { append( this@getByteString.copyOfRange(offset, offset + numBytes)) }
}

/**
 * Decodes a portion of the byte array to a String.
 *
 * This function decodes a specified range of bytes within the byte array to a String, using UTF-8 character encoding.
 * It allows you to convert a subset of bytes starting at a given `offset` and continuing for `numBytes` in length.
 * Invalid characters will be replaced by the Unicode replacement character U+FFFD.
 *
 * @param offset The starting index in the byte array from which to begin decoding. Must be a non-negative integer.
 * @param numBytes The number of bytes to decode, starting from the `offset`. Must be a non-negative integer.
 * @return A String containing the decoded characters. If `numBytes` is 0, an empty String is returned.
 *
 * @throws IndexOutOfBoundsException If the `offset` or `numBytes` is negative, or if the requested range
 *     (`offset` + `numBytes`) extends beyond the bounds of the `ByteArray`.
 */
fun ByteArray.getString(offset: Int, numBytes: Int): String = decodeToString(offset, offset + numBytes, true)

