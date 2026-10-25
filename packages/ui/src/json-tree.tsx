import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from './theme';

const mono = { fontSize: 12, lineHeight: 18, fontFamily: 'Menlo' } as const;
const indent = 14;

/** Break long tokens (URLs, ids) so values wrap instead of overflowing. */
function breakable(value: string): string {
  return value.replace(/([/?&=_\-])/g, '$1​');
}

/** Collapsible, syntax-highlighted JSON tree. Levels 0–1 start expanded. */
export function JsonTree({ value }: { value: unknown }) {
  return (
    <View>
      <JsonNode value={value} depth={0} />
    </View>
  );
}

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
  const [open, setOpen] = useState(depth < 2);

  if (value === null) return <Text style={[mono, { color: colors.mute }]}>null</Text>;
  if (typeof value === 'boolean') return <Text style={[mono, { color: colors.mute }]}>{value ? 'true' : 'false'}</Text>;
  if (typeof value === 'number') return <Text style={[mono, { color: colors.warning }]}>{String(value)}</Text>;
  if (typeof value === 'string') return <Text style={[mono, { color: colors.success }]}>“{breakable(value)}”</Text>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <Text style={mono}>[]</Text>;
    if (!open) {
      return (
        <Pressable onPress={() => setOpen(true)} hitSlop={4}>
          <Text style={[mono, { color: colors.blue }]}>[ … {value.length} ]</Text>
        </Pressable>
      );
    }
    return (
      <View>
        <Pressable onPress={() => setOpen(false)} hitSlop={4}>
          <Text style={[mono, { color: colors.blue }]}>[</Text>
        </Pressable>
        <View style={{ marginLeft: indent }}>
          {value.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={[mono, { color: colors.mute }]}>{index}:</Text>
              <View style={{ flex: 1 }}>
                <JsonNode value={item} depth={depth + 1} />
              </View>
            </View>
          ))}
        </View>
        <Text style={mono}>]</Text>
      </View>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return <Text style={mono}>{'{}'}</Text>;
    if (!open) {
      return (
        <Pressable onPress={() => setOpen(true)} hitSlop={4}>
          <Text style={[mono, { color: colors.blue }]}>{`{ … ${keys.length} }`}</Text>
        </Pressable>
      );
    }
    return (
      <View>
        <Pressable onPress={() => setOpen(false)} hitSlop={4}>
          <Text style={[mono, { color: colors.blue }]}>{'{'}</Text>
        </Pressable>
        <View style={{ marginLeft: indent }}>
          {keys.map((key) => (
            <View key={key} style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={[mono, { color: colors.blue }]}>{breakable(key)}:</Text>
              <View style={{ flex: 1 }}>
                <JsonNode value={(value as Record<string, unknown>)[key]} depth={depth + 1} />
              </View>
            </View>
          ))}
        </View>
        <Text style={mono}>{'}'}</Text>
      </View>
    );
  }

  return <Text style={mono}>{String(value)}</Text>;
}
