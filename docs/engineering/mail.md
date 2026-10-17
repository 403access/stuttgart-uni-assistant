# UniMail (e-mail) integration

University e-mail runs on the Exchange service of IZUS/TIK. The browser surface is
`https://mail.uni-stuttgart.de/` (login with the short user id, `st…` for students, `ac…`
for staff). For mail clients TIK documents `imap.uni-stuttgart.de:993` with the same
account; this is the interface this feature uses, because it is published precisely for
third-party mail programs and stays stable while OWA markup would not.

## Screens

Two surfaces share one snapshot (`subscribeMailSnapshot` in `src/auth/mail.ts`):

- **Messages tab** (`app/(tabs)/mail.tsx`): while not connected it shows the credential
  form; once connected it becomes a clean inbox — subject, sender, date, read/unread dot,
  tap a row to open the read view (see below). The sticky control bar (pinned while the
  inbox scrolls under it) is one horizontally scrollable row: the **mailbox dropdown**
  first (Posteingang, Gesendet, Entwürfe, … — the real folder list comes from an IMAP
  `LIST`; names travel in modified UTF-7, the server returns raw `name` plus decoded
  `display`, so `Gel&APY-schte` shows as `Gelöschte` while `SELECT` uses the raw form,
  and repeated listings dedupe), then search, then the filter and
  sort dropdowns, then the cog that opens connection management. The
  60-second fetching interval (`REFRESH_INTERVAL_MS`) refreshes quietly while connected.
  The filter and sort options are inferred
  from the loaded rows only: "Neu" with the unread count appears when unread rows exist,
  one entry per distinct sender (with its row count), "Älteste" when any date parsed,
  "Absender" with two or more senders, "Neu zuerst" while unread rows exist. The stored
  selection is intent only; the effective value is derived in render, so a refresh that
  removes the variety silently falls back to newest.
- **Connection screen** (`app/mail-verbindung.tsx`, pushed outside the tabs): the status
  card with the two actions "Posteingang aktualisieren" and "Verbindung lösen". Both
  screens apply each other's results through the published snapshot, so dropping the
  connection on this screen immediately restores the sign-in form in the tab, and a
  refresh here is visible in the inbox the moment the user comes back.

```text
Student → app (read-only list) → assistant server (process memory) → imap.uni-stuttgart.de:993
```

## Flow

1. **Enter credentials** (`app/(tabs)/mail.tsx`, the "Nachrichten"/"Messages" tab). The screen prefills the account from the
   session and asks for the password. Both are `POST`ed to the assistant server.
2. **Proof and keep** (`POST /v1/mail/credentials`, `server/mail.mjs`). The server
   normalizes the long form (`st123456@stud.uni-stuttgart.de` → `st123456`), then proves
   the pair by opening a TLS session and logging in. On success it keeps
   `{ username, password }` in process memory only — never logged, never echoed, never
   persisted, never written to `.env`. `warnIfPasswordPresent` unaffected.
3. **Read a mailbox** (`GET /v1/mail/messages?limit=25&folder=INBOX`). Each call makes one
   IMAP
   session: `LOGIN`, `SELECT` of the chosen folder (INBOX by default), then `FETCH` of the
   newest rows with
   `UID FLAGS INTERNALDATE BODY.PEEK[HEADER.FIELDS (DATE FROM TO SUBJECT)]` and a
   `BODY.PEEK[TEXT]<0.1024>` excerpt. `BODY.PEEK` never marks messages read.

   Tapping a row pushes **`app/mail-nachricht.tsx`**, which fetches the full body via
   `GET /v1/mail/body?folder=&uid=`. The server reads the message's `BODYSTRUCTURE`,
   picks the actual `text/plain` / `text/html` leaf parts and fetches exactly those
   sections (`UID FETCH <uid> BODY.PEEK[1] BODY.PEEK[2]`, charset-decoded per part,
   capped at 256 KB, short-lived server cache) — fetching the whole TEXT section would
   leak MIME part headers and boundaries like `Content-Type: …` into the view for every
   multipart mail. Transfer encodings are decoded server-side when the server leaves them
   intact (`decodeQuotedPrintable`, triggered by the part's `ENCODING` field — Exchange
   does not decode quoted-printable itself), so `über` never shows as `=C3=BCber`.
   The read view (`src/components/mailBody.tsx`) renders selectable paragraphs and folds
   quoted replies (`> …` runs) behind "Zitat anzeigen" toggles; the HTML view styles
   `<blockquote>` the same way. The **plain text shows by default**; if the body is HTML,
   the sanitized markup is available but only rendered after the user taps
   "HTML anzeigen" — below that toggle sits a security note, and the WebView renders
   without JavaScript, without meta-refresh, and without any navigation.
4. **Drop** (`POST /v1/mail/logout`). Clears the memory on the server (credentials and
   the body cache); nothing was on
   the device anyway. Signing out also clears the local `mailAccount` reference.

`GET /v1/mail/folders` lists the account's mailboxes with one IMAP session
(`LIST "" "*"`): name verbatim plus a `selectable` flag (non-selectable `\Noselect`
entries are kept out of the dropdown by the app). `server/mail.mjs` parses both quoted
names and inline `{n}` literals.

## Scope

Read-only: subject, sender, date, read/unread state, and a text excerpt, browsable per
folder. Replying,
sending, and drafts remain in the webmail the university itself operates. There is no
IMAP for ILIAS notifications beyond what the university already forwards to the mailbox.

## Security notes

- The password only travels on the local loopback to the assistant server and over TLS
  to the TIK IMAP host. AsyncStorage is not a vault (see
  [security-and-privacy.md](security-and-privacy.md)), so the app persists nothing but
  the account id. Over the assistant tunnel described in
  [assistant-tunnel.md](assistant-tunnel.md) the first hop is the Cloudflare edge rather
  than the loopback, so the tunnel is up only for the demonstration it serves.
- Errors map to stable codes: `mail_auth_failed` (wrong pair, HTTP 401),
  `mail_not_configured` (HTTP 409), `mail_network` / `imap_timeout` /
  `mail_disconnected` / `bad_uid`. Server text arrives only as a capped `detail`, never
  containing the secret.
- The HTML path is hardened on three layers: the server strips `<script>` blocks, event
  handler attributes and meta-refresh tags (`stripMailHtml`, covered by a fixture test);
  the WebView runs with `javaScriptEnabled={false}` plus `allowFileAccess` off; and every
  navigation attempt is refused (`onShouldStartLoadWithRequest={() => false}`), so mail
  links cannot open tracking or phishing pages inside the app.
- Tests in `server/mail.test.mjs` cover the pure parser parts (FETCH pieces with inline
  `{n}` literals, folded headers, RFC 2047 words, HTML preview flatten, LIST lines, the
  HTML sanitizer, BODYSTRUCTURE picking, quoted-printable decoding). No network in
  tests; the IMAP session class is exercised only in production against the real host.

## Restart note

The routes are new: `/v1/mail/config`, `/v1/mail/folders`, `/v1/mail/credentials`,
`/v1/mail/messages`, `/v1/mail/body`, `POST /v1/mail/logout`. An already running
assistant server needs a restart (`npm run assistant`) before the app can reach them.
