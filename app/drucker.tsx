import { Stack, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Text, View } from 'react-native';

import { Button, Card, Screen, Section } from '@/src/components/ui';
import { campusName } from '@/src/labels';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import { pick, tx } from '@/src/text';
import { printerLinks, printerLocations, printerPrices, type PrinterPrice } from '@/src/vpn/printer';
import type { Locale } from '@/src/types';

function open(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

function formatCents(cents: number, locale: Locale): string {
  const value = (cents / 100).toFixed(2).replace('.', locale === 'de' ? ',' : '.');
  return `${value} €`;
}

function priceLabel(price: PrinterPrice, locale: Locale): string {
  const mode = price.mode === 'grayscale' ? tx(locale, 'drucker.preis.grau') : tx(locale, 'drucker.preis.farbe');
  const duplex = price.duplex ? tx(locale, 'drucker.preis.doppelseitig') : tx(locale, 'drucker.preis.einseitig');
  return `${price.paper} · ${mode} · ${duplex}`;
}

/** Numbered instruction line inside a card. */
function Step({ index, text }: { index: number; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Text style={{ color: colors.blue, fontWeight: '700', minWidth: 18 }}>{index}.</Text>
      <Text style={{ color: colors.inkSoft, lineHeight: 20, flex: 1 }}>{text}</Text>
    </View>
  );
}

export default function PrinterScreen() {
  const { locale } = useApp();

  return (
    <Screen kicker="stuvus" title={tx(locale, 'drucker.title')} subtitle={tx(locale, 'drucker.subtitle')}>
      <Stack.Screen options={{ title: tx(locale, 'drucker.drucken') }} />

      <Card>
        <Text style={{ color: colors.anthracite, fontSize: 18, fontWeight: '700' }}>{tx(locale, 'drucker.netz_titel')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.netz_text')}</Text>
        <Button label={tx(locale, 'drucker.netz_vpn')} onPress={() => router.push('/vpn')} />
      </Card>

      <Section title={tx(locale, 'drucker.register')} />
      <Card>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.register_text')}</Text>
        <Step index={1} text={tx(locale, 'drucker.register_1')} />
        <Step index={2} text={tx(locale, 'drucker.register_2')} />
        <Step index={3} text={tx(locale, 'drucker.register_3')} />
        <Step index={4} text={tx(locale, 'drucker.register_4')} />
        <Button label={tx(locale, 'drucker.portal')} onPress={() => open(printerLinks.portal)} />
      </Card>

      <Section title={tx(locale, 'drucker.guthaben')} />
      <Card>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.guthaben_text')}</Text>
      </Card>

      <Section title={tx(locale, 'drucker.preise')} />
      <Card>
        {printerPrices.map((price) => (
          <View key={`${price.paper}-${price.mode}-${price.duplex}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.anthracite, flex: 1 }}>{priceLabel(price, locale)}</Text>
            <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{formatCents(price.cents, locale)}</Text>
          </View>
        ))}
        <Text style={{ color: colors.mute, lineHeight: 20 }}>{tx(locale, 'drucker.preis_hinweis')}</Text>
      </Card>

      <Section title={tx(locale, 'drucker.drucken')} />
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'drucker.mobil')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.mobil_text')}</Text>
        <Step index={1} text={tx(locale, 'drucker.mobil_1')} />
        <Step index={2} text={tx(locale, 'drucker.mobil_2')} />
        <Step index={3} text={tx(locale, 'drucker.mobil_3')} />
        <Button label="Mobility Print" onPress={() => open(printerLinks.mobilitySetup)} secondary />
      </Card>
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'drucker.webprint')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.webprint_text')}</Text>
        <Button label={tx(locale, 'drucker.portal')} onPress={() => open(printerLinks.portal)} secondary />
      </Card>
      <Card>
        <Text style={{ color: colors.anthracite, fontWeight: '700' }}>{tx(locale, 'drucker.usb')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.usb_text')}</Text>
      </Card>

      <Section title={tx(locale, 'drucker.scannen')} />
      <Card>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.scan_mail')}</Text>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.scan_usb')}</Text>
      </Card>

      <Section title={tx(locale, 'drucker.freigabe')} />
      <Card>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.freigabe_text')}</Text>
        <Button label={tx(locale, 'drucker.portal')} onPress={() => open(printerLinks.release)} secondary />
      </Card>

      <Section title={tx(locale, 'drucker.standorte')} />
      <Card>
        {printerLocations.map((location) => (
          <View key={location.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.anthracite, flex: 1 }}>{pick(location.name, locale)}</Text>
            <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '700' }}>{campusName(location.campus, locale)}</Text>
          </View>
        ))}
      </Card>

      <Section title={tx(locale, 'drucker.probleme')} />
      <Card>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>{tx(locale, 'drucker.problem_text')}</Text>
        <Button label={printerLinks.support} onPress={() => Linking.openURL(`mailto:${printerLinks.support}`).catch(() => undefined)} secondary />
        <Button label={tx(locale, 'drucker.anleitung')} onPress={() => open(printerLinks.guide)} secondary />
      </Card>
    </Screen>
  );
}
