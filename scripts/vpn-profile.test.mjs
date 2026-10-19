import assert from 'node:assert/strict';
import { test } from 'node:test';

import { looksLikeOpenVpn, openVpnHost, openVpnRemote } from '../src/vpn/openvpn-config.ts';

/**
 * The `.ovpn` parser decides whether an imported file is usable and where it
 * points. `.ovpn` files carry no reliable MIME type, so this check is the only
 * gate between a picked file and the tunnel, and it is pinned here.
 */

const CLIENT_CONFIG = `client
dev tun
proto udp
remote vpn.informatik.uni-stuttgart.de 1194
resolv-retry infinite
nobind
`;

test('looksLikeOpenVpn accepts a client configuration', () => {
  assert.equal(looksLikeOpenVpn(CLIENT_CONFIG), true);
  assert.equal(looksLikeOpenVpn('dev tun\nremote example.org\n'), true);
  assert.equal(looksLikeOpenVpn('client\nremote example.org 443\npull\n'), true);
});

test('looksLikeOpenVpn rejects anything that is not a client config', () => {
  assert.equal(looksLikeOpenVpn(''), false);
  assert.equal(looksLikeOpenVpn('remote example.org\n'), false, 'a remote alone is a server-side file');
  assert.equal(looksLikeOpenVpn('<html><body>Fehler 403</body></html>'), false);
  assert.equal(looksLikeOpenVpn('{"error":"not a profile"}'), false);
});

test('openVpnRemote reads the host and optional port', () => {
  assert.equal(openVpnRemote(CLIENT_CONFIG), 'vpn.informatik.uni-stuttgart.de:1194');
  assert.equal(openVpnRemote('remote example.org\n'), 'example.org');
  assert.equal(openVpnRemote('client\ndev tun\n'), null);
});

test('openVpnHost drops the port for APIs that take the two separately', () => {
  assert.equal(openVpnHost(CLIENT_CONFIG), 'vpn.informatik.uni-stuttgart.de');
  assert.equal(openVpnHost('remote example.org\n'), 'example.org');
  assert.equal(openVpnHost('client\ndev tun\n'), null);
});
