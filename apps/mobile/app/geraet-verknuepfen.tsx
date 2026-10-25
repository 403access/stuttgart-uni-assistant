import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import {
  approveDeviceLink,
  authTokenCandidates,
  deviceTokenFromScan,
  fetchUserDevices,
  revokeServerDevice,
  type DeviceLinkInfo,
} from '@/src/auth/session';
import { Button, Card, Pill, Screen } from '@ua/ui';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

type Phase = 'idle' | 'scanning' | 'approving' | 'done' | 'error';

function errorKey(error: unknown): 'geraet.abgelaufen' | 'geraet.verbraucht' | 'geraet.offline' | 'geraet.abgelaufen_sitzung' | 'geraet.fehler' {
  const code = error instanceof Error ? error.message : '';
  if (code === 'device_link_expired' || code === 'device_link_unknown') return 'geraet.abgelaufen';
  if (code === 'device_link_consumed' || code === 'device_link_taken') return 'geraet.verbraucht';
  if (code === 'device_link_revoked') return 'geraet.abgelaufen';
  if (code === 'server_unreachable') return 'geraet.offline';
  if (code === 'unauthorized') return 'geraet.abgelaufen_sitzung';
  return 'geraet.fehler';
}

function deviceStatus(device: DeviceLinkInfo, locale: 'de' | 'en'): string {
  if (device.state === 'active' || device.state === 'linked') return tx(locale, 'einstellungen.geraet_status_aktiv');
  if (device.state === 'expired') return tx(locale, 'einstellungen.geraet_status_abgelaufen');
  if (device.state === 'pending' || device.state === 'approved') return tx(locale, 'einstellungen.geraet_status_wartet');
  return tx(locale, 'einstellungen.geraet_status_widerrufen');
}

