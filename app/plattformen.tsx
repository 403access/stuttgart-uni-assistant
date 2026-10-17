import { Stack } from 'expo-router';
import { Text } from 'react-native';

import { openOfficialCampus } from '@/src/auth/oidc';
import { Button, Card, Screen } from '@/src/components/ui';
import { platformName } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { tx } from '@/src/text';
import type { PlatformId } from '@/src/types';

const copy: Record<PlatformId, { de: string; en: string }> = {
  campus: {
    de: 'Stundenplan, Noten, Prüfungsanmeldung, Modulhandbuch und amtliche Hinweise. In dieser Fassung ein lokaler Abzug.',
    en: 'Timetable, grades, exam registration, module handbook, and official notices. In this build, a local extract.',
  },
  ilias: {
    de: 'Folien, Übungsblätter und Forenhinweise der belegten Kurse. Synchronisieren legt sie als offline markiert ab.',
    en: 'Slides, exercise sheets, and forum notes from enrolled courses. Sync marks them as saved offline.',
  },
  sdg: {
    de: 'FÜSQ-Katalog und Belegung der Schlüsselqualifikationen, darunter der Nachhaltigkeitskurs.',
    en: 'Key-competency catalogue and enrollment, including the sustainability course.',
  },
  siam: {
    de: 'Nutzerkonto im Identitätsmanagement. Die Anmeldung öffnet den OIDC-Endpunkt des TIK, https://idp.uni-stuttgart.de/idp/profile/oidc/authorize. C@MPUS unter https://campus.uni-stuttgart.de/ verwendet denselben Provider.',
    en: 'Account in the identity management. Sign-in opens the TIK OIDC endpoint, https://idp.uni-stuttgart.de/idp/profile/oidc/authorize. C@MPUS at https://campus.uni-stuttgart.de/ uses the same provider.',
  },
};

export default function PlatformsScreen() {
  const { locale, syncAt, syncPlatform, sessionAccount, sessionMode } = useApp();
  const ids: PlatformId[] = ['siam', 'campus', 'ilias', 'sdg'];
  return (
    <Screen kicker={tx(locale, 'Anbindung', 'Connections')} subtitle={tx(locale, 'C@MPUS, ILIAS und SDG Campus bleiben lokal. SIAM öffnet den Identity Provider im Browser.', 'C@MPUS, ILIAS, and SDG Campus stay local. SIAM opens the identity provider in the browser.')}>
      <Stack.Screen options={{ title: tx(locale, 'Plattformen', 'Platforms') }} />
      {ids.map((id) => (
        <Card key={id}>
          <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>{platformName(id)}</Text>
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{copy[id][locale]}</Text>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {id === 'siam'
              ? tx(
                  locale,
                  sessionMode === 'oidc' ? `Konto ${sessionAccount ?? '–'} · IdP` : `Konto ${sessionAccount ?? '–'} · Demonstration`,
                  sessionMode === 'oidc' ? `Account ${sessionAccount ?? '–'} · IdP` : `Account ${sessionAccount ?? '–'} · demonstration`,
                )
              : syncAt[id]
                ? tx(locale, `Zuletzt markiert ${new Date(syncAt[id] as string).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB')}`, `Last marked ${new Date(syncAt[id] as string).toLocaleString('en-GB')}`)
                : tx(locale, 'Noch nicht synchronisiert', 'Not synced yet')}
          </Text>
          {id === 'campus' ? (
            <Button label={tx(locale, 'C@MPUS öffnen', 'Open C@MPUS')} onPress={() => openOfficialCampus().catch(() => undefined)} secondary />
          ) : null}
          {id === 'siam' ? null : <Button label={tx(locale, 'Jetzt synchronisieren', 'Sync now')} onPress={() => syncPlatform(id)} secondary />}
        </Card>
      ))}
    </Screen>
  );
}
