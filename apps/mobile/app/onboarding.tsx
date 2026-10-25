import { MaterialIcons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isBiometricCancel } from '@/src/auth/biometric-messages';
import { useBiometricPrompt } from '@/src/auth/use-biometric-prompt';
import { AmbientBackground } from '@/src/components/ambient-background';
import { ChoiceCard } from '@/src/components/choice-card';
import { Button, Mark, Pill } from '@/src/components/ui';
import { showToast } from '@ua/ui';
import type { IliasTutorial, IliasTutorialFile } from '@ua/feature-ilias';
import { useOnboarding } from '@/src/onboarding/OnboardingState';
import { useOnboardingImport } from '@/src/onboarding/use-onboarding-import';
import { useAppSelector, appActions } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { formatTime, localDay, monthShort, tx } from '@ua/core/format';
import type { CampusCalendarEvent, DesignMode, MailMessage, ThemeMode } from '@ua/core/domain/types';

type Step = 'biometrics' | 'appearance' | 'calendar' | 'mail' | 'timetable' | 'tutorials';
type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Caption plus one list row; used to fit the fixed-height import pages. */
const LIST_CAPTION_HEIGHT = 24;
const LIST_ROW_HEIGHT = 66;

const STEP_ORDER = ['biometrics', 'appearance', 'calendar', 'mail', 'timetable', 'tutorials'] as const;

/**
 * First-run flow after a successful sign-in. Biometrics comes first, then the
 * visual style, then the three imports as separate pages: personal calendar,
 * UniMail inbox, and the study structure plus courses that feed the timetable.
 * All three pipelines start with this screen, so each page opens on its result
 * when possible and falls back to a loader while the import is still running.
 */
export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const locale = useAppSelector((state) => state.locale);
  const theme = useAppSelector((state) => state.theme);
  const design = useAppSelector((state) => state.design);
  const { setTheme, setDesign } = appActions;
  const { completeOnboarding, biometricsAvailable } = useOnboarding();
  const biometrics = useBiometricPrompt();
  const imports = useOnboardingImport();
  const [step, setStep] = useState<Step>(() => (biometricsAvailable ? 'biometrics' : 'appearance'));
  const flowSteps: readonly Step[] = biometricsAvailable
    ? STEP_ORDER
    : STEP_ORDER.filter((entry) => entry !== 'biometrics');
  const finishing = useRef(false);

  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    await completeOnboarding();
    router.replace('/');
  }, [completeOnboarding]);

  async function enable() {
    const result = await biometrics.prompt('onboarding.systemgrund');
    if (!result) return;
    if (result.success) {
      setStep('appearance');
      return;
    }
    if (isBiometricCancel(result.error)) {
      // Cancelling the prompt is a decline, not a failure. Continue to the
      // style step so the flow does not greet the user again on every launch.
      showToast({
        tone: 'info',
        title: tx(locale, 'onboarding.nicht_aktiviert'),
        message: tx(locale, 'onboarding.hinweis'),
      });
      setStep('appearance');
    }
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <OnboardingHero locale={locale} step={step} steps={flowSteps} topInset={insets.top} />
      {/* Every step fills the remaining height, so the sheet reaches the bottom
          edge and the brand background never shows below it. The import result
          steps are deliberately fixed: the button stays at the bottom and each
          list shows only the rows that actually fit. */}
      {step === 'biometrics' ? (
        <BiometricsPage
          locale={locale}
          busy={biometrics.busy}
          error={biometrics.error}
          onEnable={() => void enable()}
          onSkip={() => setStep('appearance')}
        />
      ) : step === 'appearance' ? (
        <AppearancePage
          locale={locale}
          theme={theme}
          setTheme={setTheme}
          design={design}
          setDesign={setDesign}
          onBack={biometricsAvailable ? () => setStep('biometrics') : undefined}
          onContinue={() => setStep('calendar')}
        />
      ) : step === 'calendar' ? (
        <CalendarImportPage
          locale={locale}
          calendar={imports.calendar}
          onBack={() => setStep('appearance')}
          onContinue={() => setStep('mail')}
        />
      ) : step === 'mail' ? (
        <MailImportPage
          locale={locale}
          mail={imports.mail}
          onBack={() => setStep('calendar')}
          onContinue={() => setStep('timetable')}
        />
      ) : step === 'timetable' ? (
        <TimetableImportPage
          locale={locale}
          timetable={imports.timetable}
          onBack={() => setStep('mail')}
          onContinue={() => setStep('tutorials')}
        />
      ) : (
        <TutorialImportPage
          locale={locale}
          tutorials={imports.tutorials}
          onBack={() => setStep('timetable')}
          onContinue={() => void finish()}
        />
      )}
    </View>
  );
}

