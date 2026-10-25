import { useState, type ComponentType, type ReactNode } from 'react';
import { View } from 'react-native';

import type { CampusLoginPhase } from '@/src/auth/campus-progress';
import {
  Button,
  Card,
  FieldLabel,
  InfoRow,
  Mark,
  Meter,
  Muted,
  Pill,
  SearchField,
  Section,
  Strong,
} from '@/src/components/ui';
import { useAppSelector } from '@/src/state/AppState';
import { colors } from '@/src/theme';
import type { Locale, MailAttachment, MailMessage } from '@/src/types';

import { ChoiceCard } from './choice-card';
import { ControlIcon, ToolButton } from './control-icon';
import { DeviceQr } from './device-qr';
import { DrawerPanel } from './drawer-panel';
import { DropdownPicker } from './dropdown-picker';
import { JsonTree } from './json-tree';
import {
  Checkbox,
  Chip,
  ErrorText,
  Field,
  Footer,
  LanguagePicker,
  Meta,
  Notice,
  SectionTitle,
} from './login-blocks';
import { MailBody } from './mailBody';
import { OptionRows, type DropdownOption } from './option-rows';
import { ResponsiveGrid } from './responsive-grid';
import { SigningIn } from './signing-in';
import { StructureRow, TreeChildren } from './structure-row';
import { showToast } from './toast';

import { MemberAvatar } from '@/src/ilias/components/member-avatar';
import { AttachmentList } from '@/src/mail/components/attachment-list';
import { ContactBadge } from '@/src/mail/components/contact-badge';
import { MailRow } from '@/src/mail/components/mail-row';
import { MailListSkeleton, ToolbarSkeleton } from '@/src/mail/components/mail-skeletons';
import { ProfilePreview } from '@/src/profile/profile-preview';
import { ProfileSummary } from '@/src/profile/profile-summary';
import { useProfileData } from '@/src/profile/use-profile-data';
import { ClozeView } from '@/src/quiz/components/cloze';
import { FlashcardView } from '@/src/quiz/components/flashcard';
import { OptionRow } from '@/src/quiz/components/option-row';
import { QuestionFeedback } from '@/src/quiz/components/question-feedback';
import { QuizButton } from '@/src/quiz/components/quiz-button';
import { QuizToolbar } from '@/src/quiz/components/quiz-toolbar';
import { SingleChoiceView } from '@/src/quiz/components/single-choice';
import { TrueFalseView } from '@/src/quiz/components/true-false';
import type { ClozeQuestion, FlashcardQuestion, SingleChoiceQuestion, TrueFalseQuestion } from '@/src/quiz/types';

import { CalendarHero } from './calendar-hero';
import { LecturersList } from './lecturers-list';
import { TutorialsList } from './tutorials-list';

function useLocale(): Locale {
  return useAppSelector((state) => state.locale);
}

function PreviewColumn({ children }: { children: ReactNode }) {
  return <View style={{ gap: 10 }}>{children}</View>;
}

function MarkPreview() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <Mark size={28} />
      <Mark size={48} />
      <Mark size={72} />
    </View>
  );
}

function CardPreview() {
  return (
    <PreviewColumn>
      <Card>
        <Strong>Study record</Strong>
        <Muted>Plain card, one idea per surface.</Muted>
      </Card>
      <Card onPress={() => undefined}>
        <Strong>Pressable card</Strong>
        <Muted>Hover and press states on the web; tap state on a phone.</Muted>
      </Card>
    </PreviewColumn>
  );
}

function SectionPreview() {
  return (
    <PreviewColumn>
      <Section title="Next steps" action="Alle anzeigen" onAction={() => undefined} />
      <Section title="Without an action" />
    </PreviewColumn>
  );
}

function PillPreview() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pill label="Neutral" />
      <Pill label="Blue" tone="blue" />
      <Pill label="Done" tone="ok" />
      <Pill label="Waiting" tone="wait" />
      <Pill label="Overdue" tone="stop" />
      <Pill label="Active" active />
    </View>
  );
}

