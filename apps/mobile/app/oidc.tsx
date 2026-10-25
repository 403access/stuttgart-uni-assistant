import * as WebBrowser from 'expo-web-browser';

import { Screen } from '@ua/ui';
import { useAppSelector } from '@/src/state/AppState';
import { tx } from '@ua/core/format';

WebBrowser.maybeCompleteAuthSession();

export default function OidcReturnScreen() {
  const locale = useAppSelector((state) => state.locale);
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
