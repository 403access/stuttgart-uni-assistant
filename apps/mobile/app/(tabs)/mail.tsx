import { useState } from 'react';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmbientBackground , Screen , DrawerPanel , OptionRows , useResponsive } from '@ua/ui';
import { MailConnectionPanel , MailReveal , MailToolbar } from '@ua/feature-mail/ui';
import { MailMessageList } from '@/src/mail/components/mail-message-list';
import { MailReader } from '@/src/mail/components/mail-reader';
import { useMailInbox } from '@/src/mail/use-mail-inbox';
import { useMailList } from '@/src/mail/use-mail-list';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';

export default function MailScreen() {
  const locale = useAppSelector((state) => state.locale);
  const inbox = useMailInbox();
  const list = useMailList({ messages: inbox.messages, folders: inbox.folders, folder: inbox.folder, locale });
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();

  /** The mailbox opens from the left, the sender filter from the right. */
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  /** Desktop split view: uid of the message in the reader pane. */
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, Math.round(width * 0.86));
  const desktopPane = isDesktop && inbox.connected;
  const selectedMessage = selectedUid === null ? null : (inbox.messages.find((message) => message.uid === selectedUid) ?? null);
  // The reader pane is permanent on a very wide display; below that it appears
  // only after a message was picked so the list keeps its room.
  const showReaderPane = width >= 1700 || selectedMessage !== null;

  const loadingLabel = tx(locale, 'tabsMail.lade', [list.folderValueText]);

  function applyFolderKey(key: string) {
    setMailboxOpen(false);
    setSelectedUid(null);
    inbox.selectFolder(key);
  }

  function applyFilterKey(key: string) {
    setFilterOpen(false);
    list.applyFilterKey(key);
  }

  const controlsBar = inbox.connected ? (
    <MailToolbar
      locale={locale}
      revealPending={inbox.revealPending}
      hasMessages={inbox.messages.length > 0}
      query={list.query}
      onQueryChange={list.setQuery}
      sortValueText={list.sortValueText}
      sortOptions={list.sortOptions}
      onSortSelect={list.applySortKey}
      onOpenMailbox={() => setMailboxOpen(true)}
      onOpenFilter={() => setFilterOpen(true)}
      onCompose={() => router.push('/mail-verfassen')}
      loadingLabel={loadingLabel}
      showDrawers={!desktopPane}
    />
  ) : null;

  return (
    <Drawer
      open={mailboxOpen}
      onOpen={() => setMailboxOpen(true)}
      onClose={() => setMailboxOpen(false)}
      drawerPosition="left"
      drawerType="front"
      drawerStyle={{ width: drawerWidth }}
      overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
      renderDrawerContent={() => (
        <DrawerPanel
          title={tx(locale, 'tabsMail.postfach')}
          closeLabel={tx(locale, 'common.schliessen')}
          onClose={() => setMailboxOpen(false)}>
          <OptionRows options={list.folderOptions} onSelect={applyFolderKey} />
        </DrawerPanel>
      )}>
      <Drawer
        open={filterOpen}
        onOpen={() => setFilterOpen(true)}
        onClose={() => setFilterOpen(false)}
        drawerPosition="right"
        drawerType="front"
        drawerStyle={{ width: drawerWidth }}
        overlayAccessibilityLabel={tx(locale, 'common.schliessen')}
        renderDrawerContent={() => (
          <DrawerPanel title={tx(locale, 'tabsMail.filter')} closeLabel={tx(locale, 'common.schliessen')} onClose={() => setFilterOpen(false)}>
            <OptionRows options={list.filterOptions} onSelect={applyFilterKey} />
          </DrawerPanel>
        )}>
        {desktopPane ? (
          <View style={[styles.desktopScreen, { paddingTop: insets.top }]}>
            <AmbientBackground />
            <View style={styles.desktopFrame}>
              {controlsBar}
              <View style={styles.desktopBody}>
                <ScrollView style={styles.desktopRail} contentContainerStyle={styles.desktopRailContent}>
                  <Text style={styles.railTitle}>{tx(locale, 'tabsMail.postfaecher')}</Text>
                  <OptionRows options={list.folderOptions} onSelect={applyFolderKey} />
                  <Text style={styles.railGroup}>{tx(locale, 'tabsMail.filter')}</Text>
                  <OptionRows options={list.filterOptions} onSelect={applyFilterKey} />
                </ScrollView>
                <ScrollView
                  style={styles.desktopList}
                  contentContainerStyle={styles.desktopListContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={inbox.refreshing}
                      onRefresh={inbox.pullToRefresh}
                      tintColor={colors.blue}
                      colors={[colors.blue]}
                      progressBackgroundColor={colors.paper}
                    />
                  }>
                  <MailReveal key={inbox.folder} pending={inbox.revealPending} label={loadingLabel}>
                    {inbox.note ? <Text style={styles.note}>{inbox.note}</Text> : null}
                    {inbox.error ? <Text style={styles.error}>{inbox.error}</Text> : null}
                    <MailMessageList
                      locale={locale}
                      folder={inbox.folder}
                      folderValueText={list.folderValueText}
                      query={list.query}
                      filter={list.activeFilter}
                      messages={inbox.messages}
                      visibleMessages={list.visibleMessages}
                      selectedUid={selectedUid}
                      onSelect={(message) => setSelectedUid(message.uid)}
                    />
                  </MailReveal>
                </ScrollView>
                {showReaderPane ? (
                  <View style={styles.desktopReader}>
                    {selectedMessage ? (
                      <ScrollView contentContainerStyle={styles.readerContent}>
                        <MailReader
                          key={`${inbox.folder}-${selectedMessage.uid}`}
                          uid={selectedMessage.uid}
                          folder={inbox.folder}
                          locale={locale}
                          onClose={() => setSelectedUid(null)}
                        />
                      </ScrollView>
                    ) : (
                      <View style={styles.readerEmpty}>
                        <Text style={styles.readerEmptyText}>{tx(locale, 'tabsMail.auswaehlen')}</Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          <Screen
            wide
            stickyHeader={controlsBar}
            topInset
            refreshControl={
              inbox.connected ? (
                <RefreshControl
                  refreshing={inbox.refreshing}
                  onRefresh={inbox.pullToRefresh}
                  tintColor={colors.blue}
                  colors={[colors.blue]}
                  progressBackgroundColor={colors.paper}
                />
              ) : undefined
            }>
            {!inbox.connected ? (
              <MailConnectionPanel
                status={inbox.status}
                sessionAccount={inbox.sessionAccount}
                account={inbox.account}
                password={inbox.password}
                busy={inbox.busy}
                note={inbox.note}
                error={inbox.error}
                locale={locale}
                onAccountChange={inbox.setAccount}
                onPasswordChange={inbox.setPassword}
                onConnect={inbox.connect}
              />
            ) : (
              <MailReveal key={inbox.folder} pending={inbox.revealPending} label={loadingLabel}>
                {inbox.note ? <Text style={styles.note}>{inbox.note}</Text> : null}
                {inbox.error ? <Text style={styles.error}>{inbox.error}</Text> : null}
                <MailMessageList
                  locale={locale}
                  folder={inbox.folder}
                  folderValueText={list.folderValueText}
                  query={list.query}
                  filter={list.activeFilter}
                  messages={inbox.messages}
                  visibleMessages={list.visibleMessages}
                />
              </MailReveal>
            )}
          </Screen>
        )}
      </Drawer>
    </Drawer>
  );
}

const styles = themedStyles((colors) => ({
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  desktopScreen: { flex: 1, backgroundColor: colors.mist },
  desktopFrame: { flex: 1, width: '100%' },
  desktopBody: { flex: 1, flexDirection: 'row', minHeight: 0 },
  desktopRail: {
    width: 250,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  desktopRailContent: { paddingHorizontal: 12, paddingVertical: 14 },
  railTitle: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingBottom: 6,
  },
  railGroup: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    paddingTop: 18,
    paddingBottom: 6,
  },
  desktopList: { flex: 1, minWidth: 0 },
  desktopListContent: { paddingBottom: 28 },
  desktopReader: {
    width: '42%',
    maxWidth: 580,
    minWidth: 320,
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    backgroundColor: colors.mist,
  },
  readerContent: { padding: 20, gap: 14 },
  readerEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  readerEmptyText: { color: colors.mute, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 280 },
}));