function MeterPreview() {
  return (
    <View style={{ gap: 10 }}>
      <Meter value={12} max={30} />
      <Meter value={22} max={30} />
      <Meter value={30} max={30} />
      <Muted>12 / 30 · 22 / 30 · 30 / 30 ECTS</Muted>
    </View>
  );
}

function ButtonPreview() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Button label="Primary" onPress={() => undefined} />
      <Button secondary label="Secondary" onPress={() => undefined} />
    </View>
  );
}

function FieldLabelPreview() {
  return (
    <View style={{ gap: 6 }}>
      <FieldLabel>E-Mail</FieldLabel>
      <FieldLabel>Matrikelnummer</FieldLabel>
    </View>
  );
}

function SearchFieldPreview() {
  const [value, setValue] = useState('Algorithmen');
  return (
    <PreviewColumn>
      <SearchField value={value} onChangeText={setValue} placeholder="Suchen" />
      <SearchField value={value} onChangeText={setValue} placeholder="Suchen" compact />
    </PreviewColumn>
  );
}

function MutedPreview() {
  return <Muted>Secondary copy, dates, and helper text use this style.</Muted>;
}

function StrongPreview() {
  return <Strong>Primary label or value</Strong>;
}

function InfoRowPreview() {
  return (
    <PreviewColumn>
      <InfoRow title="Algorithmen und Datenstrukturen" meta="6 ECTS" detail="Dienstag, 09:45–11:15 · V47.02" onPress={() => undefined} position="first" />
      <InfoRow title="Lineare Algebra" meta="9 ECTS" detail="Donnerstag, 14:00–15:30 · V38.01" position="middle" />
      <InfoRow title="Nicht bestanden" meta="0 ECTS" detail="Noch nicht belegbar" tone="danger" position="last" />
    </PreviewColumn>
  );
}

function ChoiceCardPreview() {
  const [active, setActive] = useState('light');
  return (
    <PreviewColumn>
      <ChoiceCard icon="light-mode" label="Hell" active={active === 'light'} onPress={() => setActive('light')} />
      <ChoiceCard icon="dark-mode" label="Dunkel" active={active === 'dark'} onPress={() => setActive('dark')} />
    </PreviewColumn>
  );
}

function ControlIconPreview() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <ControlIcon symbol="magnifyingglass" material="search" color={colors.mute} />
      <ControlIcon symbol="chevron.down" material="expand-more" color={colors.blue} />
      <ControlIcon symbol="checkmark" material="check" color={colors.success} />
      <ControlIcon symbol="xmark" material="close" color={colors.danger} />
    </View>
  );
}

function ToolButtonPreview() {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <ToolButton symbol="line.3.horizontal" material="menu" label="Menu" onPress={() => undefined} />
      <ToolButton symbol="line.3.horizontal" material="menu" label="Menu active" onPress={() => undefined} active />
    </View>
  );
}

function JsonTreePreview() {
  return (
    <JsonTree
      value={{
        ok: true,
        elapsedMs: 184,
        op: 'structure',
        nodes: [12, 43, 77],
        detail: { studyId: 7, cached: false },
      }}
    />
  );
}

function SectionTitlePreview() {
  return <SectionTitle>Section title</SectionTitle>;
}

function NoticePreview() {
  return <Notice>This is a short notice with the light-blue wash used by the sign-in screens.</Notice>;
}

function FieldPreview() {
  return <Field label="E-Mail" placeholder="st123456@stud.uni-stuttgart.de" autoCapitalize="none" />;
}

function MetaPreview() {
  return <Meta>Small print under a field or below a card.</Meta>;
}

function FooterPreview() {
  return <Footer>The university password is typed only on the university page.</Footer>;
}

