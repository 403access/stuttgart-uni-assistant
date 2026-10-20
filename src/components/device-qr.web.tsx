import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

/** Render a QR code as a data URL. Web-only; the native app scans instead of rendering. */
export function DeviceQr({ value, size = 236 }: { value: string; size?: number }) {
  const [qr, setQr] = useState<{ value: string; uri: string } | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#001A3A', light: '#FFFFFF' },
    })
      .then((next) => {
        if (active) setQr({ value, uri: next });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [value, size]);

  const uri = qr?.value === value ? qr.uri : null;

  return (
    <View style={{ width: size, height: size, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" /> : null}
    </View>
  );
}
