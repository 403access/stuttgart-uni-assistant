import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Pill, Screen, SearchField, Section } from '@/src/components/ui';
import { useAsyncAction } from '@/src/hooks/use-async-action';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx, type TranslationKey } from '@/src/text';
import {
  defaultTikServerId,
  defaultVpnProviderId,
  tikServers,
  vpnLinks,
  vpnProviderById,
} from '@/src/vpn/data';
import { networkTypeLabel, vpnEngineLabel, vpnStateLabel, vpnStateTone } from '@/src/vpn/labels';
import { openVpnRemote } from '@/src/vpn/openvpn-config';
import { useVpn } from '@/src/vpn/use-vpn';
import { useVpnProfile, type ProfileImportResult } from '@/src/vpn/use-vpn-profile';
import type { VpnEngine, VpnProviderId } from '@/src/vpn/types';

function open(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

const importMessages: Record<Exclude<ProfileImportResult, 'cancelled'>, TranslationKey> = {
  imported: 'vpn.openvpn.importiert_ok',
  invalid: 'vpn.openvpn.ungueltig',
  failed: 'vpn.openvpn.fehlgeschlagen',
};

export default function VpnScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { state, busy, error, network, printerReachable, connect, disconnect, probePrinter } = useVpn();
  const { profile, importFromPicker, remove } = useVpnProfile();
  const [providerId, setProviderId] = useState<VpnProviderId>(defaultVpnProviderId);
  const [serverId, setServerId] = useState(defaultTikServerId);
  const [account, setAccount] = useState('');
  const [openVpnUser, setOpenVpnUser] = useState('');
  const [openVpnPassword, setOpenVpnPassword] = useState('');
  const [importResult, setImportResult] = useState<ProfileImportResult | null>(null);
  const probe = useAsyncAction(probePrinter);
  const importProfile = useAsyncAction(importFromPicker, { onSuccess: setImportResult });

  const provider = vpnProviderById(providerId);
  // A provider is only connectable when the engine that speaks its protocol is in this build.
  const engineForProvider: VpnEngine = provider.kind === 'openvpn' ? 'openvpn' : 'openconnect';
  const engineReady = state.available && state.status.engine === engineForProvider;
  const connected = state.status.state === 'connected';
  const remote = profile ? openVpnRemote(profile.config) : null;
  const since = state.status.since;
  const sinceText = since ? new Date(since).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB') : null;
  const reachableKey =
    printerReachable === true ? 'vpn.netz.ja' : printerReachable === false ? 'vpn.netz.nein' : 'vpn.netz.unbekannt';

  return (
    <Screen kicker="Netz" title={tx(locale, 'vpn.title')} subtitle={tx(locale, 'vpn.subtitle')}>
      <Stack.Screen options={{ title: tx(locale, 'vpn.title') }} />

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>{tx(locale, 'vpn.status')}</Text>
          <Pill label={vpnStateLabel(state.status.state, locale)} tone={vpnStateTone(state.status.state)} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'vpn.status.ziel')}</Text>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{state.status.server ?? '–'}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'vpn.status.engine')}</Text>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{vpnEngineLabel(state.status.engine, locale)}</Text>
        </View>
        {sinceText ? <Text style={{ color: colors.mute }}>{tx(locale, 'vpn.status.seit', [sinceText])}</Text> : null}
      </Card>

      {!engineReady ? (
        <Card>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>
            {provider.kind === 'anyconnect' ? tx(locale, 'vpn.build.tik_titel') : tx(locale, 'vpn.build.titel')}
          </Text>
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
            {provider.kind === 'anyconnect' ? tx(locale, 'vpn.build.tik_text') : tx(locale, 'vpn.build.text')}
          </Text>
          {provider.kind === 'openvpn' ? (
            <>
              <Button label={tx(locale, 'vpn.openvpn.zdi_seite')} onPress={() => open(vpnLinks.zdiService)} secondary />
              <Button label="OpenVPN" onPress={() => open(vpnLinks.openVpnProject)} secondary />
            </>
          ) : (
            <>
              <Button label={tx(locale, 'vpn.build.ios')} onPress={() => open(vpnLinks.ciscoIosApp)} secondary />
              <Button label={tx(locale, 'vpn.build.android')} onPress={() => open(vpnLinks.ciscoAndroidApp)} secondary />
              <Button label={tx(locale, 'vpn.build.tik')} onPress={() => open(vpnLinks.tikGuide)} secondary />
            </>
          )}
        </Card>
      ) : null}

      <Section title={tx(locale, 'vpn.provider')} />
      <View style={{ gap: 8 }}>
        {(Object.keys(providerCopy) as VpnProviderId[]).map((id) => {
          const entry = vpnProviderById(id);
          const active = id === providerId;
          return (
            <Pressable
              key={id}
              onPress={() => {
                setProviderId(id);
                setImportResult(null);
              }}
              disabled={connected}
              style={({ pressed }) => [pressed && { opacity: 0.72 }]}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{entry.label}</Text>
                  {active ? <Pill label="✓" tone="blue" /> : null}
                </View>
                <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, providerCopy[id])}</Text>
              </Card>
            </Pressable>
          );
        })}
      </View>

      {provider.kind === 'openvpn' ? (
        <>
          <Section title={tx(locale, 'vpn.openvpn.profil')} />
          <Card>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.openvpn.konto')}</Text>
            {profile ? (
              <>
                <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{profile.name}</Text>
                {remote ? <Text style={{ color: colors.blue, fontWeight: '700' }}>{remote}</Text> : null}
                <Text style={{ color: colors.mute }}>
                  {tx(locale, 'vpn.openvpn.importiert', [
                    new Date(profile.importedAt).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB'),
                  ])}
                </Text>
              </>
            ) : (
              <Text style={{ color: colors.inkSoft }}>{tx(locale, 'vpn.openvpn.kein')}</Text>
            )}
            <Button label={tx(locale, 'vpn.openvpn.import')} onPress={() => void importProfile.run()} secondary />
            {importResult && importResult !== 'cancelled' ? (
              <Text style={{ color: importResult === 'imported' ? colors.success : colors.danger }}>
                {tx(locale, importMessages[importResult])}
              </Text>
            ) : null}
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.openvpn.intern')}</Text>
            <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '700' }}>{tx(locale, 'vpn.openvpn.dateien')}</Text>
            {provider.configs.map((config) => (
              <Pressable key={config.id} onPress={() => open(config.url)}>
                <Text style={{ color: colors.blue, lineHeight: 22 }}>
                  {config.tunnel === 'v6-over-v4' ? tx(locale, 'vpn.openvpn.datei_v6') : tx(locale, 'vpn.openvpn.datei_v4')}
                </Text>
              </Pressable>
            ))}
            {profile ? <Button label={tx(locale, 'vpn.openvpn.entfernen')} onPress={remove} secondary /> : null}
          </Card>

          {engineReady && profile ? (
            <Card>
              <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'vpn.openvpn.benutzer')}</Text>
              <SearchField
                value={openVpnUser}
                onChangeText={setOpenVpnUser}
                placeholder={tx(locale, 'vpn.openvpn.benutzer_platzhalter')}
                autoCapitalize="none"
              />
              <SearchField
                value={openVpnPassword}
                onChangeText={setOpenVpnPassword}
                placeholder={tx(locale, 'vpn.openvpn.passwort')}
                secureTextEntry
                autoCapitalize="none"
              />
              {error ? <Text style={{ color: colors.danger }}>{tx(locale, `vpn.error.${error}`)}</Text> : null}
              {connected ? (
                <Button label={busy ? tx(locale, 'vpn.state.disconnecting') : tx(locale, 'vpn.disconnect')} onPress={disconnect} secondary />
              ) : (
                <Button
                  label={busy ? tx(locale, 'vpn.state.connecting') : tx(locale, 'vpn.connect')}
                  onPress={() =>
                    connect({
                      kind: 'openvpn',
                      profileName: profile.name,
                      config: profile.config,
                      username: openVpnUser.trim(),
                      password: openVpnPassword,
                    })
                  }
                />
              )}
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Section title={tx(locale, 'vpn.server')} />
          <View style={{ gap: 8 }}>
            {tikServers.map((server) => {
              const active = server.id === serverId;
              return (
                <Pressable
                  key={server.id}
                  onPress={() => setServerId(server.id)}
                  disabled={connected}
                  style={({ pressed }) => [pressed && { opacity: 0.72 }]}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{server.host}</Text>
                      {active ? <Pill label="✓" tone="blue" /> : null}
                    </View>
                    {server.udpThroughFirewall ? (
                      <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.server_udp')}</Text>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <Section title={tx(locale, 'vpn.zugang')} />
          <Card>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'vpn.zugang.student')}</Text>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'vpn.zugang.employee')}</Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.zugang.passwort')}</Text>
          </Card>

          {engineReady ? (
            <Card>
              <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'vpn.kennung')}</Text>
              <SearchField
                value={account}
                onChangeText={setAccount}
                placeholder={tx(locale, 'vpn.kennung_platzhalter')}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {error ? <Text style={{ color: colors.danger }}>{tx(locale, `vpn.error.${error}`)}</Text> : null}
              {connected ? (
                <Button label={busy ? tx(locale, 'vpn.state.disconnecting') : tx(locale, 'vpn.disconnect')} onPress={disconnect} secondary />
              ) : (
                <Button
                  label={busy ? tx(locale, 'vpn.state.connecting') : tx(locale, 'vpn.connect')}
                  onPress={() =>
                    connect({
                      kind: 'anyconnect',
                      server: (tikServers.find((entry) => entry.id === serverId) ?? tikServers[0]).host,
                      accountId: account.trim(),
                    })
                  }
                />
              )}
            </Card>
          ) : null}
        </>
      )}

      <Section title={tx(locale, 'vpn.netz')} />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'vpn.netz.typ')}</Text>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{networkTypeLabel(network.type, locale)}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.inkSoft }}>{tx(locale, 'vpn.netz.drucker')}</Text>
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, reachableKey)}</Text>
        </View>
        <Text style={{ color: colors.mute, lineHeight: 20 }}>{tx(locale, 'vpn.netz.hinweis')}</Text>
        <Button label={tx(locale, 'vpn.netz.pruefen')} onPress={() => void probe.run()} secondary />
        {probe.busy ? <Text style={{ color: colors.mute }}>…</Text> : null}
      </Card>

      <Section title={tx(locale, 'vpn.zweck')} />
      <Card>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.zweck.text')}</Text>
      </Card>

      <Section title={tx(locale, 'vpn.probleme')} />
      <Card>
        {provider.kind === 'openvpn' ? (
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.problem.openvpn')}</Text>
        ) : (
          <>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.problem.adresse')}</Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.problem.sonderzeichen')}</Text>
            <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'vpn.problem.udp')}</Text>
          </>
        )}
        <Button
          label={provider.kind === 'openvpn' ? tx(locale, 'vpn.openvpn.zdi_seite') : tx(locale, 'vpn.support')}
          onPress={() => open(provider.kind === 'openvpn' ? vpnLinks.zdiService : vpnLinks.tikSupport)}
          secondary
        />
      </Card>
    </Screen>
  );
}

const providerCopy: Record<VpnProviderId, TranslationKey> = {
  'zdi-openvpn': 'vpn.provider.zdi',
  'tik-anyconnect': 'vpn.provider.tik',
};