function OnboardingHero({
  locale,
  step,
  steps,
  topInset,
}: {
  locale: 'de' | 'en';
  step: Step;
  steps: readonly Step[];
  topInset: number;
}) {
  const currentStep = Math.max(1, steps.indexOf(step) + 1);
  const totalSteps = steps.length;
  const progressLabel = tx(locale, 'onboarding.fortschritt', [currentStep, totalSteps]);
  return (
    <View style={[styles.hero, { paddingTop: topInset + 12 }]}>
      <View pointerEvents="none" style={styles.heroGlow} />
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.markChip}>
            <Mark size={18} />
          </View>
          <Text style={styles.brand}>University Assistant</Text>
        </View>
        <Text style={styles.progressCount} accessible={false}>
          {currentStep} / {totalSteps}
        </Text>
      </View>
      <View
        style={styles.progress}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={progressLabel}
        accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
        accessibilityHint={tx(locale, 'onboarding.fortschritt_hinweis')}>
        {steps.map((entry, index) => (
          <View
            key={entry}
            style={[styles.progressSegment, index < currentStep && styles.progressSegmentDone]}
          />
        ))}
      </View>
    </View>
  );
}

function BiometricsPage({
  locale,
  busy,
  error,
  onEnable,
  onSkip,
}: {
  locale: 'de' | 'en';
  busy: boolean;
  error: string;
  onEnable: () => void;
  onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <StepIntro
          icon="fingerprint"
          title={tx(locale, 'onboarding.titel')}
          lead={tx(locale, 'onboarding.text')}
        />

        <View style={styles.points}>
          <Point text={tx(locale, 'onboarding.punkt1')} />
          <Point text={tx(locale, 'onboarding.punkt2')} />
        </View>

        {error ? <ErrorBox text={error} /> : null}

        <View style={styles.actions}>
          <Button
            label={busy ? tx(locale, 'onboarding.aktivieren_laeuft') : tx(locale, 'onboarding.aktivieren')}
            onPress={onEnable}
          />
          {error ? (
            <Button
              secondary
              label={tx(locale, 'onboarding.systemeinstellungen')}
              onPress={() => void Linking.openSettings().catch(() => undefined)}
            />
          ) : null}
          <Button secondary label={tx(locale, 'onboarding.nicht_jetzt')} onPress={onSkip} />
        </View>
        <Text style={styles.hint}>{tx(locale, 'onboarding.hinweis')}</Text>
      </ScrollView>
    </View>
  );
}

