# NFC card reader (development tool)

A read-only NFC reader for the student ID card, available only in development
builds under **Campus → Dev → NFC-Karte** (`/dev/nfc`). It exists to answer what
a phone can actually see on the card — for example when checking whether a
printer login uses the raw tag UID or data behind a key.

## What it reads

| Value | Source | Notes |
| --- | --- | --- |
| UID | `tag.id` | Shown as spaced hex bytes and as an unsigned decimal |
| Technology | `tag.tech` (iOS), `tag.techTypes` (Android) | NFC-A / MIFARE / NDEF, plus Android's full list |
| NDEF records | `tag.ndefMessage` | Type, TNF, decoded text/URI, raw payload bytes |
| Raw tag event | The unmodified `TagEvent` | Collapsible `JsonTree` |

Nothing is written to the card, nothing is persisted, and nothing is sent to the
assistant server.

## What it cannot read

Most student cards are MIFARE DESFire (or a comparable secure element). The UID,
technology, and any public NDEF message are readable without keys. Application
files and the card number stored inside a DESFire application are protected by
the university's keys and do not appear here. The tool does not guess keys or
attempt authentication.

If the printer system uses a card number behind such a key, the readable UID is
still useful for comparison, but it is not automatically the number the printer
expects.

## Code layout

| File | Purpose |
| --- | --- |
| `app/dev/nfc.tsx` | Screen: scan, cancel, result sections, error mapping |
| `src/nfc/card.ts` | Native reader: `start`, `isSupported`, `requestTechnology`, `getTag`, cleanup |
| `src/nfc/card.web.ts` | Web stub: NFC reported as unsupported, no native import |
| `src/nfc/types.ts` | `CardReading` and `CardRecord` shared by both platforms |
| `plugins/withNfc.js` | Android permission, iOS usage description, optional iOS entitlement |

The web stub exists so the Metro web bundle never pulls in
`react-native-nfc-manager`. The screen is still routable on web and shows the
unsupported message.

## Platform configuration

Android needs only the NFC permission. It is declared by the library manifest and
is also ensured by `plugins/withNfc.js`; no flag is required.

iOS needs the **NFC Tag Reading** capability, which a Personal Team cannot sign.
The plugin therefore always writes `NFCReaderUsageDescription` (the prompt stays
compliant) but writes
`com.apple.developer.nfc.readersession.formats` only when the flag is set:

```bash
EXPO_ENABLE_IOS_NFC=1 npx expo prebuild --clean
npx expo run:ios --device
```

Without the flag the app is signable with a free account; starting a reader
session fails, and the screen reports the missing entitlement instead of showing
the native error.

Enabling the flag is not enough by itself: the App ID must also have **NFC Tag
Reading** turned on in the Apple Developer portal (or under Xcode → Signing &
Capabilities). Automatic signing did not add the capability to the existing App
ID on this machine. See
[ios-distribution.md](ios-distribution.md#why-prebuild-used-to-be-a-trap).

Android, iOS simulators, and the web build:

| Target | Default build | With `EXPO_ENABLE_IOS_NFC=1` |
| --- | --- | --- |
| Android device | Works | Works (unchanged) |
| iOS device, Personal Team | Screen reports missing entitlement | Cannot sign |
| iOS device, paid team + App ID capability | Screen reports missing entitlement | Works |
| iOS simulator / web | Unsupported | Unsupported |

## Testing

1. Build a development client on a physical NFC-capable phone (`npx expo run:ios
   --device` or `npx expo run:android --device`). Expo Go cannot load the native
   module.
2. Open **Campus → Dev → NFC-Karte**.
3. Tap **Karte scannen** and hold the card against the top of the phone.
4. Check the UID, technology, NDEF section, and raw event.

A normal scan ends as soon as the tag connects. **Abbrechen** ends the reader
session; leaving the screen also cancels it. Expected failures are a missing iOS
entitlement, no card detected, and a user-cancelled session.

## Privacy

The card is read only after an explicit tap, in the foreground. The screen does
not include the UID or payloads in logs, does not store them, and does not send
them anywhere. There is no background tag reading.
