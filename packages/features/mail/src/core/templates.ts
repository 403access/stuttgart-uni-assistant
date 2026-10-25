import type { Localized } from '@ua/core/domain/types';

export interface MailTemplate {
  id: string;
  title: Localized;
  description: Localized;
  subject: Localized;
  body: Localized;
}

/** Short, editable starting points — not boilerplate walls. */
export const mailTemplates: MailTemplate[] = [
  {
    id: 'appointment',
    title: { de: 'Terminanfrage', en: 'Appointment request' },
    description: {
      de: 'Kurz um einen Gesprächstermin bitten.',
      en: 'Ask for a short meeting.',
    },
    subject: { de: 'Terminanfrage', en: 'Appointment request' },
    body: {
      de: 'Sehr geehrte Damen und Herren,\n\nich würde gern einen Termin mit Ihnen vereinbaren. Wäre Ihnen in den kommenden zwei Wochen ein kurzes Gespräch möglich?\n\nVielen Dank und freundliche Grüße',
      en: 'Dear Sir or Madam,\n\nI would like to arrange a short meeting with you. Would a brief conversation in the next two weeks be possible?\n\nThank you and best regards',
    },
  },
  {
    id: 'extension',
    title: { de: 'Fristverlängerung', en: 'Deadline extension' },
    description: {
      de: 'Um mehr Zeit für eine Abgabe bitten.',
      en: 'Ask for more time on a submission.',
    },
    subject: { de: 'Antrag auf Fristverlängerung', en: 'Request for a deadline extension' },
    body: {
      de: 'Sehr geehrte Damen und Herren,\n\nfür die Abgabe der oben genannten Leistung benötige ich etwas mehr Zeit. Ich bitte daher um eine Verlängerung der Frist bis zum [Datum].\n\nDie Gründe kann ich auf Wunsch gern erläutern. Vielen Dank für Ihr Verständnis.\n\nFreundliche Grüße',
      en: 'Dear Sir or Madam,\n\nI need a little more time to submit the work mentioned above. I would therefore like to request an extension until [date].\n\nI am happy to explain the reasons if needed. Thank you for your understanding.\n\nBest regards',
    },
  },
  {
    id: 'exam',
    title: { de: 'Prüfungsrückfrage', en: 'Exam question' },
    description: {
      de: 'Nachfrage zur Anmeldung oder zum Ablauf.',
      en: 'Ask about registration or procedure.',
    },
    subject: { de: 'Rückfrage zur Prüfungsanmeldung', en: 'Question about exam registration' },
    body: {
      de: 'Sehr geehrte Damen und Herren,\n\nich habe eine Frage zur Prüfungsanmeldung im Modul [Modul]. Könnten Sie mir bitte bestätigen, ob meine Anmeldung berücksichtigt wurde?\n\nVielen Dank im Voraus.\n\nFreundliche Grüße',
      en: 'Dear Sir or Madam,\n\nI have a question about exam registration for the module [module]. Could you please confirm whether my registration was received?\n\nThank you in advance.\n\nBest regards',
    },
  },
  {
    id: 'thanks',
    title: { de: 'Kurzes Danke', en: 'Quick thank-you' },
    description: {
      de: 'Sich für Unterstützung bedanken.',
      en: 'Thank someone for their help.',
    },
    subject: { de: 'Vielen Dank', en: 'Thank you' },
    body: {
      de: 'Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Unterstützung. Die Rückmeldung hat mir sehr weitergeholfen.\n\nFreundliche Grüße',
      en: 'Dear Sir or Madam,\n\nthank you very much for your support. Your reply helped me a great deal.\n\nBest regards',
    },
  },
];