function ErrorTextPreview() {
  return <ErrorText>Die Anmeldung ist fehlgeschlagen. Bitte erneut versuchen.</ErrorText>;
}

function ChipPreview() {
  const [on, setOn] = useState(true);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Chip label="Deutsch" on={on} onPress={() => setOn(true)} />
      <Chip label="English" on={!on} onPress={() => setOn(false)} />
    </View>
  );
}

function CheckboxPreview() {
  const [checked, setChecked] = useState(true);
  return (
    <Checkbox
      label="Anmeldung auf diesem Gerät merken"
      hint="Die App fragt beim Start nach Face ID oder dem Fingerabdruck."
      checked={checked}
      onPress={() => setChecked((value) => !value)}
    />
  );
}

function LanguagePickerPreview() {
  const current = useLocale();
  const [locale, setLocale] = useState<Locale>(current);
  return <LanguagePicker locale={locale} setLocale={setLocale} />;
}

function MailBodyPreview() {
  const locale = useLocale();
  return (
    <MailBody
      locale={locale}
      text={`Hallo Lena,\n\nanbei die Unterlagen für die nächste Sitzung.\n\nViele Grüße\nJana\n\n> Am Montag schrieb Lena:\n> Danke, ich schaue es mir an.`}
    />
  );
}

function OptionRowsPreview() {
  const [selected, setSelected] = useState('new');
  const options: DropdownOption[] = [
    { key: 'new', label: 'Neueste zuerst', selected: selected === 'new', group: 'Sortierung' },
    { key: 'old', label: 'Älteste zuerst', selected: selected === 'old' },
    { key: 'slow', label: 'Langsamste zuerst', selected: selected === 'slow', meta: '184 ms' },
  ];
  return <OptionRows options={options} onSelect={setSelected} />;
}

function StructureRowPreview() {
  return (
    <TreeChildren>
      <StructureRow name="Algorithmen und Datenstrukturen" designation="M-INF-101" elementType="MODUL" status="belegt" toggle="open" meta="4 Unterpunkte" onPress={() => undefined} onToggle={() => undefined} selected />
      <StructureRow name="Graphen" designation="M-INF-101-02" elementType="KURS" status="offen" toggle="closed" onPress={() => undefined} onToggle={() => undefined} depth={1} />
      <StructureRow name="Kürzeste Wege" designation="M-INF-101-03" elementType="KURS" onPress={() => undefined} depth={2} />
    </TreeChildren>
  );
}

function DropdownPickerPreview() {
  const [value, setValue] = useState('new');
  return (
    <DropdownPicker
      hint="Sortierung"
      valueText={value === 'new' ? 'Neueste' : value === 'old' ? 'Älteste' : 'Langsamste'}
      options={[
        { key: 'new', label: 'Neueste zuerst', selected: value === 'new' },
        { key: 'old', label: 'Älteste zuerst', selected: value === 'old' },
        { key: 'slow', label: 'Langsamste zuerst', selected: value === 'slow' },
      ]}
      onSelect={setValue}
    />
  );
}

function DrawerPanelPreview() {
  const [selected, setSelected] = useState('inbox');
  return (
    <View style={{ height: 260, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: 'hidden' }}>
      <DrawerPanel title="Postfach" closeLabel="Schließen" onClose={() => undefined}>
        <OptionRows
          options={[
            { key: 'inbox', label: 'Posteingang', selected: selected === 'inbox', meta: '12' },
            { key: 'sent', label: 'Gesendet', selected: selected === 'sent' },
            { key: 'drafts', label: 'Entwürfe', selected: selected === 'drafts' },
          ]}
          onSelect={setSelected}
        />
      </DrawerPanel>
    </View>
  );
}

function ResponsiveGridPreview() {
  return (
    <ResponsiveGrid minColumnWidth={120}>
      {['Heute', 'Kalender', 'Chat'].map((label) => (
        <Card key={label}>
          <Strong>{label}</Strong>
          <Muted>Column on a phone, grid on the desktop.</Muted>
        </Card>
      ))}
    </ResponsiveGrid>
  );
}

