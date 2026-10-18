import * as WebBrowser from 'expo-web-browser';

import { Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { tx } from '@/src/text';

WebBrowser.maybeCompleteAuthSession();

export default function OidcReturnScreen() {
  const { locale } = useApp();
  return (
    <Screen
      topInset
      title={tx(locale, 'common.anmeldung_2')}
      subtitle={tx(locale, 'oidc.wenn')}
    >
      {null}
    </Screen>
  );
}
