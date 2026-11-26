//
//  HexDump.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 14/11/25.
//
//SOURCE: https://gist.github.com/achansonjr/8d0f3066bb2c4aabf1f96711d4d64015 with edits to suits my needs

import Foundation
class HexDump {
    /// Split a sequence into equal-size chunks and process each chunk.
    ///
    /// Each chunk will have the specified number of elements, except for the last chunk,
    /// which will be as long as necessary for the remainder of the data.
    ///
    /// - parameters:
    ///    - sequence: Sequence of data elements.
    ///    - perChunkCount: Number of elements in each chunk.
    ///    - processChunk: Function that takes an offset into the data and array of data elements.
    static func forEachChunkOfSequence<S : Sequence>(sequence: S, perChunkCount: Int, processChunk: (Int, [S.Iterator.Element]) -> ())
    {
        var offset = 0
        var chunk = Array<S.Iterator.Element>()
        for element in sequence {
            chunk.append(element)
            if chunk.count == perChunkCount {
                processChunk(offset, chunk)
                chunk.removeAll()
                offset += perChunkCount
            }
        }
        if chunk.count > 0 {
            processChunk(offset, chunk)
        }
    }
    
    /// Get hex representation of a byte.
    ///
    /// - parameter byte: A `UInt8` value.
    ///
    /// - returns: A two-character `String` of hex digits, with leading zero if necessary.
    
    static func hexStringForByte(byte: UInt8) -> String {
        return String(format: "%02x", UInt(byte))
    }
    
    /// Get hex representation of an array of bytes.
    ///
    /// - parameter bytes: A sequence of `UInt8` values.
    ///
    /// - returns: A `String` of hex codes separated by spaces.
    
    static func hexStringForBytes<S: Sequence>(bytes: S) -> String where S.Iterator.Element == UInt8
    {
        return bytes.lazy.map(hexStringForByte).joined(separator: " ")
    }
    
    /// Get printable representation of character.
    ///
    /// - parameter byte: A `UInt8` value.
    ///
    /// - returns: A one-character `String` containing the printable representation, or "." if it is not printable.
    
    static func printableCharacterForByte(byte: UInt8) -> String {
        let c = Character(UnicodeScalar(byte))
        
        return c.isLetter || c.isNumber || c.isSymbol ? String(c) : "."
    }
    
    /// Get printable representation of an array of characters.
    ///
    /// - parameter bytes: A sequence of `UInt8` values.
    ///
    /// - returns: A `String` of characters containing the printable representations of the input bytes.
    static func printableTextForBytes<S: Sequence>(
        bytes: S
    ) -> String where S.Iterator.Element == UInt8
    {
        return bytes.lazy.map(printableCharacterForByte).joined(separator: "")
    }
    
    /// Count of bytes printed per row in a hex dump.
    static let HexBytesPerRow = 16
    
    /// Generate hex-dump output line for a row of data.
    ///
    /// Each line is a string consisting of an offset, hex representation
    /// of the bytes, and printable ASCII representation.  There is no
    /// end-of-line character included.
    ///
    /// - parameters:
    ///    - offset: Numeric offset into the input data sequence.
    ///    - bytes: Sequence of `UInt8` values to be hex-dumped for this line.
    ///
    /// - returns: A `String` with the format described above.
    static func hexDumpLineForOffset<S: Sequence>(
        offset: Int,
        bytes: S
    ) -> String where S.Iterator.Element == UInt8
    {
        let hex = hexStringForBytes(bytes: bytes)
        
        let printable = printableTextForBytes(bytes: bytes)
        
        let paddedHex = hex + String(repeating: " ", count: 47 - hex.count)
        
        return String(format: "%08x  %@  %@", offset, paddedHex, printable)
    }
    
    /// Given a sequence of bytes, generate a series of hex-dump lines.
    ///
    /// - parameters:
    ///    - bytes: Sequence of `UInt8` values to be hex-dumped.
    ///    - processLine: Function to be invoked for each generated line.
    static func forEachHexDumpLineForBytes<S: Sequence>( bytes: S, processLine: @escaping (String) -> ()) where S.Iterator.Element == UInt8
    {
        forEachChunkOfSequence(sequence: bytes, perChunkCount: HexBytesPerRow) { offset, chunk in
            let line = hexDumpLineForOffset(offset: offset, bytes: chunk)
            processLine(line)
        }
    }
    
    /// Dump a sequence of bytes to a `String`.
    ///
    /// - parameter bytes: Sequence of `UInt8` values to be hex-dumped.
    ///
    /// - returns: A `String`, which may contain newlines.
    public static func hexDumpStringForBytes<S: Sequence>(bytes: S) -> String where S.Iterator.Element == UInt8
    {
        var s = ""
        forEachHexDumpLineForBytes(bytes: bytes) { s += $0 + "\n" }
        return s
    }
    
}
