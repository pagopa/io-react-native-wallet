package it.pagopa.io.wallet.cbor.exception

class DocTypeNotValid(docType: String?) : Exception("DocType not valid: $docType")