package expo.modules.universityvpn

import android.content.Context
import android.net.VpnService

/**
 * The Android packet-tunnel endpoint.
 *
 * The interface is established only when an AnyConnect-compatible engine is
 * present, because a tunnel without an engine would silently black-hole the
 * student's traffic. Until then the module reports `engine: "none"` and
 * `connect()` rejects. The engine plugs in at [attachEngine].
 *
 * See docs/engineering/vpn-tunnel.md.
 */
class UniversityVpnService : VpnService() {
  override fun onRevoke() {
    UniversityVpnConfig.engine = null
    stopSelf()
    super.onRevoke()
  }

  /** Entry point the linked engine overrides to bring the interface up. */
  fun attachEngine(engine: TunnelEngine) {
    UniversityVpnConfig.engine = engine
  }

  interface TunnelEngine {
    fun start(context: Context, server: String, accountId: String)
    fun stop()
  }

  companion object {
    /** `VpnService.prepare` returns non-null while the consent dialog is still due. */
    fun consentPending(context: Context?): Boolean =
      context != null && prepare(context) != null
  }
}
