import * as Haptics from 'expo-haptics';
import { Check, Mic, Square } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Transcript } from '@/components/voice/Transcript';
import { VoiceHeader, Waveform } from '@/components/voice/VoiceParts';
import type { Phrase } from '@/data/fakeVoice';
import { t } from '@/i18n';
import { colors, motion, radius, size, spacing } from '@/theme';

type Props = {
  phrases: Phrase[];
  onDone: () => void; // finished talking (button or silence)
  onClose: () => void;
};

const PULSE_SCALE = 1.08;

export function ListeningView({ phrases, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(0);
  const finished = shown >= phrases.length;
  const caught = phrases.slice(0, shown).filter((p) => p.kind === 'item').length;

  // Simulated speech: reveal one phrase at a time
  useEffect(() => {
    if (finished) return;
    const timer = setTimeout(() => setShown((n) => n + 1), motion.wordReveal);
    return () => clearTimeout(timer);
  }, [shown, finished]);

  // "Stops by itself after two seconds of silence"
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => onDoneRef.current(), motion.autoStop);
    return () => clearTimeout(timer);
  }, [finished]);

  // Ring breathes while listening
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(PULSE_SCALE, { duration: motion.pulse, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: finished ? 1 : pulse.value }] }));

  const onDonePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDone();
  };

  return (
    <View style={styles.screen}>
      <VoiceHeader onClose={onClose} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.micArea}>
          <View style={styles.ringOuter}>
            <Animated.View style={[styles.ring, ringStyle]}>
              <View style={styles.mic}>
                <Mic size={size.icon * 2} color={colors.onDark} strokeWidth={size.iconStroke} />
              </View>
            </Animated.View>
          </View>
        </View>

        <Waveform active={!finished} />
        <AppText variant="label" color="onDarkMuted" style={styles.center}>
          {t('voice.listening.hint')}
        </AppText>

        <View style={styles.transcriptCard} accessibilityLiveRegion="polite">
          <Transcript phrases={phrases} shown={shown} />
          <View style={styles.caughtRow}>
            {caught > 0 && <Check size={size.iconSmall + spacing.xs} color={colors.onDarkMuted} strokeWidth={size.iconStroke} />}
            <AppText variant="body" color="onDarkMuted">
              {t('voice.listening.caught', { n: caught })}
            </AppText>
          </View>
        </View>

        <View style={styles.tips}>
          {[t('voice.listening.try'), t('voice.listening.try2')].map((tip) => (
            <View key={tip} style={styles.tip}>
              <AppText variant="body" color="onDark">
                {tip}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable onPress={onDonePress} style={styles.doneButton} accessibilityRole="button">
          <Square size={size.iconSmall + spacing.xs} color={colors.ink} fill={colors.ink} />
          <AppText variant="label" weight="bold">
            {t('voice.listening.done')}
          </AppText>
        </Pressable>
        <AppText variant="meta" color="onDarkMuted" style={styles.center}>
          {t('voice.listening.autoStop')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkGround,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  micArea: {
    alignItems: 'center',
  },
  ringOuter: {
    width: size.voiceRingOuter,
    height: size.voiceRingOuter,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.darkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: size.voiceRing,
    height: size.voiceRing,
    borderRadius: radius.pill,
    backgroundColor: colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: size.voiceMic,
    height: size.voiceMic,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  transcriptCard: {
    minHeight: size.voiceMic + spacing.xxxl,
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.darkSurface,
  },
  caughtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tips: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  tip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.darkLine,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  doneButton: {
    height: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
});
