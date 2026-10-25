import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@ua/ui';
import { colors } from '@ua/ui/theme';

/** Single-choice row used by the appearance and language screens. */
export function ChoiceCard({
  icon,
  label,
  active,
  onPress,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MaterialIcons name={icon} size={24} color={active ? colors.blue : colors.mute} />
        <Text style={{ flex: 1, color: colors.anthracite, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        <MaterialIcons
          name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
          size={22}
          color={active ? colors.blue : colors.mute}
        />
      </View>
    </Card>
  );
}
