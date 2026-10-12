import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Transcript } from '@/components/voice/Transcript';
import { Badge, Spinner, VoiceHeader } from '@/components/voice/VoiceParts';
import type { Phrase } from '@/data/fakeVoice';
import { t } from '@/i18n';
import { formatQuantity } from '@/lib/format';
import type { ReviewOp } from '@/lib/voiceReview';
import { colors, motion, opacity, radius, size, spacing } from '@/theme';

type Props = {
  phrases: Phrase[];
  ops: ReviewOp[];
  onFinished: () => void;
  onClose: () => void;
};

// Only update/add cards fill in while processing; the rest stay as placeholders
const SKELETON_WIDTHS = ['45%', '30%'] as const;

export function ProcessingView({ phrases, ops, onFinished, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const ready = ops.filter((op) => op.kind === 'update' || op.kind === 'add');
  const [shown, setShown] = useState(0);

  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    const step = motion.processing / (ready.length + 2);
    const timer = setInterval(() => setShown((n) => n + 1), step);
    const done = setTimeout(() => onFinishedRef.current(), motion.processing);
    return () => {
      clearInterval(timer);
      clearTimeout(done);
    };
  }, [ready.length]);

  const placeholders = Math.max(0, ops.length - Math.min(shown, ready.length));

  return (
    <View style={styles.screen}>
      <VoiceHeader onClose={onClose} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Spinner />
          <AppText variant="heading" weight="bold" color="onDark">
            {t('voice.processing.title')}
          </AppText>
          <AppText variant="label" color="onDarkMuted">
            {t('voice.processing.subtitle')}
          </AppText>
        </View>

        <View style={styles.transcriptCard}>
          <Transcript
            phrases={phrases.map((p) => ({ ...p, kind: 'plain' as const }))}
            variant="label"
            color="onDarkMuted"
          />
        </View>

        {ready.slice(0, shown).map((op) => {
          const name = op.kind === 'update' ? op.item.name : op.kind === 'add' ? op.draft.name : '';
          const qty =
            op.kind === 'update' ? formatQuantity(op.qty, op.item.unit) : op.kind === 'add' ? formatQuantity(op.draft.qty, op.draft.unit) : '';
          return (
            <Animated.View key={op.key} entering={FadeInDown.duration(motion.normal)} style={styles.card}>
              <Badge label={t(op.kind === 'update' ? 'voice.review.badgeUpdate' : 'voice.review.badgeNew')} tone={op.kind === 'update' ? 'info' : 'new'} />
              <AppText variant="item" weight="semibold" style={styles.flex} numberOfLines={1}>
                {name}
              </AppText>
              <AppText variant="label" weight="bold">
                {qty}
              </AppText>
            </Animated.View>
          );
        })}

        {Array.from({ length: placeholders }).map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.skeletonCard}>
            <View style={[styles.skeletonBar, { width: SKELETON_WIDTHS[index % SKELETON_WIDTHS.length] }]} />
            <View style={[styles.skeletonBar, styles.skeletonShort]} />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.autoPill}>
          <AppText variant="label" weight="semibold" color="onDark">
            {t('voice.processing.auto')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkGround,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  status: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  transcriptCard: {
    padding: spacing.xl,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.darkSurface,
  },
  card: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.surface,
  },
  skeletonCard: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.darkSurface,
    opacity: opacity.skeleton,
  },
  skeletonBar: {
    height: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.darkLine,
  },
  skeletonShort: {
    width: size.touch * 2,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  autoPill: {
    height: size.button + spacing.md,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.darkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
