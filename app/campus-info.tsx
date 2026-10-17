import { CampusInfoView } from '@/src/components/campus-info-view';
import { Screen } from '@/src/components/ui';

export default function CampusInfoScreen() {
  return (
    <Screen back kicker="C@MPUS" title="C@MPUS">
      <CampusInfoView />
    </Screen>
  );
}