function lastSeen(device: DeviceLinkInfo, locale: 'de' | 'en'): string | null {
  const value = device.lastSeenAt;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LinkDeviceScreen() {
  const locale = useAppSelector((state) => state.locale);
  const theme = useAppSelector((state) => state.theme);
  const design = useAppSelector((state) => state.design);
  const authToken = useAppSelector((state) => state.authToken);
  const { signOut } = appActions;
  const { completedAt } = useOnboarding();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('idle');
  const [device, setDevice] = useState<DeviceLinkInfo | null>(null);
  const [devices, setDevices] = useState<DeviceLinkInfo[]>([]);
  const [devicesLoaded, setDevicesLoaded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const busy = useRef(false);

  const refreshDevices = useCallback(
    async (preferredToken?: string | null) => {
      const candidates = await authTokenCandidates(preferredToken ?? authToken);
      if (!candidates.length) {
        setDevices([]);
        setDevicesLoaded(true);
        return;
      }
      let list: DeviceLinkInfo[] = [];
      for (const candidate of candidates) {
        list = await fetchUserDevices(candidate);
        if (list.length) break;
      }
      setDevices(list.filter((item) => item.state !== 'revoked'));
      setDevicesLoaded(true);
    },
    [authToken],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshDevices();
    }, [refreshDevices]),
  );

  async function approve(data: string) {
    if (busy.current) return;
    const token = deviceTokenFromScan(data);
    if (!token) {
      setPhase('error');
      setError(tx(locale, 'geraet.ungueltig'));
      return;
    }
    busy.current = true;
    setPhase('approving');
    setError(null);
    setNeedsSignIn(false);
    try {
      // The React state can be empty while the secure-store session is still
      // restoring, so try every known copy before declaring the phone signed out.
      const candidates = await authTokenCandidates(authToken);
      if (!candidates.length) {
        setNeedsSignIn(true);
        throw new Error('unauthorized');
      }
      let approved: DeviceLinkInfo | null = null;
      let approvedWith: string | null = null;
      let lastError: unknown = new Error('unauthorized');
      for (const candidate of candidates) {
        try {
          approved = await approveDeviceLink(token, candidate, 'Mobiles Gerät', {
            onboardingCompletedAt: completedAt,
            theme,
            design,
            locale,
          });
          approvedWith = candidate;
          break;
        } catch (candidateError) {
          lastError = candidateError;
          if (!(candidateError instanceof Error) || candidateError.message !== 'unauthorized') throw candidateError;
        }
      }
      if (!approved) {
        setNeedsSignIn(true);
        throw lastError;
      }
      setDevice(approved);
      setPhase('done');
      await refreshDevices(approvedWith);
    } catch (nextError) {
      setPhase('error');
      setError(tx(locale, errorKey(nextError)));
    } finally {
      busy.current = false;
    }
  }

  function reset() {
    busy.current = false;
    setDevice(null);
    setError(null);
    setNeedsSignIn(false);
    setPhase('scanning');
  }

  function signInAgain() {
    signOut();
    router.replace('/login');
  }

  function onBarcodeScanned(result: BarcodeScanningResult) {
    if (phase !== 'scanning') return;
    void approve(result.data);
  }

  async function disconnect(deviceId: string) {
    setBusyId(deviceId);
    const candidates = await authTokenCandidates(authToken);
    let ok = false;
    for (const candidate of candidates) {
      if (await revokeServerDevice(candidate, deviceId)) {
        ok = true;
        break;
      }
    }
    setBusyId(null);
    if (ok) setDevices((current) => current.filter((item) => item.id !== deviceId));
  }

  const canScan = phase === 'scanning' && permission?.granted === true;
  const scanning = phase === 'scanning' || phase === 'approving';

  return (
    <Screen
      narrow
      kicker={tx(locale, 'geraet.kicker')}
      title={tx(locale, 'geraet.titel')}
      subtitle={tx(locale, 'geraet.subtitle')}
    >
      <Stack.Screen options={{ title: tx(locale, 'geraet.titel') }} />

      {Platform.OS === 'web' ? (
        <Card>
          <Text style={styles.cardTitle}>{tx(locale, 'geraet.web_titel')}</Text>
          <Text style={styles.body}>{tx(locale, 'geraet.web_text')}</Text>
        </Card>
      ) : null}

      {Platform.OS !== 'web' && phase === 'done' && device ? (
        <Card>
          <View style={styles.successHead}>
            <View style={styles.successIcon}>
              <MaterialIcons name="check" size={22} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.cardTitle}>{tx(locale, 'geraet.erfolg')}</Text>
              <Text style={styles.body}>{device.name}</Text>
            </View>
            <Pill label={tx(locale, 'geraet.verbunden')} tone="ok" />
          </View>
          <Text style={styles.body}>{tx(locale, 'geraet.erfolg_text')}</Text>
          <View style={styles.actions}>
            <Button label={tx(locale, 'geraet.fertig')} onPress={() => router.back()} />
            <Button label={tx(locale, 'geraet.weiteres')} onPress={reset} secondary />
          </View>
        </Card>
      ) : null}

      {Platform.OS !== 'web' && phase === 'error' ? (
        <Card>
          <View style={styles.errorHead}>
            <MaterialIcons name="error-outline" size={22} color={colors.warning} />
            <Text style={styles.cardTitle}>{tx(locale, 'geraet.fehler_titel')}</Text>
          </View>
          <Text style={styles.body}>{error ?? tx(locale, 'geraet.fehler')}</Text>
          <View style={styles.actions}>
            {needsSignIn ? (
              <Button label={tx(locale, 'geraet.anmelden')} onPress={signInAgain} />
            ) : (
              <Button label={tx(locale, 'geraet.erneut')} onPress={reset} />
            )}
            <Button label={tx(locale, 'geraet.fertig')} onPress={() => router.back()} secondary />
          </View>
        </Card>
      ) : null}

      {Platform.OS !== 'web' && scanning ? (
        <View style={styles.cameraCard}>
          {permission === null ? (
            <View style={styles.permission}>
              <MaterialIcons name="hourglass-empty" size={28} color={colors.blue} />
              <Text style={styles.body}>{tx(locale, 'geraet.kamera_laedt')}</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.permission}>
              <MaterialIcons name="no-photography" size={34} color={colors.mute} />
              <Text style={styles.cardTitle}>{tx(locale, 'geraet.kamera_titel')}</Text>
              <Text style={styles.body}>{tx(locale, 'geraet.kamera_text')}</Text>
              <Button label={tx(locale, 'geraet.kamera_erlauben')} onPress={() => void requestPermission()} />
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={canScan ? onBarcodeScanned : undefined}
              />
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.scanFrame} />
              </View>
              {phase === 'approving' ? (
                <View style={styles.approving}>
                  <MaterialIcons name="hourglass-empty" size={20} color="#FFFFFF" />
                  <Text style={styles.approvingText}>{tx(locale, 'geraet.genehmigt')}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      {Platform.OS !== 'web' && phase === 'scanning' ? (
        <Button label={tx(locale, 'geraet.abbrechen')} onPress={() => setPhase('idle')} secondary />
      ) : null}

      {Platform.OS !== 'web' ? (
        <Card>
          <View style={styles.listHead}>
            <Text style={styles.cardTitle}>{tx(locale, 'geraet.verbundene')}</Text>
            {devices.length ? <Pill label={String(devices.length)} tone="blue" /> : null}
          </View>
          {!devicesLoaded ? (
            <Text style={styles.body}>{tx(locale, 'geraet.laedt')}</Text>
          ) : devices.length ? (
            <View style={styles.deviceList}>
              {devices.map((item) => {
                const seen = lastSeen(item, locale);
                return (
                  <View key={item.id} style={styles.deviceRow}>
                    <View style={styles.deviceMain}>
                      <Text style={styles.deviceName}>{item.name}</Text>
                      <Text style={styles.deviceMeta}>{deviceStatus(item, locale)}</Text>
                      {seen ? <Text style={styles.deviceMeta}>{tx(locale, 'geraet.zuletzt', [seen])}</Text> : null}
                      {item.userAgent ? <Text style={styles.deviceAgent} numberOfLines={1}>{item.userAgent}</Text> : null}
                    </View>
                    <Pressable
                      onPress={() => void disconnect(item.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={tx(locale, 'einstellungen.geraet_trennen')}
                      style={({ pressed }) => [styles.disconnect, pressed && styles.pressed]}
                    >
                      <MaterialIcons name={busyId === item.id ? 'hourglass-empty' : 'link-off'} size={16} color={colors.danger} />
                      <Text style={styles.disconnectLabel}>
                        {busyId === item.id ? tx(locale, 'einstellungen.geraet_trennt') : tx(locale, 'einstellungen.geraet_trennen')}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.body}>{tx(locale, 'geraet.keine')}</Text>
          )}
          {!scanning ? (
            <Button label={tx(locale, 'geraet.neues')} onPress={() => setPhase('scanning')} />
          ) : null}
        </Card>
      ) : null}

      {Platform.OS !== 'web' ? (
        <Card>
          <Text style={styles.cardTitle}>{tx(locale, 'geraet.ablauf_titel')}</Text>
          {[tx(locale, 'geraet.ablauf1'), tx(locale, 'geraet.ablauf2'), tx(locale, 'geraet.ablauf3')].map((line) => (
            <View key={line} style={styles.bullet}>
              <MaterialIcons name="arrow-right" size={14} color={colors.blue} />
              <Text style={styles.body}>{line}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  cardTitle: { color: colors.anthracite, fontSize: 16, fontWeight: '700' },
  body: { color: colors.inkSoft, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  successHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  successIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  errorHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  cameraCard: { height: 360, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0B1728', justifyContent: 'center' },
  camera: { width: '100%', height: '100%' },
  permission: { height: 360, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 220, height: 220, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  approving: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,26,58,0.72)' },
  approvingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  deviceList: { gap: 8 },
  deviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  deviceMain: { flex: 1, gap: 2 },
  deviceName: { color: colors.anthracite, fontSize: 14, fontWeight: '700' },
  deviceMeta: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  deviceAgent: { color: colors.mute, fontSize: 11, lineHeight: 15 },
  disconnect: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  disconnectLabel: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.7 },
}));
