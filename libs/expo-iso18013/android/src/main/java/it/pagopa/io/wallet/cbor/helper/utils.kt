package it.pagopa.io.wallet.cbor.helper

import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.Security

fun addBcIfNeeded(){
    val isBcAlreadyIntoProviders = Security.getProviders().any {
        it.name == BouncyCastleProvider.PROVIDER_NAME
    }
    if (!isBcAlreadyIntoProviders) {
        // Append the full BouncyCastle
        Security.addProvider(BouncyCastleProvider())
    } else {
        // Android ships its own stripped-down built-in provider also named "BC" (missing
        // algorithms such as the "EC" KeyFactory used to verify COSE signatures). Replace it
        // with the full BouncyCastle implementation, still appending it instead of inserting
        // it at position 1, so default lookups keep favoring the system providers.
        Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME)
        Security.addProvider(BouncyCastleProvider())
    }
}