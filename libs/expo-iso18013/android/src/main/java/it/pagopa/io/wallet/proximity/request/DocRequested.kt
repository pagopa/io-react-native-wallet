package it.pagopa.io.wallet.proximity.request

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class DocRequested(
    val issuerSignedContent: ByteArray,
    val alias: String,
    val docType: String
) : Parcelable
