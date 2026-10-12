// Add by voice — simulated for now: plays a pretend recording through the real flow.
// ?mode=noisy  → a recording we can't understand (long-press the mic on Home)
// ?mode=denied → microphone blocked in phone settings (dev menu)

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { ListeningView } from '@/components/voice/ListeningView';
import { MicDeniedView, MicPermissionView } from '@/components/voice/MicAccessViews';
import { NotUnderstoodView } from '@/components/voice/NotUnderstoodView';
import { ProcessingView } from '@/components/voice/ProcessingView';
import { ReviewView } from '@/components/voice/ReviewView';
import { findCatalogMatch } from '@/data/fakeCatalog';
import { members } from '@/data/fakeHousehold';
import {
  demoDurationSeconds,
  demoIntents,
  demoTranscript,
  noisyIntent,
  noisyTranscript,
  type Phrase,
} from '@/data/fakeVoice';
import { micAccess } from '@/lib/micAccess';
import { buildReview, toChanges, type ReviewOp } from '@/lib/voiceReview';
import { useList } from '@/store/ListStore';

type Phase = 'permission' | 'denied' | 'listening' | 'processing' | 'review' | 'notUnderstood';

const LIGHT_PHASES: Phase[] = ['permission', 'denied', 'review'];
const textOf = (phrases: Phrase[]) => phrases.map((p) => p.text).join('');

export default function VoiceScreen() {
  const router = useRouter();
  const list = useList();
  const { mode } = useLocalSearchParams<{ mode?: 'noisy' | 'denied' }>();

  const [phase, setPhase] = useState<Phase>(
    mode === 'denied' ? 'denied' : micAccess.isGranted() ? 'listening' : 'permission',
  );
  const [noisy, setNoisy] = useState(mode === 'noisy');
  const [attempt, setAttempt] = useState(0); // restarts the listening animation
  const [ops, setOps] = useState<ReviewOp[]>([]);

  const phrases = noisy ? noisyTranscript : demoTranscript;
  const transcript = textOf(demoTranscript);
  const speaker = members.find((m) => m.id === list.currentMemberId);

  const close = () => router.back();

  const startListening = (asNoisy = noisy) => {
    setNoisy(asNoisy);
    setAttempt((n) => n + 1);
    setPhase('listening');
  };

  const onListeningDone = useCallback(() => {
    if (noisy) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPhase('notUnderstood');
      return;
    }
    setOps(buildReview(demoIntents, list.findOpenByName));
    setPhase('processing');
  }, [noisy, list.findOpenByName]);

  const onProcessed = useCallback(() => setPhase('review'), []);

  const apply = (reviewed: ReviewOp[], said: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.applyVoice(toChanges(reviewed, list.findOpenByName, list.currentMemberId), said);
    router.back();
  };

  const typeInstead = () => router.replace('/add');

  const caughtName = findCatalogMatch(noisyIntent.type === 'want' ? noisyIntent.text : '')?.name ?? null;

  return (
    <>
      <StatusBar style={LIGHT_PHASES.includes(phase) ? 'dark' : 'light'} />

      {phase === 'permission' && (
        <MicPermissionView
          onAllow={() => {
            micAccess.grant();
            startListening();
          }}
          onLater={close}
        />
      )}

      {phase === 'denied' && (
        <MicDeniedView onOpenSettings={() => Linking.openSettings()} onType={typeInstead} onClose={close} />
      )}

      {phase === 'listening' && (
        <ListeningView key={attempt} phrases={phrases} onDone={onListeningDone} onClose={close} />
      )}

      {phase === 'processing' && (
        <ProcessingView phrases={demoTranscript} ops={ops} onFinished={onProcessed} onClose={close} />
      )}

      {phase === 'review' && (
        <ReviewView
          transcript={transcript}
          durationSeconds={demoDurationSeconds}
          speaker={speaker}
          ops={ops}
          onChange={setOps}
          onAdd={() => apply(ops, transcript)}
          onRecordAgain={() => startListening(false)}
          onClose={close}
        />
      )}

      {phase === 'notUnderstood' && (
        <NotUnderstoodView
          phrases={noisyTranscript}
          caughtName={caughtName}
          onAddCaught={() => apply(buildReview([noisyIntent], list.findOpenByName), textOf(noisyTranscript))}
          onRetry={() => startListening(false)}
          onType={typeInstead}
          onClose={close}
        />
      )}
    </>
  );
}
