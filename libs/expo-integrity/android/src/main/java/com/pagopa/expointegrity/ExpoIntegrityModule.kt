package com.pagopa.expointegrity

import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.StandardIntegrityManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.spec.ECGenParameterSpec

class ExpoIntegrityModule : Module() {
  private var tokenProvider: StandardIntegrityManager.StandardIntegrityTokenProvider? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoIntegrity")

    AsyncFunction("isPlayServicesAvailable") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("UNSUPPORTED_DEVICE", "React context is unavailable", null)
      } else {
        val status = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context)
        promise.resolve(status in listOf(
          ConnectionResult.SUCCESS,
          ConnectionResult.SERVICE_UPDATING,
          ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED
        ))
      }
    }

    AsyncFunction("prepareIntegrityToken") { projectNumber: String, promise: Promise ->
      val number = projectNumber.toLongOrNull()
      val context = appContext.reactContext
      when {
        number == null -> promise.reject("WRONG_GOOGLE_CLOUD_PROJECT_NUMBER_FORMAT", "WRONG_GOOGLE_CLOUD_PROJECT_NUMBER_FORMAT", null)
        context == null -> promise.reject("PREPARE_FAILED", "React context is unavailable", null)
        else -> try {
          val manager = IntegrityManagerFactory.createStandard(context)
          val request = StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
            .setCloudProjectNumber(number).build()
          manager.prepareIntegrityToken(request)
            .addOnSuccessListener { tokenProvider = it; promise.resolve() }
            .addOnFailureListener { promise.reject("PREPARE_FAILED", it.message ?: "PREPARE_FAILED", it) }
        } catch (e: Exception) {
          promise.reject("PREPARE_FAILED", e.message ?: "PREPARE_FAILED", e)
        }
      }
    }

    AsyncFunction("requestIntegrityToken") { requestHash: String?, promise: Promise ->
      val provider = tokenProvider
      if (provider == null) {
        promise.reject("PREPARE_NOT_CALLED", "PREPARE_NOT_CALLED", null)
      } else {
        try {
          val request = StandardIntegrityManager.StandardIntegrityTokenRequest.builder()
            .setRequestHash(requestHash).build()
          provider.request(request)
            .addOnSuccessListener { promise.resolve(it.token()) }
            .addOnFailureListener { promise.reject("REQUEST_TOKEN_FAILED", it.message ?: "REQUEST_TOKEN_FAILED", it) }
        } catch (e: Exception) {
          promise.reject("REQUEST_TOKEN_FAILED", e.message ?: "REQUEST_TOKEN_FAILED", e)
        }
      }
    }

    AsyncFunction("getAttestation") { challenge: String, keyAlias: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject("REQUEST_ATTESTATION_FAILED", "React context is unavailable", null)
      } else {
        Thread {
          try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
              promise.reject("UNSUPPORTED_DEVICE", "UNSUPPORTED_DEVICE", null)
              return@Thread
            }
            val keyStore = try {
              KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
            } catch (e: Exception) {
              promise.reject("KEYSTORE_NOT_INITIALIZED", e.message ?: "KEYSTORE_NOT_INITIALIZED", e)
              return@Thread
            }
            if (keyStore.containsAlias(keyAlias)) {
              promise.reject("KEY_ALREADY_EXISTS", "KEY_ALREADY_EXISTS", null)
              return@Thread
            }
            val strongBox = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
              context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
            val keyPair = try {
              generateKey(keyAlias, challenge.toByteArray(), strongBox)
            } catch (e: Exception) {
              if (!strongBox) throw e
              generateKey(keyAlias, challenge.toByteArray(), false)
            }
            if (!isHardwareBacked(keyPair.private)) {
              promise.reject("KEY_IS_NOT_HARDWARE_BACKED", "KEY_IS_NOT_HARDWARE_BACKED", null)
              return@Thread
            }
            val chain = keyStore.getCertificateChain(keyAlias)
            val certificates = chain.joinToString(",") {
              Base64.encodeToString(it.encoded, Base64.DEFAULT)
            }
            promise.resolve(Base64.encodeToString(certificates.toByteArray(), Base64.DEFAULT))
          } catch (e: Exception) {
            promise.reject("REQUEST_ATTESTATION_FAILED", e.message ?: "REQUEST_ATTESTATION_FAILED", e)
          }
        }.start()
      }
    }
  }

  private fun generateKey(alias: String, challenge: ByteArray, strongBox: Boolean): KeyPair {
    val builder = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
      .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
      .setDigests(KeyProperties.DIGEST_SHA256)
      .setKeySize(256)
      .setAttestationChallenge(challenge)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && strongBox) {
      builder.setIsStrongBoxBacked(true)
    }
    val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
    generator.initialize(builder.build())
    return generator.generateKeyPair()
  }

  private fun isHardwareBacked(key: PrivateKey): Boolean {
    val factory = KeyFactory.getInstance(key.algorithm, "AndroidKeyStore")
    val info = factory.getKeySpec(key, KeyInfo::class.java)
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      info.securityLevel in listOf(
        KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT,
        KeyProperties.SECURITY_LEVEL_STRONGBOX,
        KeyProperties.SECURITY_LEVEL_UNKNOWN_SECURE
      )
    } else {
      @Suppress("DEPRECATION")
      info.isInsideSecureHardware
    }
  }
}
