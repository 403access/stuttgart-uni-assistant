import { Text, View } from 'react-native';

import { Card } from '@/src/components/ui';
import { themedStyles } from '@ua/ui/theme';
import { tx } from '@ua/core/format';
import type { Locale, MailMessage } from '@ua/core/domain/types';

import type { InboxFilter } from '@ua/feature-mail';
import { MailRow } from './mail-row';

/** The loaded rows plus the meta line and empty hints that describe the current view. */
export function MailMessageList({
  locale,
  folder,
  folderValueText,
  query,
  filter,
  messages,
  visibleMessages,
  selectedUid,
  onSelect,
}: {
  locale: Locale;
  folder: string;
  folderValueText: string;
  query: string;
  filter: InboxFilter;
  messages: MailMessage[];
  visibleMessages: MailMessage[];
  /** Desktop split view: the row whose message is open in the reader pane. */
  selectedUid?: number | null;
  onSelect?: (message: MailMessage) => void;
}) {
  return (
    <>
      {filter.kind !== 'all' || query ? (
        <Text style={styles.meta}>
          {tx(locale, 'tabsMail.von', [
            visibleMessages.length,
            messages.length,
            filter.kind === 'sender' ? ` · ${filter.sender}` : '',
            query ? ` · „${query.trim()}“` : '',
          ])}
        </Text>
      ) : null}
      {messages.length === 0 ? (
        <Text style={styles.hint}>{tx(locale, 'tabsMail.nachrichten', [folderValueText])}</Text>
      ) : visibleMessages.length === 0 ? (
        <Text style={styles.hint}>{tx(locale, 'tabsMail.treffer')}</Text>
      ) : null}
      {visibleMessages.length > 0 ? (
        <View style={styles.list}>
          {visibleMessages.map((message, index) => (
            <MailRow
              key={message.uid}
              message={message}
              folder={folder}
              last={index === visibleMessages.length - 1}
              locale={locale}
              selected={selectedUid === message.uid}
              onSelect={onSelect}
            />
          ))}
        </View>
      ) : null}
      <Card>
        <Text style={styles.hint}>{tx(locale, 'tabsMail.gelesen')}</Text>
      </Card>
    </>
  );
}

const styles = themedStyles((colors) => ({
  list: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 0,
    backgroundColor: colors.paper,
    marginHorizontal: -20,
  },
  hint: { color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  meta: { color: colors.inkSoft, fontSize: 12 },
}));
