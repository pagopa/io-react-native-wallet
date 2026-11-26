package it.pagopa.io.wallet.proximity.nfc

import android.os.Build
import it.pagopa.io.wallet.proximity.ProximityLogger
import it.pagopa.io.wallet.proximity.retrieval.DeviceRetrievalMethod
import java.util.Locale

/**
 * NFC Retrieval Method for ISO 18013-5 data transfer.
 *
 * @property commandDataFieldMaxLength max APDU command data the reader may send us.
 *   We advertise this in the NFC handover; the reader should respect it.
 *   Set high because **we** don't control what the reader sends.
 * @property responseDataFieldMaxLength max chunk size we use when responding
 *   (ENVELOPE first response + every GET RESPONSE chunk).
 *   Must be safe for the local NFC controller / Android NFC stack.
 */
data class NfcRetrievalMethod(
    val commandDataFieldMaxLength: Long = MAX_COMMAND_DATA_FIELD_LENGTH,
    val responseDataFieldMaxLength: Long = suggestedResponseDataFieldLength
) : DeviceRetrievalMethod

/**
 * The command field length is determined by the reader, not by us.
 * We advertise a generous value so we don't artificially limit incoming ENVELOPEs.
 */
private const val MAX_COMMAND_DATA_FIELD_LENGTH = 65535L

/**
 * Heuristic response-data-field length, chosen conservatively per device.
 *
 * The value is the max **single APDU response payload** that [android.nfc.cardemulation.HostApduService.sendResponseApdu]
 * can reliably push through the local NFC controller.  Larger responses are
 * automatically chunked via GET RESPONSE (SW 61xx), so being conservative
 * only costs extra round-trips — being too aggressive kills the HCE service.
 *
 * Evaluated once (lazy) and cached for the lifetime of the process.
 */
val suggestedResponseDataFieldLength: Long by lazy {

    val manufacturer = Build.MANUFACTURER.lowercase(Locale.ROOT)
    val model = Build.MODEL.lowercase(Locale.ROOT)
    val sdk = Build.VERSION.SDK_INT

    ProximityLogger.i(TAG, "model=$model  manufacturer=$manufacturer  sdk=$sdk")

    val value = when {

        // ── SDK < 21 — non supporta HCE in modo affidabile ────────────────
        sdk < Build.VERSION_CODES.LOLLIPOP -> TIER_LEGACY

        // ── Google ─────────────────────────────────────────────────────────
        manufacturer == "google" -> googlePixelLength(model, sdk)

        // ── Samsung ────────────────────────────────────────────────────────
        manufacturer.contains("samsung") -> samsungLength(model, sdk)

        // ── Huawei (pre-split, MANUFACTURER = "huawei") ────────────────────
        manufacturer.contains("huawei") -> huaweiLength(sdk)

        // ── Honor (post-split, MANUFACTURER = "honor") ─────────────────────
        manufacturer.contains("honor") ->
            if (sdk >= Build.VERSION_CODES.Q) TIER_STANDARD else TIER_LOW

        // ── Xiaomi / Redmi / POCO ──────────────────────────────────────────
        manufacturer.contains("xiaomi") ->
            if (sdk >= Build.VERSION_CODES.O) TIER_STANDARD else TIER_LOW

        // ── OPPO / OnePlus / Realme (BBK group, stessi controller NFC) ─────
        manufacturer.contains("oppo") ||
                manufacturer.contains("oneplus") ||
                manufacturer.contains("realme") -> TIER_STANDARD

        // ── Vivo / iQOO ────────────────────────────────────────────────────
        manufacturer.contains("vivo") -> TIER_STANDARD

        // ── LG ─────────────────────────────────────────────────────────────
        manufacturer == "lge" || manufacturer == "lg" -> lgLength(model, sdk)

        // ── Motorola ───────────────────────────────────────────────────────
        manufacturer.contains("motorola") ->
            if (sdk >= Build.VERSION_CODES.Q) TIER_STANDARD else TIER_LOW

        // ── Sony ───────────────────────────────────────────────────────────
        manufacturer.contains("sony") ->
            if (sdk >= Build.VERSION_CODES.R) TIER_STANDARD else TIER_MODERATE

        // ── Nothing / Fairphone / Asus ─────────────────────────────────────
        manufacturer.contains("nothing") ||
                manufacturer.contains("fairphone") ||
                manufacturer.contains("asus") ->
            if (sdk >= Build.VERSION_CODES.S) TIER_STANDARD else TIER_MODERATE

        // ── Fallback conservativo ──────────────────────────────────────────
        else -> TIER_MODERATE
    }

    ProximityLogger.i(TAG, "suggestedResponseDataFieldLength=$value")
    value
}

// ═══════════════════════════════════════════════════════════════════════════
//  Tiers — valori in byte, potenze di 2 dove possibile per allinearsi
//  ai buffer interni dei controller NFC più comuni.
// ═══════════════════════════════════════════════════════════════════════════

