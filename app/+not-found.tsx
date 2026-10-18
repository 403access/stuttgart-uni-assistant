import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'University Assistant', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Diese Seite gibt es nicht.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Zur Startseite</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.mist, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.anthracite },
  link: { paddingVertical: 8 },
  linkText: { color: colors.blue, fontSize: 16, fontWeight: '700' },
});
