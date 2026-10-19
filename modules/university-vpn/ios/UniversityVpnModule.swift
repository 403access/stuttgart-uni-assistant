import ExpoModulesCore
import NetworkExtension

/// Status the native module hands to JS, mirroring `VpnNativeStatus` on the TS side.
struct VpnStatusRecord: Record {
  @Field var state: String = "disconnected"
  @Field var server: String? = nil
  @Field var since: String? = nil
  @Field var error: String? = nil
  @Field var permissionGranted: Bool = true
  @Field var engine: String = "none"
}

/// The target handed to the tunnel: a host plus account, or a named OpenVPN profile.
struct VpnTargetRecord: Record {
  @Field var kind: String = "openvpn"
  @Field var server: String? = nil
  @Field var accountId: String? = nil
  @Field var profileName: String? = nil
}

/// Raised while the build carries no packet-tunnel engine.
final class VpnEngineMissingException: Exception {
  override var reason: String {
    "This build carries no packet-tunnel engine, so the tunnel cannot connect."
  }
}

/// Control surface for the tunnel. The packet-tunnel provider extension and the
/// engine plug in here; see docs/engineering/vpn-tunnel.md.
public class UniversityVpnModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UniversityVpn")
    Events("onVpnStatusChange")

    Function("getStatus") { () -> VpnStatusRecord in
      VpnStatusRecord()
    }

    AsyncFunction("requestPermission") { () -> Bool in
      // iOS asks for consent through the system prompt when the tunnel is saved.
      // There is nothing to request up front, so this is a no-op that succeeds.
      true
    }

    AsyncFunction("installTarget") { (_: VpnTargetRecord) -> Void in
      // The profile is saved against the packet-tunnel target once the engine lands:
      // `NETunnelProviderManager` with a `NETunnelProviderProtocol` on the extension.
      // For OpenVPN the extension is driven by `OpenVPNAdapter` on a `.ovpn` byte buffer.
    }

    AsyncFunction("connect") { () -> Void in
      throw VpnEngineMissingException()
    }

    AsyncFunction("disconnect") { () -> Void in
    }
  }
}
