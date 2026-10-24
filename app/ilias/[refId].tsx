import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import { showToast } from '@/src/components/toast';
import { Button, Card, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { saveIliasFile } from '@/src/ilias/download';
import { iliasContentErrorMessage } from '@/src/ilias/errors';
import { isPdfItem } from '@/src/ilias/files';
import { MemberAvatar } from '@/src/ilias/components/member-avatar';
import { iliasContentQuery, iliasMembersQuery, refreshIliasPage } from '@/src/ilias/queries';
import type { IliasContentItem, IliasMember } from '@/src/ilias/types';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { firstParam, tx } from '@/src/text';
import type { Locale } from '@/src/types';

const ILIAS_BASE = 'https://ilias3.uni-stuttgart.de';
/** Object kinds whose page the same list parser understands. */
const BROWSABLE = new Set(['crs', 'grp', 'fold', 'cat']);

function ContentRow({
  item,
  meta,
  busy,
  onPress,
}: {
  item: IliasContentItem;
  meta: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={busy ? undefined : onPress}>
      <View style={styles.rowTop}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.type ? <Pill label={item.type} tone="neutral" /> : null}
      </View>
      {item.description ? (
        <Text style={styles.rowText} numberOfLines={3}>
          {item.description}
        </Text>
      ) : null}
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
    </Card>
  );
}

function MemberRow({
  member,
  locale,
  last,
  showRoles,
  onPress,
}: {
  member: IliasMember;
  locale: Locale;
  last: boolean;
  showRoles: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.memberRow, !last && styles.memberDivider, pressed && styles.memberPressed]}>
      <MemberAvatar imageUrl={member.avatarUrl} name={member.name} size={38} />
      <View style={styles.memberText}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
        </Text>
        {member.username && !member.hidden && member.username !== member.name ? (
          <Text style={styles.memberMeta} numberOfLines={1}>
            {member.username}
          </Text>
        ) : null}
      </View>
      {showRoles ? (
        <Pill
          label={tx(locale, member.roleKind === 'tutor' ? 'tabsIlias.tutor' : 'tabsIlias.teilnehmer')}
          tone={member.roleKind === 'tutor' ? 'blue' : 'neutral'}
        />
      ) : null}
    </Pressable>
  );
}

