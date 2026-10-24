import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, RefreshControl, Text, View } from 'react-native';

import { Button, Card, Muted, Pill, Screen, Section } from '@/src/components/ui';
import { iliasContentErrorMessage } from '@/src/ilias/errors';
import { MemberAvatar } from '@/src/ilias/components/member-avatar';
import { iliasProfileQuery, refreshIliasProfile } from '@/src/ilias/queries';
import type { IliasProfileCourse } from '@/src/ilias/types';
import { useAppSelector } from '@/src/state/AppState';
import { colors, themedStyles } from '@/src/theme';
import { firstParam, tx } from '@/src/text';

/**
 * A public ILIAS profile opened by tapping a member. The page is harvested in
 * the hidden WebView and parsed server-side: name, avatar, published sections,
 * contact actions, and any course/group links the profile exposes.
 */
export default function IliasMemberScreen() {
  const locale = useAppSelector((state) => state.locale);
  const params = useLocalSearchParams<{
    userId?: string | string[];
    url?: string | string[];
    name?: string | string[];
    username?: string | string[];
    avatar?: string | string[];
    hidden?: string | string[];
    role?: string | string[];
    roleKind?: string | string[];
    course?: string | string[];
    refId?: string | string[];
    kind?: string | string[];
  }>();
  const userId = Number(firstParam(params.userId)) || null;
  const profileUrl = firstParam(params.url) || '';
  const fallbackName = firstParam(params.name) || tx(locale, 'tabsIlias.profil');
  const username = firstParam(params.username) || '';
  const fallbackAvatar = firstParam(params.avatar) || '';
  const hidden = firstParam(params.hidden) === '1';
  const role = firstParam(params.role) || '';
  const roleKind = firstParam(params.roleKind) === 'tutor' ? 'tutor' : 'participant';
  const course = firstParam(params.course) || '';
  const queryClient = useQueryClient();
  const query = useQuery(iliasProfileQuery(userId, profileUrl));
  const profile = query.data;
  const name = profile?.name || fallbackName;
  const avatarUrl = profile?.avatarUrl || fallbackAvatar;
  const context = course || profile?.context || '';
  const error = query.isError ? iliasContentErrorMessage(query.error, locale) : '';
  const openUrl = profile?.profileUrl || profileUrl;

  const openCourse = (entry: IliasProfileCourse) => {
    router.push({
      pathname: '/ilias/[refId]',
      params: { refId: String(entry.refId), kind: entry.kind, title: entry.title },
    });
  };

  return (
    <Screen
      kicker="ILIAS"
      subtitle={context || undefined}
      refreshControl={
        profileUrl ? (
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => {
              void refreshIliasProfile(queryClient, userId, profileUrl).catch(() => undefined);
            }}
            tintColor={colors.blue}
            colors={[colors.blue]}
            progressBackgroundColor={colors.paper}
          />
        ) : undefined
      }>
      <Stack.Screen options={{ title: name }} />

      <Card>
        <View style={styles.identity}>
          <MemberAvatar imageUrl={avatarUrl} name={name} size={72} />
          <View style={styles.identityText}>
            <Text style={styles.name}>{name}</Text>
            {username && username !== name ? <Text style={styles.meta}>{username}</Text> : null}
            <View style={styles.badges}>
              {roleKind === 'tutor' || role ? (
                <Pill
                  label={role || tx(locale, 'tabsIlias.tutor')}
                  tone={roleKind === 'tutor' ? 'blue' : 'neutral'}
                />
              ) : null}
              {context ? <Text style={styles.meta}>{context}</Text> : null}
            </View>
          </View>
        </View>
        {hidden ? <Muted>{tx(locale, 'tabsIlias.profil_nicht_freigegeben')}</Muted> : null}
      </Card>

      {query.isLoading && profileUrl ? <Text style={styles.hint}>{tx(locale, 'tabsIlias.profil_laden')}</Text> : null}

      {error ? (
        <Card>
          <Muted>{error}</Muted>
          {profileUrl ? (
            <Button label={tx(locale, 'tabsIlias.erneut')} onPress={() => void query.refetch()} secondary />
          ) : null}
        </Card>
      ) : null}

      {profile?.sections.map((section, index) => (
        <Card key={`${section.title}-${index}`}>
          {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
          {section.text ? <Text style={styles.sectionText}>{section.text}</Text> : null}
          {section.links.map((link) => (
            <Button
              key={`${link.label}-${link.url}`}
              secondary
              label={link.label}
              onPress={() => WebBrowser.openBrowserAsync(link.url).catch(() => undefined)}
            />
          ))}
        </Card>
      ))}

      {profile?.email ? (
        <Card onPress={() => Linking.openURL(`mailto:${profile.email}`).catch(() => undefined)}>
          <Text style={styles.sectionTitle}>{tx(locale, 'tabsIlias.profil_mail')}</Text>
          <Text style={styles.sectionText}>{profile.email}</Text>
        </Card>
      ) : null}

      {profile?.mailUrl || profile?.vcardUrl ? (
        <View style={styles.actions}>
          {profile.mailUrl ? (
            <Button
              secondary
              label={tx(locale, 'tabsIlias.profil_ilias_mail')}
              onPress={() => WebBrowser.openBrowserAsync(profile.mailUrl).catch(() => undefined)}
            />
          ) : null}
          {profile.vcardUrl ? (
            <Button
              secondary
              label={tx(locale, 'tabsIlias.profil_vcard')}
              onPress={() => WebBrowser.openBrowserAsync(profile.vcardUrl).catch(() => undefined)}
            />
          ) : null}
        </View>
      ) : null}

      {profile && profile.courses.length > 0 ? (
        <>
          <Section title={tx(locale, 'tabsIlias.profil_kurse')} />
          <View style={styles.list}>
            {profile.courses.map((entry) => (
              <Card key={`${entry.kind}-${entry.refId}`} onPress={() => openCourse(entry)}>
                <View style={styles.courseRow}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {entry.title || `${entry.kind}/${entry.refId}`}
                  </Text>
                  <Pill label={entry.kind} tone="neutral" />
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {openUrl ? (
        <Button
          secondary
          label={tx(locale, 'tabsIlias.im_browser')}
          onPress={() => WebBrowser.openBrowserAsync(openUrl).catch(() => undefined)}
        />
      ) : null}
    </Screen>
  );
}

const styles = themedStyles((colors) => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identityText: { flex: 1, gap: 4 },
  name: { color: colors.anthracite, fontSize: 22, fontWeight: '700', lineHeight: 27 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  meta: { color: colors.mute, fontSize: 13 },
  sectionTitle: { color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionText: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
  actions: { gap: 8 },
  list: { gap: 8 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, color: colors.anthracite, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.inkSoft, fontSize: 14, lineHeight: 20 },
}));
