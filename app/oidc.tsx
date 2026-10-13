import * as WebBrowser from 'expo-web-browser';

import { Screen } from '@/src/components/ui';
import { useApp } from '@/src/state/AppState';
import { tx } from '@/src/text';

WebBrowser.maybeCompleteAuthSession();

export default function OidcReturnScreen() {
  const { locale } = useApp();
  return (
    <Screen
      title={tx(locale, 'Anmeldung', 'Sign-in')}
      subtitle={tx(
        locale,
        'Wenn sich dieses Fenster nicht schließt, wechsle zurück zur App. Die Universität hat die Anmeldung an diese Adresse zurückgeschickt.',
        'If this window does not close, switch back to the app. The university sent the sign-in back to this address.',
      )}
    >
      {null}
    </Screen>
  );
}
