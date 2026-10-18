// "تم التسوق" — summary after a trip.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Camera, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { SheetButton } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { toWesternDigits } from '@/lib/arabic';
import { isRTLLayout } from '@/lib/direction';
import { formatTimestamp } from '@/lib/format';
import { useList } from '@/store/ListStore';
import type { TripOutcome } from '@/store/tripTypes';
import { colors, fonts, fontSize, radius, size, spacing } from '@/theme';

type Note = { key: string; tone: 'accent' | 'info'; title: string; body: string };

export default function TripDoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const { summary } = list;
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!summary && router.canGoBack()) router.back();
  }, [summary, router]);

  if (!summary) return null;

  const memberById = (id?: string) => (id ? list.memberById(id) : undefined);
  const shopper = memberById(summary.shopperId);
  const minutes = Math.max(1, Math.round((new Date(summary.endedAt).getTime() - new Date(summary.startedAt).getTime()) / 60_000));

  const noteFor = (o: TripOutcome): Note => {
    const who = memberById(o.answeredBy);
    const answered = who && o.reply ? t(`tripDone.bodyAnswered_${who.gender}`, { who: who.display_name, reply: o.reply }) : null;
    const asked = list.questions.find((q) => q.itemId === o.itemId);
    switch (o.decision) {
      case 'swapped':
        return { key: o.itemId, tone: 'accent', title: t('tripDone.noteSwapped', { name: o.name, alt: o.alt ?? '' }), body: answered ?? '' };
      case 'removed':
        return { key: o.itemId, tone: 'accent', title: t('tripDone.noteRemoved', { name: o.name }), body: answered ?? t('tripDone.bodyRemoved') };
      case 'next':
        return { key: o.itemId, tone: 'accent', title: t('tripDone.noteNext', { name: o.name }), body: answered ?? t('tripDone.bodyNext') };
      case 'asked':
        return {
          key: o.itemId,
          tone: 'accent',
          title: t('tripDone.noteWaiting', { name: o.name }),
          body: t('tripDone.bodyWaiting', { who: memberById(asked?.to)?.display_name ?? '' }),
        };
    }
  };

  const notes: Note[] = summary.notFound.map(noteFor);
  if (summary.added.length > 0) {
    notes.push({
      key: 'added',
      tone: 'info',
      title: t('tripDone.noteAdded', { names: summary.added.map((a) => a.name).join(t('tripDone.and')) }),
      body: t(summary.added.every((a) => a.bought) ? 'tripDone.bodyAddedBought' : 'tripDone.bodyAddedLeft'),
    });
  }

  // Swapped items were still found, just as something else
  const notFoundCount = summary.notFound.filter((o) => o.decision !== 'swapped').length;
  const stats = [
    { label: t('tripDone.bought'), value: summary.boughtCount },
    { label: t('tripDone.notFound'), value: notFoundCount },
    { label: t('tripDone.added'), value: summary.added.length },
  ];

  const cleanAmount = toWesternDigits(amount).replace(/[^\d.]/g, '');

  const onShare = () =>
    Share.share({
      message:
        t('tripDone.shareText', {
          store: t(`stores.${summary.store}`),
          bought: summary.boughtCount,
          notFound: notFoundCount,
          added: summary.added.length,
        }) + (cleanAmount ? t('tripDone.shareAmount', { amount: cleanAmount }) : ''),
    });

  const onFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (cleanAmount) list.saveTripAmount(Number(cleanAmount));
    router.dismissAll();
    router.navigate('/list'); // back to the list in «قوايمي»
    list.clearSummary();
    list.notify(t('toast.tripReported'));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.checkCircle}>
          <Check size={size.icon * 2} color={colors.onDark} strokeWidth={size.iconStroke + 1} />
        </View>
        <AppText variant="title" weight="bold" style={styles.center} accessibilityRole="header">
          {t('tripDone.title')}
        </AppText>
        <AppText variant="label" color="muted" style={styles.center}>
          {t('tripDone.meta', {
            name: shopper?.display_name ?? '',
            duration: t('time.minutes', { n: minutes }),
            time: formatTimestamp(summary.endedAt),
          })}
        </AppText>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <AppText variant="title" weight="bold">
                {String(stat.value)}
              </AppText>
              <AppText variant="body" color="muted" style={styles.center}>
                {stat.label}
              </AppText>
            </View>
          ))}
        </View>

        {notes.length > 0 && (
          <View style={styles.card}>
            {notes.map((note, index) => (
              <View key={note.key} style={[styles.noteRow, index > 0 && styles.divider]}>
                <View style={[styles.dot, { backgroundColor: colors[note.tone] }]} />
                <View style={styles.flex}>
                  <AppText variant="label" weight="bold">
                    {note.title}
                  </AppText>
                  {note.body !== '' && (
                    <AppText variant="body" color="muted">
                      {note.body}
                    </AppText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, styles.paidCard]}>
          <AppText variant="label" weight="bold">
            {t('tripDone.paid')}{' '}
            <AppText variant="label" color="muted">
              {t('tripDone.optional')}
            </AppText>
          </AppText>
          <View style={styles.amountField}>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={t('tripDone.amount')}
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              accessibilityLabel={t('tripDone.paid')}
            />
            <AppText variant="label" color="muted">
              {t('tripDone.currency')}
            </AppText>
            <Pressable
              onPress={() => list.notify(t('toast.comingSoon'))}
              style={styles.cameraButton}
              accessibilityRole="button"
              accessibilityLabel={t('tripDone.receiptA11y')}>
              <Camera size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <SheetButton label={t('tripDone.finish')} onPress={onFinish} />
        <SheetButton label={t('tripDone.share')} tone="link" onPress={onShare} />
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  checkCircle: {
    alignSelf: 'center',
    width: size.doneCheck,
    height: size.doneCheck,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stat: {
    flex: 1,
    minHeight: size.statTile,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  card: {
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  dot: {
    width: size.liveDot,
    height: size.liveDot,
    borderRadius: radius.pill,
  },
  paidCard: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
    minHeight: size.button + spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.ground,
  },
  amountInput: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.item,
    textAlign: isRTLLayout ? 'right' : 'left',
  },
  cameraButton: {
    width: size.button,
    height: size.button,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
});
