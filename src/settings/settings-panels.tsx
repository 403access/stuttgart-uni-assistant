import type { ComponentType } from 'react';

import AccountScreen from '@/app/konto';
import CalendarExportScreen from '@/app/kalender-export';
import CampusScreen from '@/app/campus';
import DeadlinesScreen from '@/app/fristen';
import DocumentsScreen from '@/app/dokumente';
import ExamArchiveScreen from '@/app/altklausuren';
import FeedScreen from '@/app/feed';
import MailConnectionScreen from '@/app/mail-verbindung';
import PeersScreen from '@/app/kommilitonen';
import PrinterScreen from '@/app/drucker';
import ProfileDataScreen from '@/app/profil/daten';
import ProfileDiscoverabilityScreen from '@/app/profil/auffindbarkeit';
import ProfileOverviewScreen from '@/app/profil';
import ProfileVisibilityScreen from '@/app/profil/sichtbarkeit';
import SecurityScreen from '@/app/sicherheit';
import SettingsAppearanceScreen from '@/app/darstellung';
import SettingsLanguageScreen from '@/app/sprache';
import TransferScreen from '@/app/anrechnung';
import VpnScreen from '@/app/vpn';

/**
 * Settings entries that can render their real screen inline in the desktop
 * third pane. The route stays the single source of truth; the pane simply hosts
 * the same component inside `PaneModeProvider`, which strips the page chrome.
 */
export const SETTINGS_PANELS: Record<string, ComponentType> = {
  '/profil': ProfileOverviewScreen,
  '/profil/daten': ProfileDataScreen,
  '/profil/sichtbarkeit': ProfileVisibilityScreen,
  '/profil/auffindbarkeit': ProfileDiscoverabilityScreen,
  '/campus': CampusScreen,
  '/konto': AccountScreen,
  '/mail-verbindung': MailConnectionScreen,
  '/vpn': VpnScreen,
  '/drucker': PrinterScreen,
  '/kalender-export': CalendarExportScreen,
  '/dokumente': DocumentsScreen,
  '/altklausuren': ExamArchiveScreen,
  '/anrechnung': TransferScreen,
  '/fristen': DeadlinesScreen,
  '/kommilitonen': PeersScreen,
  '/feed': FeedScreen,
  '/darstellung': SettingsAppearanceScreen,
  '/sicherheit': SecurityScreen,
  '/sprache': SettingsLanguageScreen,
};
