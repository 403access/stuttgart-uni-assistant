import { useState } from 'react';
import { RefreshControl, Text, useWindowDimensions } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';

import { Screen } from '@/src/components/ui';
import { DrawerPanel } from '@/src/mail/components/drawer-panel';
import { MailConnectionPanel } from '@/src/mail/components/mail-connection-panel';
import { MailMessageList } from '@/src/mail/components/mail-message-list';
import { MailReveal } from '@/src/mail/components/mail-skeletons';
import { MailToolbar } from '@/src/mail/components/mail-toolbar';
import { OptionRows } from '@/src/mail/components/option-rows';
import { useMailInbox } from '@/src/mail/use-mail-inbox';
import { useMailList } from '@/src/mail/use-mail-list';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { tx } from '@/src/text';

export default function MailScreen() {
  const { locale } = useApp();
  const inbox = useMailInbox();
  const list = useMailList({ messages: inbox.messages, folders: inbox.folders, folder: inbox.folder, locale });

  /** The mailbox opens from the left, the sender filter from the right. */
  const [mailboxOpen, setMailboxOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, Math.round(width * 0.86));

  const loadingLabel = tx(locale, 'tabsMail.lade', [list.folderValueText]);

  function applyFolderKey(key: string) {
    setMailboxOpen(false);
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
      loadingLabel={loadingLabel}
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
        <Screen
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
      </Drawer>
    </Drawer>
  );
}

const styles = themedStyles((colors) => ({
  note: { color: colors.success, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
