import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { openOfficialCampus } from '@/src/auth/oidc';
import { fetchMailStatus } from '@/src/auth/mail';
import { Button, Card, Screen } from '@/src/components/ui';
import { platformName } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { MailStatus, PlatformId } from '@/src/types';

function platformCopy(id: PlatformId, locale: 'de' | 'en'): string {
  if (id === 'campus') return tx(locale, 'plattformen.stundenplan');
  if (id === 'ilias') return tx(locale, 'plattformen.folien');
  if (id === 'sdg') return tx(locale, 'plattformen.fuesq');
  return tx(locale, 'plattformen.nutzerkonto');
}

export default function PlatformsScreen() {
  const { locale, syncAt, syncPlatform, sessionAccount, sessionMode } = useApp();
  const [mail, setMail] = useState<MailStatus | null>(null);
  const ids: PlatformId[] = ['siam', 'campus', 'ilias', 'sdg'];
  useEffect(() => {
    let active = true;
    fetchMailStatus().then((next) => {
      if (active) setMail(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Screen kicker={tx(locale, 'plattformen.anbindung')} subtitle={tx(locale, 'plattformen.c')}>
      <Stack.Screen options={{ title: tx(locale, 'common.plattformen') }} />
      {ids.map((id) => (
        <Card key={id}>
          <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>{platformName(id)}</Text>
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{platformCopy(id, locale)}</Text>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {id === 'siam'
              ? sessionMode === 'oidc'
                ? tx(locale, 'plattformen.konto_idp', [sessionAccount ?? '–'])
                : tx(locale, 'plattformen.konto', [sessionAccount ?? '–'])
              : syncAt[id]
                ? tx(locale, 'plattformen.zuletzt', [new Date(syncAt[id] as string).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB')])
                : tx(locale, 'plattformen.synchronisiert')}
          </Text>
          {id === 'campus' ? (
            <Button label={tx(locale, 'plattformen.c_mpus')} onPress={() => openOfficialCampus().catch(() => undefined)} secondary />
          ) : null}
          {id === 'siam' ? null : <Button label={tx(locale, 'plattformen.jetzt')} onPress={() => syncPlatform(id)} secondary />}
        </Card>
      ))}
      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>UniMail</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(locale, 'plattformen.uni')}
        </Text>
        <Text style={{ color: colors.blue, fontWeight: '700' }}>
          {mail === null
            ? tx(locale, 'plattformen.assistenz')
            : mail.configured
              ? tx(locale, 'plattformen.konto_imap', [mail.account ?? '–'])
              : tx(locale, 'plattformen.anmeldedaten')}
        </Text>
        <Button label={tx(locale, 'plattformen.unimail')} onPress={() => router.push('/mail')} secondary />
      </Card>
    </Screen>
  );
}
