# University e-mail (UniMail)

The **Nachrichten (Messages)** tab connects to your university mailbox through IMAP and SMTP, the interfaces IZUS/TIK publishes for third-party mail programs. Reading, searching, composing, replying, attachments, and the read/unread flag are supported.

## Connect

1. Open the **Nachrichten (Messages)** tab. While not connected it shows the credential form, prefilled with your account from the session.
2. Enter your account (`st…` for students) and password, and connect. The server proves the pair once against `imap.uni-stuttgart.de:993` and then keeps it in server process memory only.
3. The tab becomes the inbox: subject, sender, date, and a read/unread dot.

The password is never stored on the device and never written to `.env`. Dropping the connection, or signing out of the app, erases it from the server.

## The inbox

The sticky control bar keeps the mailbox, search, filter, and sort controls in one row. The search field fills the remaining width, while the buttons keep a fixed compact size:

| Control | What it does |
| --- | --- |
| Burger button | Opens the left mailbox drawer: Posteingang, Gesendet, Entwürfe, … — the real folder list as it comes from the server |
| Compose button | Opens a new message |
| Search | Filter the loaded rows |
| Sort dropdown | Newest, oldest, by sender, unread first — the options adapt to what is actually loaded |
| Filter button | Opens the right filter drawer with "Alle", "Neu", and one entry per sender |

Connection settings live on the **Campus** tab under **E-Mail**: it opens the same connection screen with **Posteingang aktualisieren (refresh inbox)** and **Verbindung lösen (drop connection)**.

Rows refresh quietly every 60 seconds while connected. Opening a message sets its read flag through IMAP, so the university webmail shows it as read too; the button in the read view can mark it unread again.

## Reading a message

Tap a row to open the read view; opening it marks the message as read. A button below the header flips the flag: **Als ungelesen markieren (mark as unread)** once it is read, **Als gelesen markieren (mark as read)** while it is still unread. The plain text shows by default. If the message is HTML, the sanitized markup is available but only rendered after you tap **HTML anzeigen**. That toggle is a security measure, not a limitation: the HTML view runs without JavaScript, refuses every navigation, and links out are never followed inside the app, so a mail link cannot open a tracking or phishing page in the reader. Quoted replies sit behind a **Zitat anzeigen** toggle.

Unauthenticated content is not fetched: remote images stay off, and only what the mail itself contains is shown.

## Writing a message

Tap the pencil in the toolbar, or **Antworten (reply)** / **Weiterleiten (forward)** in the read view. The compose screen is built for the phone:

- **Recipient field with an address book.** Typing searches lecturers from the app's people directory, senders and addressees of the loaded mailbox, and the recipients you used last. Every suggestion carries a badge — **Dozent:in (lecturer)**, **Postfach (mailbox)** or **Zuletzt (recent)** — and merges when one person appears in several places. Search ignores case and umlauts, so `muller` finds `Müller`. Add several people as chips, paste a comma-separated list, or type any outside address directly.
- **Cc and Bcc** appear on demand below the recipient row.
- **Templates** fill the subject when it is empty and append a ready-made German or English text (appointment, extension, exam question, thank-you).
- **Attachments** come from the system file picker: up to five files, 6 MB each and 8 MB in total. Each row shows its size and can be removed; oversized files are refused before anything is sent.
- **Drafts save themselves** while you type and are restored the next time you compose. Large attachments are not stored in the draft and are flagged when it is restored.
- **Signature** from your signed-in name and mail address is added to a new message; it is plain text and fully editable.
- **Reply and forward** prefill the recipient, an `AW:`/`Re:` or `WG:`/`Fwd:` subject, the quoted body and, for replies, the `In-Reply-To` header so the thread stays together.

**Senden (Send)** submits the message through the assistant server over `smtp.uni-stuttgart.de:587` with STARTTLS and keeps a copy in the account's Sent folder. The footer shows the recipient and attachment count; rejected recipients are named in the toast.
