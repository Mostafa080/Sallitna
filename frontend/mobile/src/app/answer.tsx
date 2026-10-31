// "سؤال من …" — what the family member sees when the shopper asks about a missing item.
// Simulated on this phone: opened from the test menu (long-press the household name).

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Mic } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/glass/Glass';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { SheetButton } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { formatQuantity, formatRelativeTime } from '@/lib/format';
import { useList } from '@/store/ListStore';
import type { QuestionAnswer } from '@/store/tripTypes';
import { colors, radius, size, spacing } from '@/theme';

const BackIcon = isRTLLayout ? ChevronRight : ChevronLeft;

export default function AnswerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const { id } = useLocalSearchParams<{ id: string }>();

  const question = list.questions.find((q) => q.id === id);
  const item = question && list.items.find((i) => i.id === question.itemId);

  useEffect(() => {
    if ((!question || !item) && router.canGoBack()) router.back();
  }, [question, item, router]);

  if (!question || !item) return null;

  const shopper = list.memberById(question.from)!;
  const replier = list.memberById(question.to)!;
  // Where the shopper is: their live trip (or my own trip in the demo)
  const storeKey = list.tripStore(question.tripId);
  const store = storeKey ? t(`stores.${storeKey}`) : '';
  const questionText = question.altName
    ? t('notFound.questionAlt', { name: item.name, alt: question.altName })
    : t('notFound.question', { name: item.name });

  const yesLabel = question.altName
    ? t(`answer.yesAlt_${shopper.gender}`, { alt: question.altName })
    : t(`answer.yesAny_${shopper.gender}`);

  const replies: { answer: QuestionAnswer; label: string; tone: 'ink' | 'outline' }[] = [
    { answer: 'alt', label: yesLabel, tone: 'ink' },
    { answer: 'no', label: t('answer.no'), tone: 'outline' },
    { answer: 'next', label: t(`answer.next_${shopper.gender}`), tone: 'outline' },
  ];

  const reply = (answer: QuestionAnswer, label: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.answerQuestion(question.id, answer, label);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <GradientBackground />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('detail.back')}>
            <BackIcon size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
          </Pressable>
          <View style={styles.flex}>
            <AppText variant="heading" weight="bold" accessibilityRole="header">
              {t('answer.title', { name: shopper.display_name })}
            </AppText>
            {storeKey && (
              <View style={styles.whereRow}>
                <View style={styles.liveDot} />
                <AppText variant="body" color="muted">
                  {t('answer.where', { store })}
                </AppText>
              </View>
            )}
          </View>
        </View>

        <GlassCard style={styles.itemCard}>
          <View style={styles.flex}>
            <AppText variant="item" weight="bold">
              {item.name}
            </AppText>
            <AppText variant="body" color="muted">
              {t(`answer.itemMeta_${replier.gender}`, {
                when: formatRelativeTime(item.created_at),
                qty: formatQuantity(item.qty, item.unit),
              })}
            </AppText>
          </View>
          <View style={styles.badge}>
            <AppText variant="body" weight="semibold" color="muted">
              {t('answer.badge')}
            </AppText>
          </View>
        </GlassCard>

        <View style={styles.bubbleRow}>
          <Avatar member={shopper} ring="ground" />
          <GlassCard style={styles.bubble}>
            <AppText variant="item">{questionText.replace(/[«»]/g, '')}</AppText>
            <AppText variant="meta" color="muted">
              {formatRelativeTime(question.createdAt)}
            </AppText>
          </GlassCard>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        {question.answer ? (
          <AppText variant="label" color="muted" style={styles.center}>
            {t('toast.answerSent', { name: shopper.display_name })}
          </AppText>
        ) : (
          <>
            <AppText variant="body" weight="semibold" color="muted">
              {t(`answer.quick_${replier.gender}`)}
            </AppText>
            {replies.map((r) => (
              <SheetButton key={r.answer} label={r.label} tone={r.tone} onPress={() => reply(r.answer, r.label)} />
            ))}
            <Pressable
              onPress={() => list.notify(t('toast.comingSoon'))}
              style={styles.voiceButton}
              accessibilityRole="button">
              <Mic size={size.icon} color={colors.onAccent} strokeWidth={size.iconStroke} />
              <AppText variant="item" weight="bold" color="onAccent">
                {t(`answer.voice_${replier.gender}`)}
              </AppText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: size.touch + spacing.sm,
    height: size.touch + spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: size.liveDot - spacing.xxs,
    height: size.liveDot - spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.card,
  },
  badge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  bubble: {
    flexShrink: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderBottomStartRadius: spacing.xs,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  voiceButton: {
    minHeight: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
