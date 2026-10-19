package expo.modules.universityvpn

import android.content.Context
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Raised while the build carries no packet-tunnel engine. */
class VpnEngineMissingException :
  CodedException("This build carries no packet-tunnel engine, so the tunnel cannot connect.")

class UniversityVpnModule : Module() {
  private val context: Context?
    get() = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("UniversityVpn")

    Events("onVpnStatusChange")

    Function("getStatus") {
      val consentDue = UniversityVpnService.consentPending(context)
      mapOf(
        // A tunnel that is not connected cannot be in any other state: no engine, no carrier.
        "state" to "disconnected",
        "server" to UniversityVpnConfig.label(),
        "since" to null,
        "error" to null,
        "permissionGranted" to !consentDue,
        "engine" to engineName()
      )
    }

    AsyncFunction("requestPermission") {
      !UniversityVpnService.consentPending(context)
    }

    AsyncFunction("installTarget") { target: Map<String, Any?> ->
      UniversityVpnConfig.install(target)
      null
    }

    AsyncFunction("connect") {
      if (UniversityVpnConfig.engine == null) throw VpnEngineMissingException()
      null
    }

    AsyncFunction("disconnect") {
      UniversityVpnConfig.engine?.stop()
      null
    }
  }

  private fun engineName(): String =
    when (UniversityVpnConfig.engine) {
      null -> "none"
      else -> "openvpn"
    }
}
