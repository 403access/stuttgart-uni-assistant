import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildLocalAnswer, renderFacts } from '@/src/assistant/answer';
import { buildAnswerInput, bundledDocument } from '@/src/assistant/context';
import { askGrok } from '@/src/assistant/remote';
import { useApp } from '@/src/state/AppState';
import { colors, themedStyle } from '@/src/theme';
import { tx, uid } from '@/src/text';

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default function ChatScreen() {
  const { locale, messages, imports, addMessage, replaceMessage, clearChat } = useApp();
  const params = useLocalSearchParams<{ doc?: string }>();
  const docId = one(params.doc);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const bundled = docId ? bundledDocument(docId, locale) : null;
  const imported = imports.find((item) => item.id === docId);
  const focus = bundled
    ? { title: bundled.title, text: bundled.text, alternate: bundled.alternate }
    : imported
      ? { title: imported.title, text: imported.text || imported.title }
      : undefined;
  const suggestions = [
    tx(locale, 'tabsChat.habe'),
    tx(locale, 'tabsChat.welche'),
    tx(locale, 'tabsChat.wie'),
    tx(locale, 'tabsChat.welche_module'),
    tx(locale, 'tabsChat.wo'),
  ];

  // The local answer posts immediately; the mutation only asks Grok to
  // rewrite it. Grok failing keeps the local answer (remote returns null).
  const askRemote = useMutation({
    mutationKey: ['chat-ask'],
    mutationFn: (vars: { question: string; userMessageId: string; reply: { id: string; sources: string[]; createdAt: string } }) =>
      askGrok({
        locale,
        question: vars.question,
        facts: renderFacts(buildAnswerInput({ locale, question: vars.question, focus, imports })),
        history: [...messages, { id: vars.userMessageId, role: 'user' as const, text: vars.question }].map((item) => ({ role: item.role, text: item.text })),
      }),
    onSuccess: (remote, vars) => {
      if (remote) replaceMessage({ id: vars.reply.id, role: 'assistant' as const, text: remote, sources: vars.reply.sources, engine: 'grok' as const, createdAt: vars.reply.createdAt });
    },
  });
  const busy = askRemote.isPending;

  function send(text: string): void {
    const question = text.trim();
    if (!question || busy) return;
    setDraft('');
    const userMessage = {
      id: uid('user'),
      role: 'user' as const,
      text: question,
      sources: [],
      engine: 'campus' as const,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);
    const input = buildAnswerInput({ locale, question, focus, imports });
    const local = buildLocalAnswer(input);
    const reply = {
      id: uid('assistant'),
      role: 'assistant' as const,
      text: local.text,
      sources: local.sources,
      engine: 'campus' as const,
      createdAt: new Date().toISOString(),
    };
    addMessage(reply);
    askRemote.mutate({ question, userMessageId: userMessage.id, reply: { id: reply.id, sources: reply.sources, createdAt: reply.createdAt } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.mist, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 6 }}>
        <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1 }}>CHAT</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.anthracite, fontSize: 30, fontWeight: '700' }}>{tx(locale, 'tabsChat.assistent')}</Text>
          <Pressable onPress={clearChat} hitSlop={8}>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>{tx(locale, 'tabsChat.leeren')}</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(locale, 'tabsChat.antworten')}
        </Text>
        {focus ? (
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {tx(locale, 'tabsChat.bezug')}: {focus.title}
          </Text>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View style={{ gap: 8 }}>
            {suggestions.map((item) => (
              <Pressable key={item} onPress={() => send(item)} style={{ ...chip }}>
                <Text style={{ color: colors.blue, fontWeight: '700' }}>{item}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={[bubble, message.role === 'user' ? { ...userBubble } : { ...assistantBubble }]}>
              <Text style={{ color: message.role === 'user' ? '#FFFFFF' : colors.anthracite, fontSize: 15, lineHeight: 21 }}>{message.text}</Text>
              {message.role === 'assistant' ? (
                <Text style={{ color: colors.inkSoft, fontSize: 12, marginTop: 8 }}>
                  {message.engine === 'grok' ? 'Grok' : tx(locale, 'tabsChat.campus')}
                  {message.sources.length ? ` · ${message.sources.slice(0, 3).join(' · ')}` : ''}
                </Text>
              ) : null}
            </View>
          ))
        )}
        {busy ? <Text style={{ color: colors.inkSoft }}>{tx(locale, 'tabsChat.grok')}</Text> : null}
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={tx(locale, 'tabsChat.frage')}
            placeholderTextColor={colors.mute}
            style={[{ ...input }, { flex: 1 }]}
            multiline
          />
          <Pressable onPress={() => send(draft)} style={{ ...sendButton }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{tx(locale, 'common.senden')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const chip = themedStyle((colors) => ({ backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12 }));
const bubble = { borderRadius: 16, padding: 12, maxWidth: '100%' as const };
const userBubble = themedStyle((colors) => ({ backgroundColor: colors.brand, alignSelf: 'flex-end' as const }));
const assistantBubble = themedStyle((colors) => ({ backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' as const }));
const input = themedStyle((colors) => ({
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  color: colors.anthracite,
  maxHeight: 120,
}));
const sendButton = themedStyle((colors) => ({ backgroundColor: colors.brand, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 }));
