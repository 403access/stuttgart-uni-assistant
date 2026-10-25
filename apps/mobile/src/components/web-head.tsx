import Head from 'expo-router/head';
import { usePathname } from 'expo-router';
import { Platform } from 'react-native';

import { useAppSelector } from '@/src/state/AppState';
import { tx, type TranslationKey } from '@ua/core/format';
import type { Locale } from '@ua/core/domain/types';

/**
 * Browser tab title and description. React Navigation's web headers do not
 * touch the document, so the desktop build sets them here once per route.
 * Native renders nothing.
 */
export function WebHead() {
  const pathname = usePathname();
  const locale = useAppSelector((state) => state.locale);
  if (Platform.OS !== 'web') return null;

  const title = routeTitle(pathname, locale);
  const fullTitle = title ? `${title} · University Assistant` : 'University Assistant';

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description(locale)} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description(locale)} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
    </Head>
  );
}

/** First path segment → tab label; detail routes inherit their section. */
const SECTION_KEYS: Record<string, TranslationKey> = {
  kalender: 'tabsLayout.kalender',
  kurs: 'common.kurse',
  kurse: 'common.kurse',
  modul: 'common.module',
  raum: 'common.raeume',
  dozent: 'common.dozierende',
  pruefung: 'common.pruefung',
  ilias: 'tabsLayout.ilias',
  quiz: 'quiz.title',
  chat: 'tabsChat.assistent',
  mail: 'tabsLayout.nachrichten',
  'mail-nachricht': 'tabsLayout.nachrichten',
  'mail-verfassen': 'tabsLayout.nachrichten',
  'mail-verbindung': 'tabsLayout.nachrichten',
  mehr: 'common.campus',
  profil: 'tabsMehr.profil',
  konto: 'common.konto',
  einstellungen: 'common.einstellungen',
  darstellung: 'einstellungen.design',
  sprache: 'einstellungen.sprache',
  sicherheit: 'sicherheit.titel',
  campus: 'common.karte',
  'campus-info': 'common.campus',
  feed: 'common.meldungen',
  meldung: 'common.meldungen',
  dokumente: 'common.dokumente',
  dokument: 'common.dokumente',
  fristen: 'common.fristen',
  studium: 'common.studium',
  anforderungen: 'common.anforderungen',
  anrechnung: 'common.anrechnung',
  altklausuren: 'common.altklausuren',
  kommilitonen: 'common.kommilitonen',
  strukturen: 'strukturen.strukturen',
  vpn: 'vpn.title',
  drucker: 'drucker.drucken',
  plattformen: 'common.plattformen',
  'kalender-export': 'common.kalender',
  'geraet-verknuepfen': 'einstellungen.geraet_verknuepfen',
  onboarding: 'onboarding.titel',
  login: 'common.anmeldung',
  oidc: 'common.anmeldung',
  api: 'common.schnittstelle',
  dev: 'tabsMehr.dev',
};

function routeTitle(pathname: string, locale: Locale): string {
  const clean = pathname.replace(/^\/+/, '');
  if (!clean) return tx(locale, 'tabsLayout.dashboard');
  const segment = clean.split('/')[0];
  const key = SECTION_KEYS[segment];
  if (key) return tx(locale, key);
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

function description(locale: Locale): string {
  return locale === 'de'
    ? 'Stundenplan, ILIAS, UniMail, Quiz und C@MPUS in einer App für Studierende der Universität Stuttgart.'
    : 'Timetable, ILIAS, UniMail, quizzes and C@MPUS in one app for students at the University of Stuttgart.';
}