function SigningInPreview() {
  const locale = useLocale();
  const phase: CampusLoginPhase = 'identify';
  return (
    <PreviewColumn>
      <SigningIn locale={locale} phase={phase} detail="C@MPUS · st206509" compact />
      <View style={{ height: 320 }}>
        <SigningIn locale={locale} phase={phase} detail="C@MPUS · st206509" />
      </View>
    </PreviewColumn>
  );
}

function ToastPreview() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Button secondary label="Info" onPress={() => showToast({ title: 'Aktualisiert', message: 'Der Stand ist aktuell.' })} />
      <Button secondary label="Erfolg" onPress={() => showToast({ tone: 'success', title: 'Gespeichert' })} />
      <Button secondary label="Fehler" onPress={() => showToast({ tone: 'error', title: 'Server nicht erreichbar', message: 'Der lokale Stand bleibt sichtbar.' })} />
    </View>
  );
}

function DeviceQrPreview() {
  return (
    <View style={{ alignItems: 'flex-start', gap: 6 }}>
      <DeviceQr value="universityassistant://device?code=DEMO-7F3A" size={180} />
      <Muted>Web renders a QR code; native shows the value for the scanner.</Muted>
    </View>
  );
}

function MemberAvatarPreview() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <MemberAvatar imageUrl="" name="Lena Hartmann" size={32} />
      <MemberAvatar imageUrl="" name="Jana Weber" size={40} />
      <MemberAvatar imageUrl="" name="Prof. Dr. Klein" size={52} />
    </View>
  );
}

function ContactBadgePreview() {
  const locale = useLocale();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <ContactBadge source="lecturer" locale={locale} />
      <ContactBadge source="mailbox" locale={locale} />
      <ContactBadge source="recent" locale={locale} />
      <ContactBadge source="manual" locale={locale} />
    </View>
  );
}

const sampleMessage: MailMessage = {
  uid: 42,
  seen: false,
  date: '2026-10-24T09:12:00.000Z',
  from: 'Jana Weber',
  to: 'lena.hartmann@stud.uni-stuttgart.de',
  cc: '',
  subject: 'Unterlagen für die nächste Sitzung',
  messageId: '<demo-42@example.invalid>',
  preview: 'Hallo Lena, anbei die Unterlagen …',
};

function MailRowPreview() {
  const locale = useLocale();
  return (
    <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.paper }}>
      <MailRow message={sampleMessage} folder="INBOX" last locale={locale} />
    </View>
  );
}

function MailListSkeletonPreview() {
  return <MailListSkeleton label="Nachrichten werden geladen …" animate={false} />;
}

function ToolbarSkeletonPreview() {
  return (
    <View style={{ flexDirection: 'row' }}>
      <ToolbarSkeleton label="Steuerung wird geladen …" animate={false} />
    </View>
  );
}

const sampleAttachments: MailAttachment[] = [
  { name: 'folien-woche-3.pdf', type: 'application/pdf', size: 1_240_000, data: '' },
  { name: 'uebung-03.zip', type: 'application/zip', size: 860_000, data: '' },
];

function AttachmentListPreview() {
  const locale = useLocale();
  return <AttachmentList attachments={sampleAttachments} locale={locale} onRemove={() => undefined} />;
}

function ProfileSummaryPreview() {
  const data = useProfileData();
  return <ProfileSummary data={data} />;
}

function ProfilePreviewPreview() {
  const data = useProfileData();
  return <ProfilePreview data={data} />;
}

function QuizButtonPreview() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <QuizButton label="Prüfen" onPress={() => undefined} />
      <QuizButton label="Weiter" onPress={() => undefined} secondary />
      <QuizButton label="Abbrechen" onPress={() => undefined} danger />
      <QuizButton label="Deaktiviert" onPress={() => undefined} disabled />
    </View>
  );
}

