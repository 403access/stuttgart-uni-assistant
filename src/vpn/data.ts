import type { VpnProvider, VpnProviderId, VpnRole, VpnServer } from '@/src/vpn/types';

/**
 * The TIK headends. `vpn2` runs behind a stateful firewall that also allows UDP
 * towards the internet, which helps with video calls but mishandles some special
 * characters with the Cisco client.
 * Source: https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/
 */
export const tikServers: VpnServer[] = [
  { id: 'vpn', host: 'vpn.tik.uni-stuttgart.de', udpThroughFirewall: false },
  { id: 'vpn2', host: 'vpn2.tik.uni-stuttgart.de', udpThroughFirewall: true },
];

export const defaultTikServerId = 'vpn';

/**
 * The two VPN services, in the order the app offers them.
 *
 * ZDI first: Informatik (Fakultät 5) runs an OpenVPN access whose protocol has
 * working React Native engines on both platforms. The TIK's Cisco AnyConnect
 * access covers everyone else but has no mobile engine to link (see
 * docs/engineering/vpn-tunnel.md).
 */
export const vpnProviders: VpnProvider[] = [
  {
    id: 'zdi-openvpn',
    kind: 'openvpn',
    label: 'OpenVPN (ZDI)',
    service: 'http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html',
    guide: 'http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html',
    servers: [],
    configs: [
      {
        id: 'informatik',
        tunnel: 'v6-over-v4',
        url: 'http://www2.informatik.uni-stuttgart.de/intern/vpn/openvpn/informatik.conf',
      },
      {
        id: 'informatik6',
        tunnel: 'v4-over-v6',
        url: 'http://www2.informatik.uni-stuttgart.de/intern/vpn/openvpn/informatik6.conf',
      },
    ],
  },
  {
    id: 'tik-anyconnect',
    kind: 'anyconnect',
    label: 'Cisco Secure Client (TIK)',
    service: 'https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/',
    guide: 'https://www.tik.uni-stuttgart.de/support/anleitungen/vpn/',
    servers: tikServers,
    configs: [],
  },
];

export const defaultVpnProviderId: VpnProviderId = 'zdi-openvpn';

export function vpnProviderById(id: VpnProviderId): VpnProvider {
  return vpnProviders.find((provider) => provider.id === id) ?? vpnProviders[0];
}

export function vpnServerById(id: string): VpnServer {
  return tikServers.find((server) => server.id === id) ?? tikServers[0];
}

/**
 * The account id is the login name in full, not a bare number: the TIK asks for
 * the whole `st…@stud.uni-stuttgart.de` or `ac…@uni-stuttgart.de` address.
 * The ZDI OpenVPN uses the department / CIP-pool account instead.
 */
export const vpnAccountSuffix: Record<VpnRole, string> = {
  student: '@stud.uni-stuttgart.de',
  employee: '@uni-stuttgart.de',
};

export const vpnLinks = {
  /** ZDI service page: the source of the OpenVPN config files. */
  zdiService: 'http://www.zdi.uni-stuttgart.de/zdi/vpn/openvpn.html',
  /** The ZDI's own AnyConnect page, for the same department. */
  zdiAnyConnect: 'http://www.zdi.uni-stuttgart.de/zdi/vpn/anyconnect.html',
  /** TIK VPN service page, the source of the server addresses and the FAQ. */
  tikService: 'https://www.tik.uni-stuttgart.de/dienste-a-z/VPN-Netzwerkzugang-von-unterwegs/',
  /** TIK download and step-by-step guides for every platform. */
  tikGuide: 'https://www.tik.uni-stuttgart.de/support/anleitungen/vpn/',
  /** Where the desktop client is offered by the university itself. */
  clientPortal: 'https://vpn.tik.uni-stuttgart.de/',
  ciscoIosApp: 'https://apps.apple.com/app/cisco-secure-client/id1135064690',
  ciscoAndroidApp: 'https://play.google.com/store/apps/details?id=com.cisco.anyconnect.vpn.android.avf',
  /** OpenVPN's own project page, linked from the ZDI page. */
  openVpnProject: 'https://openvpn.net/',
  /** Benutzerberatung BERA, the TIK support desk. */
  tikSupport: 'https://www.tik.uni-stuttgart.de/support/benutzerberatung/',
} as const;
