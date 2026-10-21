import { Stack } from 'expo-router';

import { ChoiceCard } from '@/src/components/choice-card';
import { Screen } from '@/src/components/ui';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { tx } from '@/src/text';

/** Dedicated language screen reached from the App group on the Campus tab. */
export default function LanguageScreen() {
  const locale = useAppSelector((state) => state.locale);
  const { setLocale } = appActions;
  return (
    <Screen
      kicker={tx(locale, 'common.app')}
      title={tx(locale, 'einstellungen.sprache')}
      subtitle={tx(locale, 'einstellungen.sprache_hinweis')}>
      <Stack.Screen options={{ title: tx(locale, 'einstellungen.sprache') }} />
      <ChoiceCard icon="language" label="Deutsch" active={locale === 'de'} onPress={() => setLocale('de')} />
      <ChoiceCard icon="language" label="English" active={locale === 'en'} onPress={() => setLocale('en')} />
    </Screen>
  );
}
