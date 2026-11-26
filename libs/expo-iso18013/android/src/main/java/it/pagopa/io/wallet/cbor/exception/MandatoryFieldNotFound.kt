package it.pagopa.io.wallet.cbor.exception

class MandatoryFieldNotFound(fields: List<String>) : Exception("Mandatory fields not found: ${fields.joinToString(separator = ", ") { it }}")