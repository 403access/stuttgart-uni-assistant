# University e-mail (UniMail)

The **Nachrichten (Messages)** tab connects to your university mailbox through IMAP, the interface IZUS/TIK publishes for third-party mail programs. It is read-only by design in this build — reading, searching, and filing views. Replies, sending, and drafts stay in the university webmail.

## Connect

1. Open the **Nachrichten (Messages)** tab. While not connected it shows the credential form, prefilled with your account from the session.
2. Enter your account (`st…` for students) and password, and connect. The server proves the pair once against `imap.uni-stuttgart.de:993` and then keeps it in server process memory only.
3. The tab becomes the inbox: subject, sender, date, and a read/unread dot.

The password is never stored on the device and never written to `.env`. Dropping the connection, or signing out of the app, erases it from the server.

## The inbox

The sticky control bar keeps the mailbox, search, filter, and sort controls in one row. The search field fills the remaining width, while the menu controls keep a capped width and shrink first on narrow screens:

| Control | What it does |
| --- | --- |
| Mailbox dropdown | Posteingang, Gesendet, Entwürfe, … — the real folder list as it comes from the server |
| Search | Filter the loaded rows |
| Filter and sort dropdowns | Newest, oldest, by sender, unread first — the options adapt to what is actually loaded |

Connection settings live on the **Campus** tab under **E-Mail**: it opens the same connection screen with **Posteingang aktualisieren (refresh inbox)** and **Verbindung lösen (drop connection)**.

Rows refresh quietly every 60 seconds while connected. Browsing with `BODY.PEEK` never marks a message read — the university webmail stays the place where read state and flags really change.

## Reading a message

Tap a row to open the read view. The plain text shows by default. If the message is HTML, the sanitized markup is available but only rendered after you tap **HTML anzeigen**. That toggle is a security measure, not a limitation: the HTML view runs without JavaScript, refuses every navigation, and links out are never followed inside the app, so a mail link cannot open a tracking or phishing page in the reader. Quoted replies sit behind a **Zitat anzeigen** toggle.

Unauthenticated content is not fetched: remote images stay off, and only what the mail itself contains is shown.