function AppearancePage({
  locale,
  theme,
  setTheme,
  design,
  setDesign,
  onBack,
  onContinue,
}: {
  locale: 'de' | 'en';
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  design: DesignMode;
  setDesign: (design: DesignMode) => void;
  onBack?: () => void;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sheet,
        styles.previewSheet,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}>
      <AmbientBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <StepIntro
          icon="palette"
          title={tx(locale, 'onboarding.stil_titel')}
          lead={tx(locale, 'onboarding.stil_text')}
        />

        <Text style={styles.groupLabel}>{tx(locale, 'einstellungen.design')}</Text>
        <View style={styles.choices}>
          <ChoiceCard
            icon="light-mode"
            label={tx(locale, 'einstellungen.hell')}
            active={theme === 'light'}
            onPress={() => setTheme('light')}
          />
          <ChoiceCard
            icon="dark-mode"
            label={tx(locale, 'einstellungen.dunkel')}
            active={theme === 'dark'}
            onPress={() => setTheme('dark')}
          />
        </View>

        <Text style={styles.groupLabel}>{tx(locale, 'einstellungen.stil')}</Text>
        <View style={styles.choices}>
          <ChoiceCard
            icon="grid-view"
            label={tx(locale, 'einstellungen.clean')}
            active={design === 'clean'}
            onPress={() => setDesign('clean')}
          />
          <ChoiceCard
            icon="auto-awesome"
            label={tx(locale, 'einstellungen.playful')}
            active={design === 'playful'}
            onPress={() => setDesign('playful')}
          />
        </View>

        <View style={styles.spacer} />
        <View style={styles.actionRow}>
          {onBack ? (
            <View style={styles.actionItem}>
              <Button secondary label={tx(locale, 'onboarding.zurueck')} onPress={onBack} />
            </View>
          ) : null}
          <View style={styles.actionItem}>
            <Button label={tx(locale, 'onboarding.weiter')} onPress={onContinue} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function CalendarImportPage({
  locale,
  calendar,
  onBack,
  onContinue,
}: {
  locale: 'de' | 'en';
  calendar: ReturnType<typeof useOnboardingImport>['calendar'];
  onBack: () => void;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [listHeight, setListHeight] = useState(0);
  const overview = useMemo(() => buildCalendarOverview(calendar.events), [calendar.events]);
  const loading = !calendar.ready;
  // The export is the only source here. Counts from the sync response may be
  // known before the rows are readable, but timetable courses must never stand
  // in for appointments that were not imported for this user.
  const knownTotal = overview.total || calendar.result?.total || 0;
  const visibleCount = Math.max(0, Math.floor((listHeight - LIST_CAPTION_HEIGHT) / LIST_ROW_HEIGHT));
  const visibleItems = overview.upcoming.slice(0, visibleCount);

  return (
    <View
      style={[
        styles.sheet,
        styles.sheetFixed,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}>
      <StepIntro
        icon="calendar-month"
        title={loading ? tx(locale, 'onboarding.kalender_laedt') : tx(locale, 'onboarding.kalender_titel')}
        lead={loading ? tx(locale, 'onboarding.kalender_laedt_text') : tx(locale, 'onboarding.kalender_text')}
      />

      {loading ? (
        <>
          <LoadingCard
            title={tx(locale, 'onboarding.kalender_import_laeuft')}
            text={tx(locale, 'onboarding.kalender_laedt_text')}
          />
          <View style={styles.spacer} />
        </>
      ) : knownTotal > 0 ? (
        <>
          <StatRow
            first={knownTotal}
            firstLabel={tx(locale, 'onboarding.kalender_importiert')}
            second={overview.nextCount}
            secondLabel={tx(locale, 'onboarding.kalender_anstehend')}
          />
          {overview.upcoming.length > 0 ? (
            <View
              style={[styles.flexListArea, styles.centeredListArea]}
              onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}>
              {visibleItems.length > 0 ? (
                <UpcomingList
                  locale={locale}
                  items={visibleItems}
                  caption={tx(locale, 'onboarding.kalender_als_naechstes')}
                />
              ) : null}
            </View>
          ) : (
            <>
              <EmptyCard
                icon="event-available"
                text={tx(
                  locale,
                  overview.total === 0
                    ? 'onboarding.kalender_vorschau_fehlt'
                    : 'onboarding.kalender_keine_anstehend',
                  [knownTotal],
                )}
              />
              <View style={styles.spacer} />
            </>
          )}
        </>
      ) : (
        <>
          <EmptyCard
            icon="event-busy"
            text={tx(
              locale,
              calendar.error ? 'onboarding.kalender_fehler_leer' : 'onboarding.kalender_keine',
            )}
          />
          <View style={styles.spacer} />
        </>
      )}

      {calendar.error && !loading ? (
        <ErrorBox text={tx(locale, 'onboarding.kalender_fehler', [calendar.error])} />
      ) : null}

      <StepActions
        loading={loading}
        error={calendar.error}
        continueLabel={tx(locale, 'onboarding.kalender_weiter')}
        retryLabel={tx(locale, 'onboarding.kalender_erneut')}
        backLabel={tx(locale, 'onboarding.zurueck')}
        onContinue={onContinue}
        onRetry={calendar.retry}
        onBack={onBack}
      />
    </View>
  );
}

function MailImportPage({
  locale,
  mail,
  onBack,
  onContinue,
}: {
  locale: 'de' | 'en';
  mail: ReturnType<typeof useOnboardingImport>['mail'];
  onBack: () => void;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [listHeight, setListHeight] = useState(0);
  const loading = !mail.ready;
  const unread = useMemo(() => mail.messages.filter((message) => !message.seen).length, [mail.messages]);
  const latest = useMemo(
    () => [...mail.messages].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [mail.messages],
  );
  // If the sheet is too tight for the caption plus one row on a small screen,
  // no message is shown at all.
  const visibleCount = Math.max(0, Math.floor((listHeight - LIST_CAPTION_HEIGHT) / LIST_ROW_HEIGHT));
  const visibleMessages = latest.slice(0, visibleCount);
  const connected = mail.status?.configured ?? false;

  return (
    <View
      style={[
        styles.sheet,
        styles.sheetFixed,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}>
      <StepIntro
        icon="inbox"
        title={loading ? tx(locale, 'onboarding.mail_laedt') : tx(locale, 'onboarding.mail_titel')}
        lead={loading ? tx(locale, 'onboarding.mail_laedt_text') : tx(locale, 'onboarding.mail_text')}
      />

      {loading ? (
        <>
          <LoadingCard
            title={tx(locale, 'onboarding.mail_import_laeuft')}
            text={tx(locale, 'onboarding.mail_laedt_text')}
          />
          <View style={styles.spacer} />
        </>
      ) : mail.messages.length > 0 ? (
        <>
          <StatRow
            first={mail.messages.length}
            firstLabel={tx(locale, 'onboarding.mail_importiert')}
            second={unread}
            secondLabel={tx(locale, 'onboarding.mail_ungelesen')}
          />
          <View
            style={styles.flexListArea}
            onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}>
            {visibleMessages.length > 0 ? (
              <View style={styles.upcoming}>
                <Text style={styles.sectionCaption}>{tx(locale, 'onboarding.mail_als_naechstes')}</Text>
                {visibleMessages.map((message) => (
                  <MailRow key={message.uid} message={message} locale={locale} />
                ))}
              </View>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <EmptyCard
            icon={connected ? 'mark-email-unread' : 'mail-outline'}
            text={tx(
              locale,
              mail.error
                ? 'onboarding.mail_fehler_leer'
                : connected
                  ? 'onboarding.mail_keine'
                  : 'onboarding.mail_nicht_verbunden',
            )}
          />
          <View style={styles.spacer} />
        </>
      )}

      {mail.error && !loading ? (
        <ErrorBox text={tx(locale, 'onboarding.mail_fehler', [mail.error])} />
      ) : null}

      <StepActions
        loading={loading}
        error={mail.error}
        continueLabel={tx(locale, 'onboarding.mail_weiter')}
        retryLabel={tx(locale, 'onboarding.mail_erneut')}
        backLabel={tx(locale, 'onboarding.zurueck')}
        onContinue={onContinue}
        onRetry={mail.retry}
        onBack={onBack}
      />
    </View>
  );
}

function TimetableImportPage({
  locale,
  timetable,
  onBack,
  onContinue,
}: {
  locale: 'de' | 'en';
  timetable: ReturnType<typeof useOnboardingImport>['timetable'];
  onBack: () => void;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [listHeight, setListHeight] = useState(0);
  const overview = useMemo(() => buildTimetableOverview(timetable.courses), [timetable.courses]);
  const loading = !timetable.ready;
  const visibleCount = Math.max(0, Math.floor((listHeight - LIST_CAPTION_HEIGHT) / LIST_ROW_HEIGHT));
  const visibleItems = overview.upcoming.slice(0, visibleCount);

  return (
    <View
      style={[
        styles.sheet,
        styles.sheetFixed,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}>
      <StepIntro
        icon="calendar-month"
        title={loading ? tx(locale, 'onboarding.stundenplan_laedt') : tx(locale, 'onboarding.stundenplan_titel')}
        lead={loading ? tx(locale, 'onboarding.stundenplan_laedt_text') : tx(locale, 'onboarding.stundenplan_text')}
      />

      {loading ? (
        <>
          <LoadingCard
            title={tx(locale, 'onboarding.stundenplan_import_laeuft')}
            text={
              timetable.phase === 'sync' && timetable.progress.fetched > 0
                ? tx(locale, 'onboarding.stundenplan_fortschritt', [
                    timetable.progress.fetched,
                    timetable.progress.courseCount,
                  ])
                : timetable.studyName
                  ? tx(locale, 'onboarding.stundenplan_liest', [timetable.studyName])
                  : tx(locale, 'onboarding.stundenplan_laedt_text')
            }
          />
          <View style={styles.spacer} />
        </>
      ) : overview.datedCount > 0 ? (
        <>
          <StatRow
            first={overview.datedCount}
            firstLabel={tx(locale, 'onboarding.stundenplan_importiert')}
            second={overview.nextCount}
            secondLabel={tx(locale, 'onboarding.stundenplan_anstehend')}
          />
          {overview.upcoming.length > 0 ? (
            <View
              style={[styles.flexListArea, styles.centeredListArea]}
              onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}>
              {visibleItems.length > 0 ? (
                <UpcomingList
                  locale={locale}
                  items={visibleItems}
                  caption={tx(locale, 'onboarding.stundenplan_als_naechstes')}
                />
              ) : null}
            </View>
          ) : (
            <>
              <EmptyCard
                icon="event-available"
                text={tx(locale, 'onboarding.stundenplan_keine_anstehend', [overview.datedCount])}
              />
              <View style={styles.spacer} />
            </>
          )}
        </>
      ) : (
        <>
          <EmptyCard
            icon="event-busy"
            text={tx(
              locale,
              timetable.error ? 'onboarding.stundenplan_fehler_leer' : 'onboarding.stundenplan_keine',
            )}
          />
          <View style={styles.spacer} />
        </>
      )}

      {timetable.error && !loading ? (
        <ErrorBox text={tx(locale, 'onboarding.stundenplan_fehler', [timetable.error])} />
      ) : null}

      <StepActions
        loading={loading}
        error={timetable.error}
        continueLabel={tx(locale, 'onboarding.stundenplan_weiter')}
        retryLabel={tx(locale, 'onboarding.stundenplan_erneut')}
        backLabel={tx(locale, 'onboarding.zurueck')}
        onContinue={onContinue}
        onRetry={timetable.retry}
        onBack={onBack}
      />
    </View>
  );
}

function TutorialImportPage({
  locale,
  tutorials,
  onBack,
  onContinue,
}: {
  locale: 'de' | 'en';
  tutorials: ReturnType<typeof useOnboardingImport>['tutorials'];
  onBack: () => void;
  onContinue: () => void;
}) {
  const insets = useSafeAreaInsets();
  const loading = !tutorials.ready;
  const files = useMemo(
    () => tutorials.tutorials.reduce((total, tutorial) => total + tutorial.files.length, 0),
    [tutorials.tutorials],
  );
  const connected = tutorials.status?.sessionActive ?? false;

  return (
    <View
      style={[
        styles.sheet,
        styles.sheetFixed,
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}>
      <StepIntro
        icon="groups"
        title={loading ? tx(locale, 'onboarding.tutorien_laedt') : tx(locale, 'onboarding.tutorien_titel')}
        lead={loading ? tx(locale, 'onboarding.tutorien_laedt_text') : tx(locale, 'onboarding.tutorien_text')}
      />

      {loading ? (
        <>
          <LoadingCard
            title={tx(locale, 'onboarding.tutorien_laedt')}
            text={tx(locale, 'onboarding.tutorien_laedt_text')}
          />
          <View style={styles.spacer} />
        </>
      ) : tutorials.tutorials.length > 0 ? (
        <>
          <StatRow
            first={tutorials.tutorials.length}
            firstLabel={tx(locale, 'onboarding.tutorien_anzahl')}
            second={files}
            secondLabel={tx(locale, 'onboarding.tutorien_dateien')}
          />
          <ScrollView
            style={styles.flexListArea}
            contentContainerStyle={styles.tutorialList}
            showsVerticalScrollIndicator={false}>
            {tutorials.tutorials.map((tutorial) => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} locale={locale} />
            ))}
          </ScrollView>
        </>
      ) : (
        <>
          <EmptyCard
            icon={connected ? 'school' : 'link-off'}
            text={tx(
              locale,
              connected ? 'onboarding.tutorien_keine' : 'onboarding.tutorien_nicht_verbunden',
            )}
          />
          <View style={styles.spacer} />
        </>
      )}

      {tutorials.error && !loading ? (
        <ErrorBox text={tx(locale, 'onboarding.tutorien_fehler', [tutorials.error])} />
      ) : null}

      {!loading && !connected && !tutorials.error ? (
        <Button
          secondary
          label={tx(locale, 'onboarding.tutorien_erneut')}
          onPress={tutorials.retry}
        />
      ) : null}

      <StepActions
        loading={loading}
        error={tutorials.error}
        continueLabel={tx(locale, 'onboarding.tutorien_weiter')}
        retryLabel={tx(locale, 'onboarding.tutorien_erneut')}
        backLabel={tx(locale, 'onboarding.zurueck')}
        onContinue={onContinue}
        onRetry={tutorials.retry}
        onBack={onBack}
      />
    </View>
  );
}

function TutorialCard({ tutorial, locale }: { tutorial: IliasTutorial; locale: 'de' | 'en' }) {
  const open = () => {
    if (!tutorial.refId) return;
    router.push({
      pathname: '/ilias/[refId]',
      params: { refId: String(tutorial.refId), kind: tutorial.kind, title: tutorial.title },
    });
  };
  const openFile = (file: IliasTutorialFile) => {
    if (!file.refId) return;
    router.push({
      pathname: '/ilias/datei',
      params: {
        refId: String(file.refId),
        title: file.title,
        type: file.type,
        size: file.size,
        date: file.date,
      },
    });
  };
  const properties = tutorial.properties
    .map((entry) => [entry.name, entry.value].filter(Boolean).join(': '))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <View style={styles.tutorialCard}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={tutorial.title}
        style={({ pressed }) => [styles.tutorialHead, pressed && styles.pressed]}>
        <View style={styles.tutorialHeading}>
          <Text style={styles.tutorialTitle} numberOfLines={2}>
            {tutorial.title}
          </Text>
          {tutorial.type ? <Pill label={tutorial.type} tone="neutral" /> : null}
        </View>
        <MaterialIcons name="chevron-right" size={18} color={colors.mute} />
      </Pressable>

      {tutorial.course ? <Text style={styles.tutorialCourse}>{tutorial.course}</Text> : null}

      <View style={styles.tutorialMeta}>
        <MaterialIcons name="person-outline" size={14} color={colors.blue} />
        <Text style={styles.tutorialMetaText} numberOfLines={1}>
          {tutorial.teacher || tx(locale, 'onboarding.tutorien_ohne_lehrer')}
        </Text>
      </View>
      {tutorial.schedule ? (
        <View style={styles.tutorialMeta}>
          <MaterialIcons name="schedule" size={14} color={colors.blue} />
          <Text style={styles.tutorialMetaText} numberOfLines={2}>
            {tutorial.schedule}
          </Text>
        </View>
      ) : null}
      {tutorial.room ? (
        <View style={styles.tutorialMeta}>
          <MaterialIcons name="place" size={14} color={colors.blue} />
          <Text style={styles.tutorialMetaText} numberOfLines={1}>
            {tutorial.room}
          </Text>
        </View>
      ) : null}
      {properties.length ? (
        <Text style={styles.tutorialProperties} numberOfLines={2}>
          {properties.join(' · ')}
        </Text>
      ) : null}

      <View style={styles.tutorialFiles}>
        <Text style={styles.sectionCaption}>{tx(locale, 'onboarding.tutorien_dateien')}</Text>
        {tutorial.files.length ? (
          tutorial.files.map((file) => (
            <Pressable
              key={file.id}
              onPress={() => openFile(file)}
              accessibilityRole="button"
              accessibilityLabel={file.title}
              style={({ pressed }) => [styles.fileRow, pressed && styles.pressed]}>
              <MaterialIcons name="description" size={16} color={colors.blue} />
              <View style={styles.fileCopy}>
                <Text style={styles.fileTitle} numberOfLines={2}>
                  {file.title}
                </Text>
                <Text style={styles.fileMeta} numberOfLines={1}>
                  {[file.type?.toUpperCase(), file.size, file.date].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={16} color={colors.mute} />
            </Pressable>
          ))
        ) : (
          <Text style={styles.tutorialEmpty}>{tx(locale, 'onboarding.tutorien_ohne_dateien')}</Text>
        )}
      </View>
    </View>
  );
}

function StepIntro({ icon, title, lead }: { icon: IconName; title: string; lead: string }) {
  return (
    <>
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={38} color={colors.blue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.lead}>{lead}</Text>
    </>
  );
}

function LoadingCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator size="small" color={colors.blue} />
      <View style={styles.loadingCopy}>
        <Text style={styles.loadingTitle}>{title}</Text>
        <Text style={styles.loadingText}>{text}</Text>
      </View>
    </View>
  );
}

function StatRow({
  first,
  firstLabel,
  second,
  secondLabel,
}: {
  first: number;
  firstLabel: string;
  second: number;
  secondLabel: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{first}</Text>
        <Text style={styles.statLabel}>{firstLabel}</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.stat}>
        <Text style={styles.statValue}>{second}</Text>
        <Text style={styles.statLabel}>{secondLabel}</Text>
      </View>
    </View>
  );
}

function StepActions({
  loading,
  error,
  continueLabel,
  retryLabel,
  backLabel,
  onContinue,
  onRetry,
  onBack,
}: {
  loading: boolean;
  error: string;
  continueLabel: string;
  retryLabel: string;
  backLabel: string;
  onContinue: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.actions}>
      {!loading && error ? <Button secondary label={retryLabel} onPress={onRetry} /> : null}
      <View style={styles.actionRow}>
        <View style={styles.actionItem}>
          <Button secondary label={backLabel} onPress={onBack} />
        </View>
        <View style={styles.actionItem}>
          <Button label={continueLabel} onPress={onContinue} />
        </View>
      </View>
    </View>
  );
}

function UpcomingList({
  locale,
  items,
  caption,
}: {
  locale: 'de' | 'en';
  items: UpcomingItem[];
  caption: string;
}) {
  return (
    <View style={styles.upcoming}>
      <Text style={styles.sectionCaption}>{caption}</Text>
      {items.map((item) => (
        <View key={item.key} style={styles.entry}>
          <View style={styles.entryDate}>
            <Text style={styles.entryDay}>{Number(item.date.slice(8, 10))}</Text>
            <Text style={styles.entryMonth}>{monthShort(item.date, locale)}</Text>
          </View>
          <View style={styles.entryCopy}>
            <Text style={styles.entryTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.entryMeta} numberOfLines={1}>
              {[item.time, item.location].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MailRow({ message, locale }: { message: MailMessage; locale: 'de' | 'en' }) {
  const date = message.date?.slice(0, 10) ?? '';
  return (
    <View style={styles.entry}>
      {date ? (
        <View style={styles.entryDate}>
          <Text style={styles.entryDay}>{Number(date.slice(8, 10))}</Text>
          <Text style={styles.entryMonth}>{monthShort(date, locale)}</Text>
        </View>
      ) : (
        <View style={styles.entryDate}>
          <MaterialIcons name="mail-outline" size={18} color="#FFFFFF" />
        </View>
      )}
      <View style={styles.entryCopy}>
        <Text style={styles.entryTitle} numberOfLines={2}>
          {message.subject || tx(locale, 'onboarding.mail_ohne_betreff')}
        </Text>
        <Text style={styles.entryMeta} numberOfLines={1}>
          {[message.from, message.preview].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {!message.seen ? <View style={styles.unreadDot} /> : null}
    </View>
  );
}

function EmptyCard({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.emptyCard}>
      <MaterialIcons name={icon} size={24} color={colors.mute} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <View style={styles.errorBox}>
      <MaterialIcons name="error-outline" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

interface UpcomingItem {
  key: string;
  date: string;
  time: string;
  title: string;
  location: string;
}

function parseIcsDate(value: string): { date: string; time: string } | null {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, , utc] = match;
  if (!hour || !minute) return { date: `${year}-${month}-${day}`, time: '' };
  const date = utc
    ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)))
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return {
    date: localDay(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

function buildCalendarOverview(events: CampusCalendarEvent[]): {
  total: number;
  nextCount: number;
  upcoming: UpcomingItem[];
} {
  const now = new Date();
  const today = localDay(now);
  const nowStamp = `${today}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const parsed = events.flatMap((event) => {
    const start = parseIcsDate(event.dtstart);
    if (!start) return [];
    return [
      {
        key: event.uid,
        date: start.date,
        time: start.time,
        title: event.summary || event.description || event.uid,
        location: event.location,
        start: `${start.date}T${start.time || '00:00'}`,
      },
    ];
  });
  const upcoming = parsed
    .filter((event) => event.start >= nowStamp)
    .sort((a, b) => a.start.localeCompare(b.start));
  return { total: parsed.length, nextCount: upcoming.length, upcoming };
}

function buildTimetableOverview(courses: ReturnType<typeof useOnboardingImport>['timetable']['courses']): {
  nextCount: number;
  datedCount: number;
  upcoming: UpcomingItem[];
} {
  const now = new Date();
  const today = localDay(now);
  const nowStamp = `${today}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dated = courses.filter((course) => Boolean(course.startTime));
  const upcoming = dated
    .filter((course) => course.startTime >= nowStamp)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return {
    datedCount: dated.length,
    nextCount: upcoming.length,
    upcoming: upcoming.map((course) => ({
      key: `${course.studyId}-${course.id}`,
      date: course.startTime.slice(0, 10),
      time: `${formatTime(course.startTime)}${course.endTime ? `–${formatTime(course.endTime)}` : ''}`,
      title: course.title,
      location: course.roomName,
    })),
  };
}

function Point({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <MaterialIcons name="check" size={14} color={colors.blue} />
      </View>
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.brand },
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 12 },
  hero: { paddingHorizontal: 22, paddingBottom: 16, gap: 12, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 180,
    backgroundImage: 'radial-gradient(100% 130% at 100% 0%, rgba(0,190,255,0.22), transparent 68%)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  markChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  progressCount: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  progress: { flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.26)' },
  progressSegmentDone: { backgroundColor: '#FFFFFF' },
  sheet: {
    flex: 1,
    backgroundColor: colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    gap: 12,
  },
  /** The style step doubles as a live preview of the app background. */
  previewSheet: { backgroundColor: colors.mist, overflow: 'hidden' },
  sheetFixed: { minHeight: 0, overflow: 'hidden' },
  flexListArea: { flex: 1, minHeight: 0, overflow: 'hidden' },
  centeredListArea: { justifyContent: 'center' },
  spacer: { flex: 1 },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.anthracite, fontSize: 28, lineHeight: 33, fontWeight: '700', letterSpacing: -0.5 },
  lead: { color: colors.inkSoft, fontSize: 15, lineHeight: 22 },
  points: { gap: 12, marginVertical: 4 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pointIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  pointText: { flex: 1, color: colors.anthracite, fontSize: 14, lineHeight: 21 },
  groupLabel: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  choices: { gap: 8 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 12 },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 19 },
  actions: { gap: 10, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionItem: { flex: 1 },
  hint: { color: colors.mute, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    padding: 14,
  },
  loadingCopy: { flex: 1, gap: 2 },
  loadingTitle: { color: colors.anthracite, fontSize: 15, fontWeight: '700' },
  loadingText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: colors.blue, fontSize: 26, fontWeight: '700', lineHeight: 30 },
  statLabel: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.line, marginHorizontal: 12 },
  upcoming: { gap: 8 },
  tutorialList: { gap: 10, paddingBottom: 4 },
  tutorialCard: {
    backgroundColor: colors.mist,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  tutorialHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tutorialHeading: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tutorialTitle: { flex: 1, color: colors.anthracite, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  tutorialCourse: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tutorialMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  tutorialMetaText: { flex: 1, color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  tutorialProperties: { color: colors.mute, fontSize: 11, lineHeight: 16 },
  tutorialFiles: { gap: 5, marginTop: 2 },
  tutorialEmpty: { color: colors.mute, fontSize: 12, lineHeight: 17 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.paper,
    borderRadius: 10,
    padding: 8,
  },
  fileCopy: { flex: 1, gap: 1 },
  fileTitle: { color: colors.anthracite, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  fileMeta: { color: colors.mute, fontSize: 11 },
  pressed: { opacity: 0.72 },
  sectionCaption: {
    color: colors.mute,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.mist,
    borderRadius: 14,
    padding: 10,
  },
  entryDate: {
    width: 46,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    borderRadius: 11,
    paddingVertical: 6,
  },
  entryDay: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  entryMonth: { color: '#9FC0E8', fontSize: 11, fontWeight: '700' },
  entryCopy: { flex: 1, gap: 2 },
  entryTitle: { color: colors.anthracite, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  entryMeta: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  unreadDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: colors.blue },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.mist,
    borderRadius: 14,
    padding: 14,
  },
  emptyText: { flex: 1, color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
}));
