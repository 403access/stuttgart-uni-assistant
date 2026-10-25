import { Stack } from 'expo-router';

import { CampusInfoView } from '@/src/components/campus-info-view';
import { Screen } from '@ua/ui';

export default function CampusInfoScreen() {
  return (
    <Screen kicker="C@MPUS">
      <Stack.Screen options={{ title: 'C@MPUS' }} />
      <CampusInfoView />
    </Screen>
  );
}
