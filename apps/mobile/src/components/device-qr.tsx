import { Text, View } from 'react-native';

/**
 * Native fallback. The QR code is only rendered on the web sign-in screen;
 * phones scan it from the settings screen instead.
 */
export function DeviceQr({ value }: { value: string; size?: number }) {
  return (
    <View>
      <Text selectable>{value}</Text>
    </View>
  );
}
