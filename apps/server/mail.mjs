/**
 * UniMail (Exchange of Universität Stuttgart) over the IMAP/SMTP interfaces of
 * the TIK.
 *
 * The TIK documents imap.uni-stuttgart.de:993 and smtp.uni-stuttgart.de:587
 * (STARTTLS) with the short user id (st… / ac…) and the account password as an
 * official interface for mail clients
 * (https://www.tik.uni-stuttgart.de/en/support/faq-frequently-asked-questions/faqs-e-mail).
 * The webmail at https://mail.uni-stuttgart.de/ stays the browser surface; this
 * server reads and submits mail, so the app never talks to the university directly.
 *
 * The implementation is split under `./mail/`:
 *
 *   config.mjs    process state, endpoints, limits, failure/quoting helpers
 *   session.mjs   TLS IMAP session and the LOGIN/LOGOUT wrapper
 *   accounts.mjs  credential proof, status, account/address normalisation
 *   folders.mjs   LIST parsing, modified UTF-7, folder listing
 *   inbox.mjs     message rows, headers and preview FETCH parsing
 *   body.mjs      BODYSTRUCTURE part selection and full body reads
 *   parse.mjs     pure header/MIME/HTML parsing shared by inbox and body
 *   send.mjs      read flag, SMTP submission and the Sent copy
 *
 * This file stays the stable public surface for routes and tests; import from
 * the specific module when only one concern is needed.
 *
 * Secrets: the password arrives per request from the app, is kept only in the
 * memory of this process (like the C@MPUS credentials) and is never logged,
 * echoed or persisted.
 */

export { mailService } from './mail/config.mjs';
export { forgetMailCredentials, mailAddressFor, normalizeMailAccount, publicMailStatus, saveMailCredentials } from './mail/accounts.mjs';
export { decodeModifiedUtf7, loadMailFolders, parseListLines } from './mail/folders.mjs';
export { loadMailMessages, parseFetchLines } from './mail/inbox.mjs';
export { loadMailBody } from './mail/body.mjs';
export { appendToSent, seenStoreCommand, sendMail, setMailSeen } from './mail/send.mjs';
export {
  decodeMimeWords,
  decodeQuotedPrintable,
  parseHeaderBlock,
  parseImapList,
  pickTextParts,
  stripMailHtml,
  textPreview,
} from './mail/parse.mjs';
