# Documents, notices, settings, and your data

## The Campus tab

**Campus** is the app's settings and services tab. Its items are grouped into **Campus**, **Studium**, **Austausch**, and **App**, one card per item. A magnifier icon at the top right opens a search field that filters the items as you type; it matches each item's title, its description, and its tags, so `email`, `E-Mail`, and `unimail` all find **E-Mail**. Categories with no match are hidden.

**Studium → Kalender-Import** pulls your personal C@MPUS calendar into the app (ICS or CSV) or syncs it into the device database, and lists a history of past imports (see [campus-calendar-export](../engineering/campus-calendar-export.md)).

## Documents (Document Hub)

**Campus → Dokumente** opens the document hub over the bundled ILIAS texts and your own notes.

| What you do | How | What it does |
| --- | --- | --- |
| Save ILIAS material | One tap in the list | Marks the bundled ILIAS texts as downloaded on this device. There is no background download from a server. |
| Read a document | Tap it | The reader. Bundled pages are bilingual, so switching the language swaps the text immediately. |
| Summarize | Reader menu | A summary first from the text itself; if the assistant server answers, it is rewritten in the same way chat answers are. Plain language (Leichte Sprache) works the same. |
| Ask about it | Reader → chat with `?doc=` | Chat opens focused on this document and answers questions about its content. |
| Import your own file | Import in the hub | The system document picker reads text, Markdown, CSV, and JSON. A PDF is kept by name with a note that text extraction is not in this build. |
| Export | Reader → export | Writes the text out as `.txt` through the share sheet, or a download on web. |
| Share with peers | Mark an item shared | Peers on **this device** see it under Kommilitonen. There is no transfer between phones in this build. |

## Notices (Meldungen)

**Campus → Meldungen** lists the news feed: items from the university, the faculty, an institute, stuvus, and SDG Campus. Tap an item for its own screen. On **Heute** the two newest items appear as a preview.

## Security (Sicherheit)

The **App** group has its own **Sicherheit / Security** item. It opens a dedicated screen with the biometric App Lock:

| Control | What it does |
| --- | --- |
| Biometrie / Biometrics | Unlock the app with Face ID or a fingerprint after launch and when returning from the background. The screen leads with a state — **Aktiv**, **Nicht geschützt**, **Einrichtung fehlt**, or **Nicht verfügbar** — and the switch is always present. When no biometric is enrolled, the screen explains whether the device has no sensor or has one that is not set up yet. **Erneut prüfen / Check again** re-reads the device after returning from system settings. |

If biometrics are removed later, the lock is still driven by the saved preference; the system prompt can fall back to the device passcode, and sign-out stays available on the lock screen. The preference can be turned off on the same screen.

Enabling the lock requires a real Face ID or fingerprint check. Unlocking follows the system default, so the OS may ask for the device passcode when biometrics are unavailable. If Face ID is disabled for the app or nothing is enrolled, the onboarding page stays open with the reason and a **Systemeinstellungen öffnen** action instead of silently skipping the step.

## Settings (Einstellungen)

| Setting | What it does |
| --- | --- |
| Sprache / Language | German or English. Every bundled string follows immediately; nothing reloads. |
| Daten / Data | Reset local notes, chat history, reviews, recognition drafts, downloads, sync stamps, and planned modules. Language, the signed-in session, onboarding completion, and the biometric preference stay. |
| Hinweis | The demonstration notice, in the app itself: this is a student project and not a service of the University of Stuttgart, and it does not use the university logo. |

**Campus → Schnittstelle (Interface)** is visible only in development builds. It lists the assistant server routes and can send the replayable ones — mostly useful when working on the server itself.

## Signing out

Sign-out lives on the account screen (**Campus → Konto**) and in this list. It revokes the server session, deletes the device session token, clears the stored C@MPUS password, and returns to the sign-in screen. The language stays set. If the server holds mail credentials, signing out clears them from the server too. Onboarding completion and the biometric app-lock preference are device settings, so they stay; a later sign-in on this device is covered by the same lock.

## What is stored about you

| Data | Where it lives |
| --- | --- |
| Session, profile answers, notes, reviews, chat, planned modules, recognition drafts | One AsyncStorage entry on this device, capped sizes (chat at 40 messages) |
| Onboarding completion and biometric app-lock preference | AsyncStorage key `university-assistant/onboarding.v2`. Device-level, not account-level; no biometric data is stored and nothing is sent to the server. |
| C@MPUS curriculum and course caches | An on-device SQLite database (AsyncStorage on web), one entry per study |
| University e-mail password | Server process memory only. Not on the device, not in `.env`, not logged. |
| The university password for C@MPUS sign-in | The device vault, only if `Auf diesem Gerät speichern` was enabled: iOS keychain / Android Keystore, optionally behind biometrics, deleted on sign-out. Never sent to the assistant server. |
| Grok answers | The request lives only for its duration; nothing is persisted server-side |

The reset and the demonstration notice exist so that a reviewer can check these claims on the phone itself. The engineering side of this list is documented in [security-and-privacy](../engineering/security-and-privacy.md).
