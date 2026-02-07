import { useAuth } from "@/contexts/AuthContext";
import { usePractice } from "@/hooks/usePractice";
import { PracticeScreen } from "@/components/screens/PracticeScreen";

export default function Practice() {
  const { user } = useAuth();
  const practice = usePractice(user);

  return (
    <PracticeScreen
      phase={practice.phase}
      countInBeatsSeen={practice.countInBeatsSeen}
      running={practice.running}
      bpmInput={practice.bpmInput}
      currentBeat={practice.currentBeat}
      isWeb={practice.isWeb}
      onBpmChange={practice.onBpmChange}
      onStartStop={practice.onStartStop}
      onStopForSummary={practice.onStopForSummary}
      dismissSummary={practice.dismissSummary}
      tapCount={practice.tapCount}
      tapFlash={practice.tapFlash}
      onTap={practice.onTap}
      rudiment={practice.rudiment}
      liveResults={practice.liveResults}
      summaryResults={practice.summaryResults}
      counts={practice.counts}
    />
  );
}
