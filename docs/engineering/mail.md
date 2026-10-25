# UniMail (e-mail) integration

University e-mail runs on the Exchange service of IZUS/TIK. The browser surface is
`https://mail.uni-stuttgart.de/` (login with the short user id, `st…` for students, `ac…`
for staff). For mail clients TIK documents `imap.uni-stuttgart.de:993` and
`smtp.uni-stuttgart.de:587` (STARTTLS) with the same account; these are the interfaces
this feature uses, because they are published precisely for third-party mail programs and
stay stable while OWA markup would not.

## Screens

Three surfaces share one snapshot (`subscribeMailSnapshot` in `apps/mobile/src/auth/mail.ts`):

- **Messages tab** (`apps/mobile/app/(tabs)/mail.tsx`): while not connected it shows the credential
  form; once connected it becomes a clean inbox — subject, sender, date, read/unread dot,
  tap a row to open the read view (see below). The sticky control bar (pinned while the
  inbox scrolls under it) is one row: a **burger button** opens the left mailbox drawer
  (Posteingang, Gesendet, Entwürfe, … — the real folder list comes from an IMAP `LIST`;
  names travel in modified UTF-7, the server returns raw `name` plus decoded `display`,
  so `Gel&APY-schte` shows as `Gelöschte` while `SELECT` uses the raw form, and repeated
  listings dedupe). Recognized mailboxes are ordered
  Posteingang → Gesendet → Entwürfe → Archiv → Junk → Papierkorb, the account's own
  folders follow by name; when both kinds exist the drawer labels them "Postfächer" and
  "Eigene Ordner" (a single kind stays a flat list). Search fills the middle, the sort
  dropdown keeps its compact sheet, and the **filter button** on the right edge opens
  the sender drawer. Both drawers are `react-native-drawer-layout` (the implementation
  Expo Router ships with SDK 56+) and reuse the sheet's title, grouped rows, counts, and
  checkmarks. The 60-second fetching interval (`REFRESH_INTERVAL_MS`) refreshes quietly
  while connected. The filter and sort options are inferred
  from the loaded rows only: "Neu" with the unread count appears when unread rows exist,
  one entry per distinct sender (with its row count), "Älteste" when any date parsed,
  "Absender" with two or more senders, "Neu zuerst" while unread rows exist. The stored
  selection is intent only; the effective value is derived in render, so a refresh that
  removes the variety silently falls back to newest.
