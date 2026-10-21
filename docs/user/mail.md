# University e-mail (UniMail)

The **Nachrichten (Messages)** tab connects to your university mailbox through IMAP, the interface IZUS/TIK publishes for third-party mail programs. Reading, searching, filing views, and the read/unread flag are supported; replies, sending, and drafts stay in the university webmail.

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
| Search | Filter the loaded rows |
| Sort dropdown | Newest, oldest, by sender, unread first — the options adapt to what is actually loaded |
| Filter button | Opens the right filter drawer with "Alle", "Neu", and one entry per sender |

Connection settings live on the **Campus** tab under **E-Mail**: it opens the same connection screen with **Posteingang aktualisieren (refresh inbox)** and **Verbindung lösen (drop connection)**.

Rows refresh quietly every 60 seconds while connected. Opening a message sets its read flag through IMAP, so the university webmail shows it as read too; the button in the read view can mark it unread again.

## Reading a message

Tap a row to open the read view; opening it marks the message as read. A button below the header flips the flag: **Als ungelesen markieren (mark as unread)** once it is read, **Als gelesen markieren (mark as read)** while it is still unread. The plain text shows by default. If the message is HTML, the sanitized markup is available but only rendered after you tap **HTML anzeigen**. That toggle is a security measure, not a limitation: the HTML view runs without JavaScript, refuses every navigation, and links out are never followed inside the app, so a mail link cannot open a tracking or phishing page in the reader. Quoted replies sit behind a **Zitat anzeigen** toggle.

Unauthenticated content is not fetched: remote images stay off, and only what the mail itself contains is shown.
