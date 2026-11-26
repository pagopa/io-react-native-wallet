package com.ioreactnativeiso18013

import it.pagopa.io.wallet.proximity.nfc.NfcEngagementService

/**
 * Concrete subclass of [NfcEngagementService] (which itself extends [android.nfc.cardemulation.HostApduService]).
 *
 * This class intentionally lives in its own file and contains no logic.
 * Android components declared in AndroidManifest.xml must be top-level, named classes so the
 * system can instantiate them by their fully-qualified name via reflection. Registering an
 * anonymous object or an inner class in the manifest is not supported.
 *
 * All NFC engagement logic is handled by the library's [NfcEngagementService] base class and
 * events are surfaced through [it.pagopa.io.wallet.proximity.nfc.NfcEngagementEventBus].
 * See [IoReactNativeIso18013Module.setupNfcHandler] for the event handling.
 */
class IoNfcEngagementService : NfcEngagementService()