function OptionRowPreview() {
  return (
    <PreviewColumn>
      <OptionRow label="Ausgewählt" selected onPress={() => undefined} />
      <OptionRow label="Richtig" selected correct onPress={() => undefined} />
      <OptionRow label="Falsch" selected wrong onPress={() => undefined} />
      <OptionRow label="Mehrfachauswahl" selected multiple onPress={() => undefined} />
      <OptionRow label="Deaktiviert" selected={false} disabled onPress={() => undefined} />
    </PreviewColumn>
  );
}

const singleQuestion: SingleChoiceQuestion = {
  id: 'demo-single',
  kind: 'single',
  prompt: { de: 'Welche Laufzeit hat die binäre Suche?', en: 'What is the runtime of binary search?' },
  options: [
    { id: 'a', label: { de: 'O(log n)', en: 'O(log n)' } },
    { id: 'b', label: { de: 'O(n)', en: 'O(n)' } },
    { id: 'c', label: { de: 'O(n²)', en: 'O(n²)' } },
  ],
  correctId: 'a',
  explanation: { de: 'Jeder Schritt halbiert die Suchmenge.', en: 'Every step halves the search space.' },
};

function SingleChoiceViewPreview() {
  const locale = useLocale();
  const [value, setValue] = useState<string | undefined>('b');
  const [revealed, setRevealed] = useState(false);
  return (
    <PreviewColumn>
      <SingleChoiceView question={singleQuestion} locale={locale} value={value} revealed={revealed} onChange={setValue} />
      <Button secondary label={revealed ? 'Zurücksetzen' : 'Auflösen'} onPress={() => setRevealed((next) => !next)} />
    </PreviewColumn>
  );
}

const trueFalseQuestion: TrueFalseQuestion = {
  id: 'demo-true-false',
  kind: 'true-false',
  prompt: { de: 'Ein Binärbaum hat höchstens zwei Kinder pro Knoten.', en: 'A binary tree has at most two children per node.' },
  correct: true,
};

function TrueFalseViewPreview() {
  const locale = useLocale();
  const [value, setValue] = useState<boolean | undefined>(true);
  return <TrueFalseView question={trueFalseQuestion} locale={locale} value={value} revealed={false} onChange={setValue} />;
}

const clozeQuestion: ClozeQuestion = {
  id: 'demo-cloze',
  kind: 'cloze',
  prompt: { de: 'Ergänze die Begriffe.', en: 'Fill in the terms.' },
  segments: [
    { type: 'text', value: { de: 'Die binäre Suche halbiert die', en: 'Binary search halves the' } },
    { type: 'blank', accepted: ['Suchmenge', 'search space'], width: 130 },
    { type: 'text', value: { de: 'in jedem Schritt.', en: 'at every step.' } },
  ],
};

function ClozeViewPreview() {
  const locale = useLocale();
  const [value, setValue] = useState<string[]>(['']);
  return <ClozeView question={clozeQuestion} locale={locale} value={value} revealed={false} onChange={setValue} />;
}

const flashcardQuestion: FlashcardQuestion = {
  id: 'demo-flashcard',
  kind: 'flashcard',
  prompt: { de: 'Was ist ein Heap?', en: 'What is a heap?' },
  back: { de: 'Ein teilweise geordneter Binärbaum, dessen Wurzel das Minimum oder Maximum trägt.', en: 'A partially ordered binary tree whose root carries the minimum or maximum.' },
};

function FlashcardViewPreview() {
  const locale = useLocale();
  const [value, setValue] = useState<'known' | 'unknown' | undefined>(undefined);
  return <FlashcardView question={flashcardQuestion} locale={locale} value={value} revealed={false} onSelfAssess={(known) => setValue(known ? 'known' : 'unknown')} />;
}

