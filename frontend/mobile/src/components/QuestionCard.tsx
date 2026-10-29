// «سارة تسألك» — a question from whoever is shopping, shown at the top of the list with quick replies.
// Tap the card for the full answer screen (src/app/answer.tsx).

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import type { Item, Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import type { Question, QuestionAnswer } from '@/store/tripTypes';
import { colors, radius, size, spacing } from '@/theme';

type Props = {
  question: Question;
  item: Item;
  asker: Member;
  onReply: (answer: QuestionAnswer, label: string) => void;
  onOpen: () => void;
};

export function QuestionCard({ question, item, asker, onReply, onOpen }: Props) {
  const g = asker.gender;
  const text = question.altName
    ? t('notFound.questionAlt', { name: item.name, alt: question.altName })
    : t('notFound.question', { name: item.name });
  const replies: { answer: QuestionAnswer; label: string }[] = [
    {
      answer: 'alt',
      label: question.altName ? t(`answer.yesAlt_${g}`, { alt: question.altName }) : t(`answer.yesAny_${g}`),
    },
    { answer: 'no', label: t('answer.no') },
    { answer: 'next', label: t(`answer.next_${g}`) },
  ];

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpen} style={styles.top} accessibilityRole="button" accessibilityLabel={t('questionCard.openA11y')}>
        <Avatar member={asker} ring="accentTint" />
        <View style={styles.flex}>
          <AppText variant="body" weight="semibold" color="accentInk">
            {t(`questionCard.title_${g}`, { name: asker.display_name })}
          </AppText>
          <AppText variant="label" weight="bold">
            {text.replace(/[«»]/g, '')}
          </AppText>
        </View>
      </Pressable>
      <View style={styles.replies}>
        {replies.map((r, index) => (
          <Pressable
            key={r.answer}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onReply(r.answer, r.label);
            }}
            style={[styles.reply, index === 0 && styles.replyMain]}
            accessibilityRole="button">
            <AppText variant="body" weight="bold" color={index === 0 ? 'onDark' : 'ink'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {r.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentTint,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  replies: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reply: {
    flex: 1,
    minHeight: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  replyMain: {
    flex: 1.4,
    backgroundColor: colors.accent,
  },
});