/** Dispositivi molto vecchi / entry-level con NFC controller limitato. */
private const val TIER_LEGACY = 256L

/** Budget devices, controller MediaTek / NXP limitati. */
private const val TIER_LOW = 512L

/** Fascia media, valore sicuro per la maggior parte dei controller. */
private const val TIER_MODERATE = 1024L

/** Fascia media-alta: testato affidabile su Android 8+ dei principali OEM. */
private const val TIER_STANDARD = 2048L

/** Fascia alta (Samsung S/Z/A5x su Android 11+, ecc.). */
private const val TIER_HIGH = 4096L

/**
 * Extended-length affidabile (Pixel 7+ con ST54K, Samsung S24+ con ST54J, ecc.).
 * 16 384 è un compromesso prudente: ben sotto il teorico 65 535,
 * ma abbastanza alto da ridurre i round-trip GET RESPONSE.
 */
private const val TIER_EXTENDED = 16384L

private const val TAG = "NfcDataFieldLength"

// ═══════════════════════════════════════════════════════════════════════════
//  Logiche per OEM
// ═══════════════════════════════════════════════════════════════════════════

private fun googlePixelLength(model: String, sdk: Int): Long {
    val pixelVersion = model.pixelMajorVersion()
    return when {
        // Pixel 7 / 7a / 7 Pro / 8 / 8a / 8 Pro / 9 / 9 Pro … → ST54K, extended OK
        pixelVersion != null && pixelVersion >= 7 -> TIER_EXTENDED
        // Pixel 6 / 6a / 6 Pro → ST21NFC, buono ma non quanto ST54K
        pixelVersion != null && pixelVersion == 6 -> TIER_HIGH
        // Pixel 3–5 su Android 12+
        sdk >= Build.VERSION_CODES.S -> TIER_STANDARD
        // Pixel 1–2 o generico Google
        else -> TIER_STANDARD
    }
}

private fun samsungLength(model: String, sdk: Int): Long {
    // Android 16+ (API 36): abilitiamo extended come default “future-proof”
    // perché presumibilmente stack + controller moderni gestiscono meglio APDU lunghi.
    if (sdk >= 36) return TIER_EXTENDED

    // Normalizziamo: "sm-a156b", "SM-A156B" ecc.
    val m = model.lowercase(Locale.ROOT)

    // 1) Casi noti molto limitati (evita assolutamente oversize)
    if (m.startsWith("sm-j1") || m.startsWith("sm-j2") ||
        m.startsWith("sm-a01") || m.startsWith("sm-a02") || m.startsWith("sm-a03")
    ) return TIER_LEGACY

    // 2) Budget Samsung per famiglie: A0x / A1x e molti Mxx
    //    Qui preferisco non superare 512/1024 per stabilità HCE.
    when {
        m.startsWith("sm-a0") -> return TIER_LOW              // A0x: spesso entry-level
        m.startsWith("sm-a1") -> return TIER_LOW              // A1x: spesso budget (A12/A13/A14…)
        m.startsWith("sm-m0") || m.startsWith("sm-m1") -> return TIER_LOW
        m.startsWith("sm-m2") -> return TIER_MODERATE         // M2x: dipende, ma 1024 è prudente
    }

    // 3) Flagship / foldables: di solito reggono bene 4096 già prima di Android 16
    //    S-series spesso "SM-G9xx"/"SM-S9xx", Fold/Flip "SM-F..."
    if (m.startsWith("sm-g9") || m.startsWith("sm-s9") || m.startsWith("sm-f")) {
        return TIER_HIGH
    }

    // 4) Default Samsung moderno: 2048 è spesso ok
    //    (puoi alzare a TIER_HIGH su Android 11+ se hai test, ma questo è più safe)
    return TIER_STANDARD
}


private fun huaweiLength(sdk: Int): Long = when {
    // Pre-Android 9: Kirin 650/655/659 con NFC limitato
    sdk < Build.VERSION_CODES.P -> TIER_LEGACY
    // Kirin 960+ (P10 in su)
    else -> TIER_STANDARD
}

private fun lgLength(model: String, sdk: Int): Long {
    if (sdk >= 36) return TIER_EXTENDED

    val m = model.lowercase(Locale.ROOT)
    if (m.contains("k10") || m.contains("k20") || m.contains("k30") || m.contains("k40")) return TIER_LEGACY

    return if (sdk >= Build.VERSION_CODES.P) TIER_STANDARD else TIER_LOW
}


// ═══════════════════════════════════════════════════════════════════════════
//  Utilities
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estrae il numero di versione principale dal nome modello Pixel.
 * "pixel 7a" → 7,  "pixel 7 pro" → 7,  "pixel fold" → null
 */
private fun String.pixelMajorVersion(): Int? {
    if (!startsWith("pixel")) return null
    return removePrefix("pixel").trim()
        .takeWhile { it.isDigit() }
        .toIntOrNull()
}
