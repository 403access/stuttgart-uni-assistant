# Design system

The interface follows the university's published corporate colors and an original mark. It does not reproduce the Stankowski signet, and it does not embed the licensed Univers typeface. The platform UI font is used throughout.

`userInterfaceStyle` is `light` in `app.json`. The web document background matches the app mist color so a dark-mode browser does not flash black.

## Color

Defined in `src/theme.ts`.

| Token | Hex | Use |
| --- | --- | --- |
| `anthracite` | `#323232` | Primary text, tab labels when active |
| `blue` | `#004191` | Actions, links, splash, adaptive icon ground |
| `blueSoft` | `#E6EEF7` | Selected chips, info pills |
| `light` | `#00BEFF` | The small circle in the mark, highlights |
| `lightSoft` | `#E5F8FF` | Light-blue wash |
| `paper` | `#FFFFFF` | Cards |
| `mist` | `#F3F6F8` | Screen background |
| `line` | `#E1E5E8` | Hairlines |
| `inkSoft` | `#5E666E` | Secondary text |
| `mute` | `#8B939A` | Meta text |
| `success` / `successSoft` | `#1C6B45` / `#E5F4EC` | Passed, open seats |
| `warning` / `warningSoft` | `#8A5A00` / `#FBF3E4` | Locked, caution on recognition |
| `danger` / `dangerSoft` | `#8E2F2F` / `#F8E8E8` | Destructive or overdue emphasis |

Screen padding is 20. Card padding is 16.

Official names stay official in both languages: C@MPUS, ILIAS, SIAM, SDG Campus, stuvus, FÜSQ, Prüfungsordnung.

## Mark

`Mark` in `src/components/ui.tsx` draws two circles: a mid-blue disc and a smaller light-blue disc. It is the splash and header motif. Do not replace it with the university logo.

The icons under `assets/images/` are built from that same mark, not a template. `scripts/generate-icons.mjs` (`bun run icons`) renders them with no image library: the large disc in white and the small disc in `colors.light`, on the `colors.blue` ground, so the pair stays legible on the splash and the adaptive background. The Android foreground and the theme monochrome keep the mark inside the launcher safe zone. It is an original mark, not the signet.

## Type

System font. German copy uses the local conventions in `src/text.ts`:

- Dates: `13.10.2026` in German, `13 Oct 2026` in English.
- Grades: a comma in German (`1,9`), a point in English (`1.9`).

Strings that the student sees are `Localized` objects (`de` and `en`) or they pass through `tx`. The language toggle in Einstellungen is the only switch. German is the default when storage is empty.

## Components

`src/components/ui.tsx` is the set screens actually share.

| Piece | Role |
| --- | --- |
| `Screen` | Safe area, mist background, scroll, optional title |
| `Card` | White surface. Pressable when an `onPress` is set |
| `Section` | Heading over a group |
| `Pill` | Status chip. Tones map to the soft colors above |
| `Meter` | ECTS progress inside an area |
| `Button` | Primary mid-blue action, or a quiet variant |
| `SearchField` | Bordered text field; `compact` trims the padding for a toolbar row |
| `FieldLabel`, `Muted`, `Strong`, `InfoRow` | Form and definition-list text |

Tab icons in `app/(tabs)/_layout.tsx` are drawn views, not an icon font: a small geometric mark per tab. The five labels are Heute, Studium, Chat, Campus, and Mehr, translated with `tx`.

## Screen patterns

- One primary idea per card. Heute stacks a credit card, today's sessions, deadlines, and news as separate cards.
- A locked module uses the warning tone and a sentence ("Noch nicht belegbar"), not only a disabled control.
- Demo boundaries are visible copy: the login banner, the schematic-map label, the "not a live C@MPUS extract" line in assistant answers, and the PDF note when a file has no text layer.
- Stack screens keep a back affordance in the screen header. The navigator header is hidden so the mark and the language stay consistent.
- Empty chat explains that answers come from the demonstration record.

## Map

Campus is not a map SDK. Dots are absolutely positioned from each place's `x` and `y`. The caption says the drawing is schematic. Addresses on the room screen are the orientation, not a walking route.

## Motion and splash

The splash background is `#004191`. It hides only after storage has loaded and the route agrees with the session. Entrance animation is limited to the toast slide in `src/components/toast.tsx`, core `Animated` with `useNativeDriver`. Reanimated is a dependency of the Expo template and is not used for feature motion in this build.

## Waiting states

A sign-in takes ten to thirty seconds when it runs in the hidden `WebView`, and a frozen screen reads as a broken app. `src/components/signing-in.tsx` covers that wait:

- The mark from `ui.tsx` is rebuilt as an orbiting pair: the light circle sweeps around the blue one, with a halo that expands and fades on the same 2.6 s cycle. It is the app's own mark, not a generic spinner.
- Below it, the four phases from `src/auth/campus-progress.ts` — `connect`, `identify`, `adopt`, `profile` — fill in as the page script reports its steps. Completed phases take a check, the active one pulses. Seeing *what* is running is what reduces the perceived wait, so the component is fed the real steps and not a timer.
- `accessibilityRole="progressbar"` with the phase as the label, `accessibilityLiveRegion="polite"` on the visible status text, and no motion at all when the platform reports reduced motion (`AccessibilityInfo.isReduceMotionEnabled`): the phases and their checks stay, the orbit and the pulse stop.
- A `compact` variant sits inline under a button for the shorter waits (token sign-in, the SIAM redirect, the visible browser's harvest).

The phase mapping is pure and covered by `scripts/campus-progress.test.mjs`, which `bun run check` runs: a mis-mapped step would show a finished sign-in as still connecting, or move the progress backwards.

## Writing

Short labels. German is the voice of the default interface: "Anforderungen", "Anrechnung", "Altklausuren", "Kommilitonen", "Fristen". English is a full second set of the same strings, not a partial overlay. The assistant answers in the active language in both engines.
