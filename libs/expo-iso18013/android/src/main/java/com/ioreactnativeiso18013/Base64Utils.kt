package com.ioreactnativeiso18013

import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

/**
 * This singleton class contains a set of utilities for encoding and decoding base64 and base64url
 * strings. Some functions are simple wrappers in order to share it between modules and having a
 * centralized class in case we'd like to change the underlying implementation.
 * Currently it is based on [kotlin.io.encoding.Base64].
 */
object Base64Utils {
  @OptIn(ExperimentalEncodingApi::class)
  fun decodeBase64AndBase64Url(base: String): ByteArray {
    return try {
      /*
      * Try to decode it as base64url and return it
      * We set the padding as optional as  RFC 4648 section 5 says
      * The pad character "=" is typically percent-encoded when used in an
      * URI [9], but if the data length is known implicitly, this can be
      *  avoided by skipping the padding; see section 3.2
      */
      return Base64.UrlSafe.withPadding(Base64.PaddingOption.PRESENT_OPTIONAL).decode(base)
    } catch (_: IllegalArgumentException) {
      // Not base64url, it might be base64 or an invalid string
      try {
        // Try standard Base64 decoding and return it
        Base64.Default.decode(base)
      } catch (e: IllegalArgumentException) {
        throw IllegalArgumentException("Input is not valid Base64 or Base64URL", e)
      }
    }
  }

  /**
   * Wrapper method which encodes a ByteArray in a base64 string.
   * This allows to change the underlying implementation here without changing it in the whole project.
   * @param buffer - The ByteArray to be converted
   * @returns A base64 encoded string representing the buffer
   */
  @OptIn(ExperimentalEncodingApi::class)
  fun encodeBase64(buffer: ByteArray): String {
    return Base64.Default.encode(buffer)
  }

  /**
   * Wrapper method which decodes a ByteArray in a base64 string.
   * This allows to change the underlying implementation here without changing it in the whole project.
   * @param buffer - The string to be converted
   * @returns A buffer representing the base64 string
   */
  @OptIn(ExperimentalEncodingApi::class)
  fun decodeBase64(base64: String): ByteArray {
    return Base64.Default.decode(base64)
  }
}