- **Compose screen** (`apps/mobile/app/mail-verfassen.tsx`, pushed from the toolbar pencil or the
  read view's reply/forward actions): recipient chips with an address-book dropdown
  (lecturers, mailbox contacts, recent recipients — each with source badges), Cc/Bcc,
  subject, plain-text body, templates, attachments, autosaved drafts and the send action.
  The recipient registry is derived in `apps/mobile/src/mail/recipients.ts`; drafts and history live
  in `apps/mobile/src/mail/draft-storage.ts` / `apps/mobile/src/mail/recent-recipients.ts`.
- **Connection screen** (`apps/mobile/app/mail-verbindung.tsx`, pushed outside the tabs): the status
  card with the two actions "Posteingang aktualisieren" and "Verbindung lösen". Both
  screens apply each other's results through the published snapshot, so dropping the
  connection on this screen immediately restores the sign-in form in the tab, and a
  refresh here is visible in the inbox the moment the user comes back.

```text
Student → app (list, read flag, compose) → assistant server (process memory)
        → imap.uni-stuttgart.de:993 / smtp.uni-stuttgart.de:587
```

## Modules

`apps/server/mail.mjs` is the stable public facade for routes and tests. The
implementation lives in `apps/server/mail/`:

| File | Responsibility |
| --- | --- |
| `config.mjs` | Endpoints, limits, process state (credentials, body cache, send guard), failure and quoting helpers |
| `session.mjs` | TLS IMAP session, `LOGIN`/`LOGOUT` wrapper, literal-capable commands |
| `accounts.mjs` | Credential proof, account/address normalisation, public status |
| `folders.mjs` | `LIST` parsing, modified UTF-7, folder ordering |
| `inbox.mjs` | Message rows: headers, flags, preview and `FETCH` parsing |
| `body.mjs` | `BODYSTRUCTURE` part selection and full body reads |
| `parse.mjs` | Pure header/RFC 2047/BODYSTRUCTURE/HTML parsing shared by inbox and body |
| `send.mjs` | Read flag, SMTP submission, Sent copy |

## Flow

1. **Credentials** (`apps/mobile/app/login.tsx` via `apps/mobile/src/auth/use-login-flow.ts`, then
   `apps/mobile/app/(tabs)/mail.tsx`). A successful automated C@MPUS sign-in already holds the
   st-account and password, so the flow posts them here automatically and the Messages
   tab opens already connected; the same submission runs when the tab's credential form
   is used, where the account is prefilled from the session and only the password is
   asked for. Either way both values are `POST`ed to the assistant server.
2. **Proof and keep** (`POST /v1/mail/credentials`, `apps/server/mail/accounts.mjs`). The server
   normalizes the long form (`st123456@stud.uni-stuttgart.de` → `st123456`), then proves
   the pair by opening a TLS session and logging in. On success it keeps
   `{ username, password }` in process memory only — never logged, never echoed, never
   persisted, never written to `.env`. `warnIfPasswordPresent` unaffected. When the
   request carries the app session token, the server also marks `mail` connected on that
   user ([accounts.md](accounts.md)).
3. **Read a mailbox** (`GET /v1/mail/messages?limit=25&folder=INBOX`). Each call makes one
   IMAP
   session: `LOGIN`, `SELECT` of the chosen folder (INBOX by default), then `FETCH` of the
   newest rows with
   `UID FLAGS INTERNALDATE BODY.PEEK[HEADER.FIELDS (DATE FROM TO CC SUBJECT MESSAGE-ID)]`
   and a
   `BODY.PEEK[TEXT]<0.1024>` excerpt. `BODY.PEEK` keeps the list read from touching
   any flag; read state changes only through the explicit `POST /v1/mail/seen` route.

   Tapping a row pushes **`apps/mobile/app/mail-nachricht.tsx`**, which fetches the full body via
   `GET /v1/mail/body?folder=&uid=`. The server reads the message's `BODYSTRUCTURE`,
   picks the actual `text/plain` / `text/html` leaf parts and fetches exactly those
   sections (`UID FETCH <uid> BODY.PEEK[1] BODY.PEEK[2]`, charset-decoded per part,
   capped at 256 KB, short-lived server cache) — fetching the whole TEXT section would
   leak MIME part headers and boundaries like `Content-Type: …` into the view for every
   multipart mail. Transfer encodings are decoded server-side when the server leaves them
   intact (`decodeQuotedPrintable`, triggered by the part's `ENCODING` field — Exchange
   does not decode quoted-printable itself), so `über` never shows as `=C3=BCber`.
   The read view (`apps/mobile/src/components/mailBody.tsx`) renders selectable paragraphs and folds
   quoted replies (`> …` runs) behind "Zitat anzeigen" toggles; the HTML view styles
   `<blockquote>` the same way. The **plain text shows by default**; if the body is HTML,
   the sanitized markup is available but only rendered after the user taps
   "HTML anzeigen" — below that toggle sits a security note, and the WebView renders
   without JavaScript, without meta-refresh, and without any navigation.

   Opening the view calls `POST /v1/mail/seen` once, and a button flips the same flag
   back. The route runs one IMAP session (`SELECT`, `UID STORE <uid> ±FLAGS (\Seen)`);
   `apps/mobile/src/auth/mail.ts` publishes the new row state into the snapshot optimistically first
   and restores it when the request fails, so the list dot, the "Neu" filter and the
   detail pill stay in agreement. `BODY.PEEK` still keeps the body fetch from changing
   the flag implicitly.
4. **Write and send** (`POST /v1/mail/send`, `apps/server/mail/send.mjs`). The compose screen posts
   `{ to, cc, bcc, subject, text, attachments, sentFolder, inReplyTo, references }`.
   `apps/server/mail-mime.mjs` parses and dedupes addresses, rejects header injection, caps
   recipients (20), subject (255), body (100 KB) and attachments (5 files, 6 MB each,
   8 MB total, base64 in JSON), and builds a `multipart/mixed` message with a
   `multipart/alternative` text/plain + text/html body. Non-ASCII headers become RFC 2047
   words, attachment names carry an ASCII fallback plus `filename*`, Bcc never appears in
   the headers, and reply headers point at the original `Message-ID`.
   `apps/server/smtp.mjs` opens one `smtp.uni-stuttgart.de:587` session (`EHLO`, `STARTTLS`,
   `AUTH PLAIN` with `LOGIN` fallback, `MAIL FROM`, one `RCPT TO` per envelope address,
   `DATA` with dot-stuffing). A rejected recipient is reported without failing the whole
   message; no accepted recipient is an error. The route requires the app bearer token —
   the only mail route that acts in the user's name. After submission the server appends
   the same bytes to the Sent mailbox via IMAP `APPEND` (`\Seen`); a failed append is
   logged and never turns a delivered message into an error. A per-minute guard (10
   submissions) answers `mail_rate_limited`.
5. **Drop** (`POST /v1/mail/logout`). Clears the memory on the server (credentials, the
   body cache and the send guard); nothing was on
   the device anyway. Signing out also clears the local `mailAccount` reference and the
   draft/recipient history keys.

`GET /v1/mail/folders` lists the account's mailboxes with one IMAP session
(`LIST "" "*"`): name verbatim plus a `selectable` flag (non-selectable `\Noselect`
entries are kept out of the dropdown by the app). `apps/server/mail/folders.mjs` parses the mailbox
name as the astring after the hierarchy delimiter, covering quoted names, bare atoms
(`"/" INBOX` — reading the last quoted token would turn the delimiter into the name) and
inline `{n}` literals.

## Scope

Inbox browsing per folder (subject, sender, date, read/unread, text excerpt) plus
composing: recipients from the app's people directory and the loaded mailbox, Cc/Bcc,
templates, attachments, autosaved drafts, reply/forward with threading headers, and SMTP
submission with a Sent copy. The read flag (`UID STORE`) and sending (`SMTP`/`APPEND`) are
the mailbox mutations this build performs. There is no IMAP for ILIAS notifications beyond
what the university already forwards to the mailbox.

## Security notes

- The password only travels on the local loopback to the assistant server and over TLS
  to the TIK IMAP/SMTP hosts. AsyncStorage is not a vault (see
  [security-and-privacy.md](security-and-privacy.md)), so the app persists nothing but
  the account id; drafts and recipient history are plain text on the device. Over the
  assistant tunnel described in
  [assistant-tunnel.md](assistant-tunnel.md) the first hop is the Cloudflare edge rather
  than the loopback, so the tunnel is up only for the demonstration it serves.
- `POST /v1/mail/send` requires the bearer token, so an exposed tunnel cannot be used to
  send mail without an app session. The server validates every address and header value,
  caps bodies and attachments, and rate-limits submissions.
- Errors map to stable codes: `mail_auth_failed` (wrong pair, HTTP 401),
  `mail_not_configured` (HTTP 409), `mail_network` / `imap_timeout` /
  `mail_disconnected` / `bad_uid`. Server text arrives only as a capped `detail`, never
  containing the secret.
- The HTML path is hardened on three layers: the server strips `<script>` blocks, event
  handler attributes and meta-refresh tags (`stripMailHtml`, covered by a fixture test);
  the WebView runs with `javaScriptEnabled={false}` plus `allowFileAccess` off; and every
  navigation attempt is refused (`onShouldStartLoadWithRequest={() => false}`), so mail
  links cannot open tracking or phishing pages inside the app.
- Tests in `apps/server/mail.test.mjs` cover the pure parser parts (FETCH pieces with inline
  `{n}` literals, folded headers, RFC 2047 words, HTML preview flatten, LIST lines, the
  HTML sanitizer, BODYSTRUCTURE picking, quoted-printable decoding).
  `apps/server/mail-mime.test.mjs` covers address parsing, header encoding, MIME structure,
  Bcc suppression, threading headers and dot-stuffing; `tools/mail-compose.test.mjs`
  covers recipient search and reply/forward prefill. No network in tests; the IMAP and
  SMTP session classes are exercised only in production against the real hosts.

## Restart note

The routes are new: `/v1/mail/config`, `/v1/mail/folders`, `/v1/mail/credentials`,
`/v1/mail/messages`, `/v1/mail/body`, `POST /v1/mail/logout`. An already running
assistant server needs a restart (`npm run assistant`) before the app can reach them.
