package expo.modules.universityvpn

/**
 * The target handed to the tunnel: either a host plus account (Cisco AnyConnect)
 * or a named OpenVPN profile. Kept in memory — a build without an engine has
 * nothing to persist, and the account is a login name, not a secret. A stored
 * OpenVPN profile may carry inline keys, so if this is ever persisted it goes to
 * `EncryptedSharedPreferences`, never plain preferences.
 */
object UniversityVpnConfig {
  var target: Map<String, Any?>? = null
  var engine: UniversityVpnService.TunnelEngine? = null

  fun install(target: Map<String, Any?>) {
    this.target = target
  }

  /** Human-readable target for the status line: the profile name or the server host. */
  fun label(): String? =
    (target?.get("profileName") as? String) ?: (target?.get("server") as? String)
}
