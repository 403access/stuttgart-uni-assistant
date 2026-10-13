import { Text } from 'react-native';

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
    de: 'Die Sitzung gilt nur auf diesem Gerät. Ein produktiver Anschluss wäre OpenID Connect, serverseitig.',
    en: 'The session is valid only on this device. A production connection would be OpenID Connect, server-side.',
  },
};

export default function PlatformsScreen() {
  const { locale, syncAt, syncPlatform, sessionAccount } = useApp();
  const ids: PlatformId[] = ['siam', 'campus', 'ilias', 'sdg'];
  return (
    <Screen back kicker={tx(locale, 'Anbindung', 'Connections')} title={tx(locale, 'Plattformen', 'Platforms')} subtitle={tx(locale, 'Nichts verlässt das Gerät. Sync aktualisiert nur den lokalen Zeitstempel.', 'Nothing leaves the device. Sync only refreshes the local timestamp.')}>
      {ids.map((id) => (
        <Card key={id}>
          <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>{platformName(id)}</Text>
          <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{copy[id][locale]}</Text>
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {id === 'siam'
              ? tx(locale, `Konto ${sessionAccount ?? '–'} · lokal`, `Account ${sessionAccount ?? '–'} · local`)
              : syncAt[id]
                ? tx(locale, `Zuletzt markiert ${new Date(syncAt[id] as string).toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB')}`, `Last marked ${new Date(syncAt[id] as string).toLocaleString('en-GB')}`)
                : tx(locale, 'Noch nicht synchronisiert', 'Not synced yet')}
          </Text>
          {id === 'siam' ? null : <Button label={tx(locale, 'Jetzt synchronisieren', 'Sync now')} onPress={() => syncPlatform(id)} secondary />}
        </Card>
      ))}
    </Screen>
  );
}
