import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { fetchCampusStatus } from '@/src/auth/campus';
import { endUniversitySession, openOfficialCampus, universityUrls } from '@/src/auth/oidc';
import { findPlatform, initialsFor } from '@/src/auth/user';
import { clearLogin } from '@/src/auth/vault';
import { Button, Card, InfoRow, Pill, Screen, Section, listPosition } from '@/src/components/ui';
import { platformName } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { AccountPlatformId, PlatformId, PlatformLink } from '@/src/types';

/** The platforms one account can carry, in the order they read best. */
const PLATFORM_ORDER: AccountPlatformId[] = ['campus', 'ilias', 'sdg', 'siam', 'mail'];

function platformTitle(id: AccountPlatformId): string {
  return id === 'mail' ? 'UniMail' : platformName(id);
}

function platformDescription(id: AccountPlatformId, locale: 'de' | 'en'): string {
  if (id === 'campus') return tx(locale, 'konto.campus');
  if (id === 'ilias') return tx(locale, 'konto.ilias');
  if (id === 'sdg') return tx(locale, 'konto.sdg');
  if (id === 'siam') return tx(locale, 'konto.siam');
  return tx(locale, 'konto.mail');
}

function statusLabel(link: PlatformLink | null, locale: 'de' | 'en', campusActive: boolean | null = null): string {
  if (!link) return tx(locale, 'konto.nicht_verknuepft');
  if (link.id === 'campus' && campusActive === false) return tx(locale, 'konto.erneut_verbinden');
  return link.status === 'connected' ? tx(locale, 'konto.verbunden') : tx(locale, 'konto.verknuepft');
}

function modeLabel(mode: string, locale: 'de' | 'en'): string {
  if (mode === 'campus') return tx(locale, 'konto.modus.campus');
  if (mode === 'oidc') return tx(locale, 'konto.modus.oidc');
  if (mode === 'demo') return tx(locale, 'konto.modus.demo');
  return tx(locale, 'konto.modus.local');
}

function formatStamp(value: string | null, locale: 'de' | 'en'): string {
  if (!value) return tx(locale, 'konto.nie');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AccountScreen() {
  const { locale, user, authToken, sessionMode, oidcSessionId, syncAt, syncPlatform, syncAccount, signOut } = useApp();
  const [campusActive, setCampusActive] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetchCampusStatus()
      .then((status) => {
        if (active) setCampusActive(status?.credentialActive ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.id, authToken]);

  async function leave() {
    if (sessionMode === 'oidc') await endUniversitySession(oidcSessionId);
    await clearLogin();
    signOut();
  }

  function run(platform: AccountPlatformId) {
    if (platform === 'mail') {
      router.push('/mail-verbindung');
      return;
    }
    if (platform === 'campus') {
      // The server drops a browser-harvested portal session on restart. The
      // only safe way to mint a new one is the sign-in flow, so send the user
      // back there instead of silently opening the portal.
      if (campusActive === false) {
        void leave();
        return;
      }
      void openOfficialCampus();
      return;
    }
    void syncAccount(platform);
    syncPlatform(platform as PlatformId);
  }

  const online = authToken !== null;

  return (
    <Screen kicker={tx(locale, 'konto.kicker')} subtitle={tx(locale, 'konto.subtitle')}>
      <Stack.Screen options={{ title: tx(locale, 'common.konto') }} />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFor(user)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.anthracite, fontSize: 22, fontWeight: '700' }}>
              {user?.name ?? user?.account ?? tx(locale, 'konto.unbekannt')}
            </Text>
            <Text style={{ color: colors.inkSoft }}>{user?.account ?? tx(locale, 'konto.unbekannt')}</Text>
            {user?.email ? <Text style={{ color: colors.inkSoft }}>{user.email}</Text> : null}
          </View>
          <Pill label={online ? tx(locale, 'konto.online') : tx(locale, 'konto.offline_kurz')} tone={online ? 'ok' : 'wait'} />
        </View>
        <Text style={{ color: colors.inkSoft, lineHeight: 20, marginTop: 4 }}>
          {tx(locale, 'konto.ein_konto_text')}
        </Text>
      </Card>

      <Section title={tx(locale, 'konto.plattformen')} />
      <View>
        {PLATFORM_ORDER.map((id, index) => {
          const link = findPlatform(user, id);
          const lastTouch = id === 'mail' ? link?.lastSyncAt : syncAt[id as PlatformId] ?? link?.lastSyncAt ?? null;
          const reconnect = id === 'campus' && campusActive === false;
          return (
            <InfoRow
              key={id}
              title={platformTitle(id)}
              meta={statusLabel(link, locale, campusActive)}
              detail={`${platformDescription(id, locale)}${lastTouch ? ` · ${tx(locale, 'konto.zuletzt', [formatStamp(lastTouch, locale)])}` : ''}${reconnect ? ` · ${tx(locale, 'konto.sitzung_abgelaufen')}` : ''}`}
              position={listPosition(index, PLATFORM_ORDER.length)}
              onPress={() => run(id)}
            />
          );
        })}
      </View>
      <Section title={tx(locale, 'konto.details')} />
      <View>
        <InfoRow title={tx(locale, 'konto.name')} meta={user?.name ?? tx(locale, 'konto.unbekannt')} position="first" />
        <InfoRow title={tx(locale, 'konto.kennung')} meta={user?.account ?? tx(locale, 'konto.unbekannt')} position="middle" />
        <InfoRow title={tx(locale, 'konto.email')} meta={user?.email ?? tx(locale, 'konto.unbekannt')} position="middle" />
        <InfoRow title={tx(locale, 'konto.matrikel')} meta={user?.matriculation ?? tx(locale, 'konto.unbekannt')} position="middle" />
        <InfoRow title={tx(locale, 'konto.angemeldet_ueber')} meta={modeLabel(user?.mode ?? sessionMode ?? 'local', locale)} position="middle" />
        <InfoRow title={tx(locale, 'konto.seit')} meta={formatStamp(user?.createdAt ?? null, locale)} position="middle" />
        <InfoRow title={tx(locale, 'konto.letzte_anmeldung')} meta={formatStamp(user?.lastLoginAt ?? null, locale)} position="last" />
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialIcons name="lock-outline" size={18} color={colors.blue} />
          <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'konto.sitzung')}</Text>
        </View>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'konto.sitzung_text')}</Text>
        <Text style={{ color: colors.inkSoft, fontSize: 12 }}>{universityUrls.issuer}</Text>
      </Card>

      <View style={{ gap: 8 }}>
        <Button label={tx(locale, 'konto.wechseln')} onPress={() => void leave()} secondary />
        <Button label={tx(locale, 'konto.abmelden')} onPress={() => void leave()} />
      </View>
      <Text style={{ color: colors.mute, fontSize: 12, lineHeight: 18 }}>{tx(locale, 'konto.wechseln_text')}</Text>
    </Screen>
  );
}

const styles = {
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.blueSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: { color: colors.blue, fontSize: 20, fontWeight: '700' as const },
} as const;