function QuestionFeedbackPreview() {
  const locale = useLocale();
  return (
    <PreviewColumn>
      <QuestionFeedback question={singleQuestion} locale={locale} correct />
      <QuestionFeedback question={singleQuestion} locale={locale} correct={false} />
    </PreviewColumn>
  );
}

function QuizToolbarPreview() {
  const locale = useLocale();
  const [query, setQuery] = useState('');
  return (
    <QuizToolbar
      locale={locale}
      query={query}
      onQueryChange={setQuery}
      onOpenStudies={() => undefined}
      onOpenFilter={() => undefined}
      studyActive
      filterActive={false}
    />
  );
}

function CalendarHeroPreview() {
  return <CalendarHero />;
}

function TutorialsListPreview() {
  return <TutorialsList />;
}

function LecturersListPreview() {
  return <LecturersList />;
}

/**
 * Live demos for the catalog. Keyed by export name; every entry in the
 * generated catalog renders the previews of its exports that appear here.
 * Components that need a route, a modal host, or a live portal session are
 * intentionally absent and show the file + occurrence list only.
 */
export const COMPONENT_PREVIEWS: Record<string, ComponentType> = {
  Mark: MarkPreview,
  Card: CardPreview,
  Section: SectionPreview,
  Pill: PillPreview,
  Meter: MeterPreview,
  Button: ButtonPreview,
  FieldLabel: FieldLabelPreview,
  SearchField: SearchFieldPreview,
  Muted: MutedPreview,
  Strong: StrongPreview,
  InfoRow: InfoRowPreview,
  ChoiceCard: ChoiceCardPreview,
  ControlIcon: ControlIconPreview,
  ToolButton: ToolButtonPreview,
  JsonTree: JsonTreePreview,
  SectionTitle: SectionTitlePreview,
  Notice: NoticePreview,
  Field: FieldPreview,
  Meta: MetaPreview,
  Footer: FooterPreview,
  ErrorText: ErrorTextPreview,
  Chip: ChipPreview,
  Checkbox: CheckboxPreview,
  LanguagePicker: LanguagePickerPreview,
  MailBody: MailBodyPreview,
  OptionRows: OptionRowsPreview,
  StructureRow: StructureRowPreview,
  TreeChildren: TreeChildrenPreview,
  DropdownPicker: DropdownPickerPreview,
  DrawerPanel: DrawerPanelPreview,
  ResponsiveGrid: ResponsiveGridPreview,
  SigningIn: SigningInPreview,
  showToast: ToastPreview,
  DeviceQr: DeviceQrPreview,
  MemberAvatar: MemberAvatarPreview,
  ContactBadge: ContactBadgePreview,
  MailRow: MailRowPreview,
  MailListSkeleton: MailListSkeletonPreview,
  ToolbarSkeleton: ToolbarSkeletonPreview,
  AttachmentList: AttachmentListPreview,
  ProfileSummary: ProfileSummaryPreview,
  ProfilePreview: ProfilePreviewPreview,
  QuizButton: QuizButtonPreview,
  OptionRow: OptionRowPreview,
  SingleChoiceView: SingleChoiceViewPreview,
  TrueFalseView: TrueFalseViewPreview,
  ClozeView: ClozeViewPreview,
  FlashcardView: FlashcardViewPreview,
  QuestionFeedback: QuestionFeedbackPreview,
  QuizToolbar: QuizToolbarPreview,
  CalendarHero: CalendarHeroPreview,
  TutorialsList: TutorialsListPreview,
  LecturersList: LecturersListPreview,
};

function TreeChildrenPreview() {
  return (
    <TreeChildren>
      <StructureRow name="Wurzel" designation="ROOT" elementType="ROOT" onPress={() => undefined} />
      <StructureRow name="Kind" designation="M-INF-101" elementType="MODUL" onPress={() => undefined} depth={1} />
    </TreeChildren>
  );
}
