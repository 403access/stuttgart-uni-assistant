import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pollDeviceLink, startDeviceLink, type DeviceLinkStart } from '@/src/auth/session';
import { DeviceQr } from '@/src/components/device-qr';
import { LanguagePicker } from '@/src/components/login-blocks';
import { Button, Mark , useResponsive } from '@ua/ui';
import { useCountdown } from '@/src/hooks/use-countdown';
import { usePolling } from '@/src/hooks/use-polling';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

type Phase = 'starting' | 'waiting' | 'approved' | 'expired' | 'error';

function describeBrowser(): string {
  if (typeof navigator === 'undefined') return 'Web-Browser';
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : 'Browser';
  const platform = /Mac/.test(agent) ? 'macOS' : /Windows/.test(agent) ? 'Windows' : /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : 'Web';
  return `${browser} · ${platform}`;
}

export function WebDeviceLogin() {
  const insets = useSafeAreaInsets();
  const locale = useAppSelector((state) => state.locale);
  const { setLocale, signInDevice } = appActions;
  const { isDesktop } = useResponsive();
  const [link, setLink] = useState<DeviceLinkStart | null>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const countdown = useCountdown(link?.expiresAt ?? null);
  const signInRef = useRef(signInDevice);

  useEffect(() => {
    signInRef.current = signInDevice;
  }, [signInDevice]);

  function retry() {
    setLink(null);
    setError(null);
    setPhase('starting');
    setGeneration((value) => value + 1);
  }

  useEffect(() => {
    let active = true;
    startDeviceLink(describeBrowser())
      .then((next) => {
        if (!active) return;
        setLink(next);
        setPhase('waiting');
      })
      .catch((startError) => {
        if (!active) return;
        setPhase('error');
        setError(startError instanceof Error ? startError.message : 'device_link_failed');
      });
    return () => {
      active = false;
    };
  }, [generation]);

  const pollToken = link?.token ?? null;
  usePolling(
    () => {
      if (!pollToken) return Promise.reject(new Error('device_link_unknown'));
      return pollDeviceLink(pollToken);
    },
    {
      delayMs: phase === 'waiting' && pollToken ? 2000 : null,
      stopOn: (result) => result.status === 'approved',
      onResult: (result) => {
        if (result.status !== 'approved') return;
        setPhase('approved');
        signInRef.current(result.session);
      },
      stopOnError: (pollError) => {
        const code = pollError instanceof Error ? pollError.message : '';
        if (code === 'device_link_expired' || code === 'device_link_consumed' || code === 'device_link_revoked' || code === 'device_link_unknown') {
          setPhase('expired');
          setError(code);
          return true;
        }
        return false;
      },
    },
  );

  const hero = (
    <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
      <Text style={styles.eyebrow}>{tx(locale, 'login.web_kicker')}</Text>
      <Text style={[styles.title, isDesktop && styles.titleDesktop]}>{tx(locale, 'login.web_titel')}</Text>
      <Text style={[styles.lead, isDesktop && styles.leadDesktop]}>{tx(locale, 'login.web_text')}</Text>
    </View>
  );

  const qrCard = (
    <View style={[styles.qrCard, isDesktop && styles.qrCardDesktop]}>
      <View style={styles.qrFrame}>
        {link ? (
          <DeviceQr value={link.pairingUrl || `universityassistant://device-link?token=${encodeURIComponent(link.token)}`} size={236} />
        ) : (
          <View style={styles.qrPlaceholder}>
            <MaterialIcons name={phase === 'error' ? 'wifi-off' : 'qr-code-2'} size={44} color={colors.mute} />
          </View>
        )}
      </View>

      {phase === 'waiting' && link ? (
        <View style={styles.statusRow}>
          <View style={styles.liveDot} />
          <Text style={styles.statusText}>{tx(locale, 'login.web_wartet', [countdown.label])}</Text>
        </View>
      ) : null}
      {phase === 'starting' ? (
        <View style={styles.statusRow}>
          <MaterialIcons name="hourglass-empty" size={16} color={colors.blue} />
          <Text style={styles.statusText}>{tx(locale, 'login.web_startet')}</Text>
        </View>
      ) : null}
      {phase === 'approved' ? (
        <View style={styles.statusRow}>
          <MaterialIcons name="check-circle" size={18} color={colors.success} />
          <Text style={styles.statusText}>{tx(locale, 'login.web_genehmigt')}</Text>
        </View>
      ) : null}
      {phase === 'expired' ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="timer-off" size={18} color={colors.warning} />
          <Text style={styles.errorText}>{tx(locale, 'login.web_abgelaufen')}</Text>
        </View>
      ) : null}
      {phase === 'error' ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="wifi-off" size={18} color={colors.warning} />
          <Text style={styles.errorText}>
            {tx(locale, error === 'server_unreachable' ? 'login.web_offline' : 'login.web_fehler')}
          </Text>
        </View>
      ) : null}

      {phase === 'expired' || phase === 'error' ? (
        <Button label={tx(locale, 'login.web_neu')} onPress={retry} />
      ) : null}
    </View>
  );

  const steps = (
    <View style={styles.steps}>
      <View style={styles.step}>
        <Text style={styles.stepNumber}>1</Text>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>{tx(locale, 'login.web_schritt1_titel')}</Text>
          <Text style={styles.stepBody}>{tx(locale, 'login.web_schritt1')}</Text>
        </View>
      </View>
      <View style={styles.step}>
        <Text style={styles.stepNumber}>2</Text>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>{tx(locale, 'login.web_schritt2_titel')}</Text>
          <Text style={styles.stepBody}>{tx(locale, 'login.web_schritt2')}</Text>
        </View>
      </View>
      <View style={styles.step}>
        <Text style={styles.stepNumber}>3</Text>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>{tx(locale, 'login.web_schritt3_titel')}</Text>
          <Text style={styles.stepBody}>{tx(locale, 'login.web_schritt3')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={[styles.center, isDesktop && styles.centerDesktop]}>
          <View style={[styles.topRow, isDesktop && styles.topRowDesktop]}>
            <View style={styles.brandRow}>
              <View style={styles.markTile}>
                <Mark size={30} />
              </View>
              <Text style={styles.brand}>University Assistant</Text>
            </View>
            <LanguagePicker locale={locale} setLocale={setLocale} />
          </View>

          {isDesktop ? (
            <View style={styles.mainDesktop}>
              <View style={styles.leftColumn}>
                {hero}
                {steps}
              </View>
              <View style={styles.rightColumn}>{qrCard}</View>
            </View>
          ) : (
            <>
              {hero}
              {qrCard}
              {steps}
            </>
          )}
        </View>

        <Pressable onPress={retry} style={styles.footHint}>
          <MaterialIcons name="refresh" size={15} color={colors.mute} />
          <Text style={styles.footHintText}>{tx(locale, 'login.web_hinweis')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.brand },
  content: { flexGrow: 1, paddingHorizontal: 20, gap: 18, alignItems: 'center' },
  center: { width: '100%', alignItems: 'center', gap: 18 },
  centerDesktop: { flexGrow: 1, justifyContent: 'center', gap: 28, paddingVertical: 20 },
  topRow: { width: '100%', maxWidth: 560, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  topRowDesktop: { maxWidth: 1040 },
  mainDesktop: {
    width: '100%',
    maxWidth: 1040,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  leftColumn: { flex: 1, minWidth: 0, gap: 24 },
  rightColumn: { width: 400, flexShrink: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  markTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  hero: { width: '100%', maxWidth: 560, gap: 8, marginTop: 12 },
  heroDesktop: { maxWidth: '100%' as const, marginTop: 0 },
  eyebrow: { color: '#CFE0F2', fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  titleDesktop: { fontSize: 42, lineHeight: 48, letterSpacing: -1.2 },
  lead: { color: '#CFE0F2', fontSize: 15, lineHeight: 22 },
  leadDesktop: { fontSize: 17, lineHeight: 25 },
  qrCard: { width: '100%', maxWidth: 560, backgroundColor: colors.paper, borderRadius: 26, padding: 22, gap: 14, alignItems: 'center' },
  qrCardDesktop: { maxWidth: 400 },
  qrFrame: { padding: 12, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E8F0' },
  qrPlaceholder: { width: 236, height: 236, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: colors.success },
  statusText: { color: colors.anthracite, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.warningSoft, borderRadius: 14, padding: 12 },
  errorText: { flex: 1, color: colors.anthracite, fontSize: 13, lineHeight: 19 },
  steps: { width: '100%', maxWidth: 560, gap: 10 },
  step: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14 },
  stepNumber: { width: 24, height: 24, borderRadius: 24, textAlign: 'center', lineHeight: 24, backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  stepBody: { color: '#CFE0F2', fontSize: 13, lineHeight: 19 },
  footHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  footHintText: { color: '#CFE0F2', fontSize: 12 },
}));
