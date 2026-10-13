import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildLocalAnswer, renderFacts } from '@/src/assistant/answer';
import { buildAnswerInput, bundledDocument } from '@/src/assistant/context';
import { askGrok } from '@/src/assistant/remote';
import { useApp } from '@/src/state/AppState';
import { colors } from '@/src/theme';
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
  const [busy, setBusy] = useState(false);
  const bundled = docId ? bundledDocument(docId, locale) : null;
  const imported = imports.find((item) => item.id === docId);
  const focus = bundled
    ? { title: bundled.title, text: bundled.text, alternate: bundled.alternate }
    : imported
      ? { title: imported.title, text: imported.text || imported.title }
      : undefined;
  const suggestions = [
    tx(locale, 'Was habe ich heute?', 'What do I have today?'),
    tx(locale, 'Welche Frist ist als Nächstes dran?', 'Which deadline is next?'),
    tx(locale, 'Wie viele ECTS fehlen mir?', 'How many ECTS do I still need?'),
    tx(locale, 'Welche Module kann ich als Nächstes belegen?', 'Which modules can I take next?'),
    tx(locale, 'Wo ist die Mensa in Vaihingen?', 'Where is the cafeteria in Vaihingen?'),
  ];

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setDraft('');
    setBusy(true);
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
    const remote = await askGrok({
      locale,
      question,
      facts: renderFacts(input),
      history: [...messages, userMessage].map((item) => ({ role: item.role, text: item.text })),
    });
    if (remote) replaceMessage({ ...reply, text: remote, engine: 'grok' });
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.mist, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 6 }}>
        <Text style={{ color: colors.blue, fontSize: 12, fontWeight: '700', letterSpacing: 1.1 }}>CHAT</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.anthracite, fontSize: 30, fontWeight: '700' }}>{tx(locale, 'Assistent', 'Assistant')}</Text>
          <Pressable onPress={clearChat} hitSlop={8}>
            <Text style={{ color: colors.blue, fontWeight: '700' }}>{tx(locale, 'Leeren', 'Clear')}</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.inkSoft, lineHeight: 20 }}>
          {tx(
            locale,
            'Antworten kommen aus dem Demonstrationsstand. Grok formuliert sie neu, wenn der Assistenz-Server läuft.',
            'Answers come from the demonstration record. Grok rewrites them when the assistant server is running.',
          )}
        </Text>
        {focus ? (
          <Text style={{ color: colors.blue, fontWeight: '700' }}>
            {tx(locale, 'Bezug', 'Context')}: {focus.title}
          </Text>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View style={{ gap: 8 }}>
            {suggestions.map((item) => (
              <Pressable key={item} onPress={() => send(item)} style={chip}>
                <Text style={{ color: colors.blue, fontWeight: '700' }}>{item}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={[bubble, message.role === 'user' ? userBubble : assistantBubble]}>
              <Text style={{ color: message.role === 'user' ? '#FFFFFF' : colors.anthracite, fontSize: 15, lineHeight: 21 }}>{message.text}</Text>
              {message.role === 'assistant' ? (
                <Text style={{ color: colors.inkSoft, fontSize: 12, marginTop: 8 }}>
                  {message.engine === 'grok' ? 'Grok' : tx(locale, 'Campus-Wissen', 'Campus record')}
                  {message.sources.length ? ` · ${message.sources.slice(0, 3).join(' · ')}` : ''}
                </Text>
              ) : null}
            </View>
          ))
        )}
        {busy ? <Text style={{ color: colors.inkSoft }}>{tx(locale, 'Grok wird gefragt …', 'Asking Grok …')}</Text> : null}
      </ScrollView>
      <View style={{ padding: 12, paddingBottom: 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={tx(locale, 'Frage zum Studium', 'Ask about your studies')}
            placeholderTextColor={colors.mute}
            style={[input, { flex: 1 }]}
            multiline
          />
          <Pressable onPress={() => send(draft)} style={sendButton}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{tx(locale, 'Senden', 'Send')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const chip = { backgroundColor: colors.paper, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12 };
const bubble = { borderRadius: 16, padding: 12, maxWidth: '100%' as const };
const userBubble = { backgroundColor: colors.blue, alignSelf: 'flex-end' as const };
const assistantBubble = { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' as const };
const input = {
  backgroundColor: colors.paper,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
  color: colors.anthracite,
  maxHeight: 120,
};
const sendButton = { backgroundColor: colors.blue, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 };