/** One course, group, or folder read headlessly through the assistant server. */
export default function IliasContentScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{ refId?: string | string[]; kind?: string | string[]; title?: string | string[] }>();
  const refId = Number(firstParam(params.refId));
  const kind = firstParam(params.kind) || 'crs';
  const initialTitle = firstParam(params.title);
  const validRef = Number.isInteger(refId) && refId > 0;
  const queryClient = useQueryClient();
  const query = useQuery(iliasContentQuery(refId, kind, { enabled: validRef }));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const content = query.data;
  const membersUrl = content?.membersUrl ?? '';
  const membersQuery = useQuery(iliasMembersQuery(refId, kind, membersUrl));
  const members = membersQuery.data?.members ?? [];
  // ILIAS only names a role in group galleries; course galleries list names
  // without telling members apart, so a "Teilnehmer" pill would be a guess.
  const showMemberRoles = members.some((member) => member.roleKind === 'tutor');
  const title = content?.title || initialTitle || 'ILIAS';

  const openMember = (member: IliasMember) => {
    router.push({
      pathname: '/ilias/mitglied',
      params: {
        userId: member.userId ? String(member.userId) : '',
        url: member.profileUrl,
        name: member.name,
        username: member.username,
        avatar: member.avatarUrl,
        hidden: member.hidden ? '1' : '',
        role: member.role,
        roleKind: member.roleKind,
        course: title,
        refId: String(refId),
        kind,
      },
    });
  };

  const open = async (item: IliasContentItem) => {
    setActionError('');
    if (item.kind === 'file' && item.refId) {
      // PDFs open in the reader; other formats keep the share sheet.
      if (isPdfItem(item)) {
        router.push({
          pathname: '/ilias/datei',
          params: {
            refId: String(item.refId),
            title: item.title,
            type: item.type,
            size: item.size,
            date: item.date,
          },
        });
        return;
      }
      setBusyId(item.id);
      try {
        const result = await saveIliasFile(item.refId, item.title, item.type);
        if (result === 'unavailable') setActionError(tx(locale, 'tabsIlias.download_nicht_verfuegbar'));
        else showToast({ tone: 'success', title: tx(locale, 'tabsIlias.heruntergeladen'), message: item.title });
      } catch (caught) {
        setActionError(iliasContentErrorMessage(caught, locale));
      } finally {
        setBusyId(null);
      }
      return;
    }
    if (item.refId && BROWSABLE.has(item.kind)) {
      router.push({
        pathname: '/ilias/[refId]',
        params: { refId: String(item.refId), kind: item.kind, title: item.title },
      });
      return;
    }
    if (item.url) WebBrowser.openBrowserAsync(item.url).catch(() => undefined);
  };

  const meta = (item: IliasContentItem) =>
    [item.size, item.pages ? `${item.pages} ${tx(locale, 'tabsIlias.seiten')}` : '', item.date]
      .filter(Boolean)
      .join(' · ');

  const error = query.isError ? iliasContentErrorMessage(query.error, locale) : actionError;
  const empty = !validRef || (content && content.items.length === 0);

  return (
    <Screen
      kicker="ILIAS"
      subtitle={content?.description || undefined}
      refreshControl={
        validRef ? (
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => {
              setActionError('');
              void refreshIliasPage(queryClient, refId, kind).catch(() => undefined);
            }}
            tintColor={colors.blue}
            colors={[colors.blue]}
            progressBackgroundColor={colors.paper}
          />
        ) : undefined
      }>
      <Stack.Screen options={{ title }} />

      {!validRef ? (
        <Card>
          <Muted>{tx(locale, 'tabsIlias.inhalte_leer')}</Muted>
        </Card>
      ) : query.isLoading ? (
        <Text style={styles.hint}>{tx(locale, 'tabsIlias.inhalte_laden')}</Text>
      ) : query.isError ? (
        <Card>
          <Muted>{error}</Muted>
          <Button label={tx(locale, 'tabsIlias.erneut')} onPress={() => void query.refetch()} secondary />
          <Button
            label={tx(locale, 'tabsIlias.im_browser')}
            onPress={() => WebBrowser.openBrowserAsync(`${ILIAS_BASE}/go/${kind}/${refId}`).catch(() => undefined)}
            secondary
          />
        </Card>
      ) : content ? (
        <>
          {empty ? (
            <Card>
              <Muted>{tx(locale, 'tabsIlias.inhalte_leer')}</Muted>
            </Card>
          ) : (
            <>
              <Section title={tx(locale, 'tabsIlias.inhalte')} />
              <View style={styles.list}>
                {content.items.map((item) => (
                  <ContentRow
                    key={item.id}
                    item={item}
                    meta={meta(item)}
                    busy={busyId === item.id}
                    onPress={() => void open(item)}
                  />
                ))}
              </View>
            </>
          )}
          <Button
            secondary
            label={tx(locale, 'tabsIlias.im_browser')}
            onPress={() => WebBrowser.openBrowserAsync(`${ILIAS_BASE}/go/${kind}/${refId}`).catch(() => undefined)}
          />
          {members.length > 0 ? (
            <>
              <Section title={`${tx(locale, 'tabsIlias.mitglieder')} · ${members.length}`} />
              <Card>
                <View>
                  {members.map((member, index) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      locale={locale}
                      last={index === members.length - 1}
                      showRoles={showMemberRoles}
                      onPress={() => openMember(member)}
                    />
                  ))}
                </View>
              </Card>
            </>
          ) : membersUrl && membersQuery.isLoading ? (
            <Text style={styles.hint}>{tx(locale, 'tabsIlias.mitglieder_laden')}</Text>
          ) : membersUrl && membersQuery.isError ? (
            <Text style={styles.hint}>{tx(locale, 'tabsIlias.mitglieder_fehler')}</Text>
          ) : null}
        </>
      ) : null}

      {error && !query.isError ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  list: { gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowTitle: { flex: 1, color: colors.anthracite, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  rowText: { color: colors.inkSoft, fontSize: 13, lineHeight: 18 },
  rowMeta: { color: colors.mute, fontSize: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  memberPressed: { opacity: 0.65 },
  memberText: { flex: 1, gap: 2 },
  memberName: { color: colors.anthracite, fontSize: 15, fontWeight: '600' },
  memberMeta: { color: colors.mute, fontSize: 12 },
  hint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
}));
