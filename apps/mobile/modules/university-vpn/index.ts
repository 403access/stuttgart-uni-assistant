import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Control surface of the in-app tunnel.
 *
 * `null` in Expo Go, on web, and in any build that does not compile the local
 * module in. The app layer in `src/vpn/native.ts` reads this and reports the
 * truth instead of pretending to connect. See docs/engineering/vpn-tunnel.md.
 */
export default requireOptionalNativeModule('UniversityVpn');
