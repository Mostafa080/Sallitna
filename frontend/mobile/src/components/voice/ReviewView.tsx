import * as Haptics from 'expo-haptics';
import { Mic, Pencil, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Badge, Stepper } from '@/components/voice/VoiceParts';
import type { Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { formatQuantity } from '@/lib/format';
import type { ReviewOp } from '@/lib/voiceReview';
import { colors, motion, opacity, radius, size, spacing } from '@/theme';

type Props = {
  transcript: string;
  durationSeconds: number;
  speaker: Member | undefined;
  ops: ReviewOp[];
  onChange: (ops: ReviewOp[]) => void;
  onAdd: () => void;
  onRecordAgain: () => void;
  onClose: () => void;
};

const MIN_QTY = 1;
const layout = LinearTransition.duration(motion.normal);

export function ReviewView({ transcript, durationSeconds, speaker, ops, onChange, onAdd, onRecordAgain, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<string | null>(null);

  const update = (key: string, fn: (op: ReviewOp) => ReviewOp) => {
    Haptics.selectionAsync();
    onChange(ops.map((op) => (op.key === key ? fn(op) : op)));
  };

  const changeQty = (key: string, delta: number) =>
    update(key, (op) => {
      if (op.kind === 'update') return { ...op, qty: Math.max(MIN_QTY, op.qty + delta) };
      if (op.kind === 'add') return { ...op, draft: { ...op.draft, qty: Math.max(MIN_QTY, op.draft.qty + delta) } };
      return op;
    });

  const duration = `0:${String(durationSeconds).padStart(2, '0')}`;
  const hasChanges = ops.some((op) => op.kind !== 'remove' || !op.keep);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <AppText variant="title" weight="bold" accessibilityRole="header">
              {t('voice.review.title', { n: ops.length })}
            </AppText>
            <AppText variant="label" color="muted">
              {t('voice.review.subtitle')}
            </AppText>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={t('voice.close')}>
            <X size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
          </Pressable>
        </View>

        <View style={styles.transcriptCard}>
          <Mic size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
          <AppText variant="label" color="muted" style={styles.flex}>
            {t('detail.quote', { text: transcript }) +
              t('item.metaSeparator') +
              t('voice.review.transcriptMeta', { name: speaker?.display_name ?? '', duration })}
          </AppText>
        </View>

        {ops.map((op) => (
          <Animated.View key={op.key} layout={layout}>
            {op.kind === 'update' && (
              <View style={[styles.card, editing === op.key && styles.cardStacked]}>
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Badge label={t('voice.review.badgeUpdate')} tone="info" />
                    <AppText variant="item" weight="bold" numberOfLines={1} style={styles.shrink}>
                      {op.item.name}
                    </AppText>
                  </View>
                  <AppText variant="body" color="muted">
                    {op.qty === op.item.qty
                      ? t('voice.review.updateSame', { qty: formatQuantity(op.qty, op.item.unit) })
                      : t('voice.review.updateFrom', { qty: op.qty, old: op.item.qty })}
                  </AppText>
                </View>
                {editing === op.key ? (
                  <Stepper
                    label={formatQuantity(op.qty, op.item.unit)}
                    canDecrease={op.qty > MIN_QTY}
                    onIncrease={() => changeQty(op.key, 1)}
                    onDecrease={() => changeQty(op.key, -1)}
                  />
                ) : (
                  <>
                    <View style={styles.qtyPill}>
                      <AppText variant="label" weight="bold">
                        {formatQuantity(op.qty, op.item.unit)}
                      </AppText>
                    </View>
                    <Pressable
                      onPress={() => setEditing(op.key)}
                      style={styles.iconButton}
                      accessibilityRole="button"
                      accessibilityLabel={t('voice.review.editA11y', { name: op.item.name })}>
                      <Pencil size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {op.kind === 'add' && (
              <View style={styles.card}>
                <View style={styles.info}>
                  <View style={styles.titleRow}>
                    <Badge label={t('voice.review.badgeNew')} tone="new" />
                    <AppText variant="item" weight="bold" numberOfLines={1} style={styles.shrink}>
                      {op.draft.name}
                    </AppText>
                  </View>
                  <AppText variant="body" color="muted">
                    {t(`categories.${op.draft.category}`)}
                  </AppText>
                </View>
                <Stepper
                  label={formatQuantity(op.draft.qty, op.draft.unit)}
                  canDecrease={op.draft.qty > MIN_QTY}
                  onIncrease={() => changeQty(op.key, 1)}
                  onDecrease={() => changeQty(op.key, -1)}
                />
              </View>
            )}

            {op.kind === 'confirm' && (
              <View style={[styles.card, styles.confirmCard]}>
                <View style={styles.titleRow}>
                  <Badge label={t('voice.review.badgeConfirm')} tone="ink" />
                  <AppText variant="item" weight="bold">
                    {t('voice.review.confirmTitle', { word: op.word })}
                  </AppText>
                </View>
                <AppText variant="body" color="muted">
                  {t('voice.review.confirmBody', { word: op.word })}
                </AppText>
                <View style={styles.options} accessibilityRole="radiogroup">
                  {op.options.map((option, index) => {
                    const selected = index === op.choice;
                    return (
                      <Pressable
                        key={option.name}
                        onPress={() => update(op.key, (o) => (o.kind === 'confirm' ? { ...o, choice: index } : o))}
                        style={[styles.option, selected ? styles.optionSelected : styles.optionIdle]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}>
                        <AppText
                          variant="label"
                          weight="bold"
                          color={selected ? 'onDark' : 'ink'}
                          numberOfLines={2}
                          style={styles.optionText}>
                          {selected
                            ? option.name + t('item.metaSeparator') + formatQuantity(option.qty, option.unit)
                            : option.name}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {op.kind === 'remove' && (
              <View style={styles.card}>
                <View style={styles.flex}>
                  <View style={styles.titleRow}>
                    <Badge label={t('voice.review.badgeRemove')} tone="danger" />
                    <AppText
                      variant="item"
                      weight="bold"
                      color={op.keep ? 'ink' : 'muted'}
                      style={!op.keep && styles.struck}
                      numberOfLines={1}>
                      {op.item.name}
                    </AppText>
                  </View>
                  <AppText variant="body" color="muted">
                    {t(op.keep ? 'voice.review.keepBody' : 'voice.review.removeBody')}
                  </AppText>
                </View>
                <Pressable
                  onPress={() => update(op.key, (o) => (o.kind === 'remove' ? { ...o, keep: !o.keep } : o))}
                  style={styles.outlineButton}
                  accessibilityRole="button">
                  <AppText variant="label" weight="semibold">
                    {t(op.keep ? 'voice.review.removeAgain' : 'voice.review.undo')}
                  </AppText>
                </Pressable>
              </View>
            )}
          </Animated.View>
        ))}
      </ScrollView>

      {/* Covers the status bar area so cards don't scroll under the clock */}
      <View style={[styles.statusBarCover, { height: insets.top }]} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          onPress={onAdd}
          disabled={!hasChanges}
          style={[styles.addButton, !hasChanges && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasChanges }}>
          <AppText variant="item" weight="bold" color="onDark">
            {t('voice.review.add')}
          </AppText>
        </Pressable>
        <Pressable onPress={onRecordAgain} style={styles.linkButton} accessibilityRole="button">
          <Mic size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
          <AppText variant="label" weight="semibold">
            {t('voice.review.recordAgain')}
          </AppText>
        </Pressable>
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
  shrink: {
    flexShrink: 1,
  },
  info: {
    flexGrow: 1,
    flexBasis: size.voiceRing, // narrower than this → the quantity controls move to their own line
    alignSelf: 'stretch',
  },
  optionText: {
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  closeButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.line,
  },
  card: {
    minHeight: size.toast + spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  cardStacked: {
    // Editing: name on top, stepper underneath on the end side
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
  },
  confirmCard: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    borderWidth: size.borderThick,
    borderColor: colors.accent,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyPill: {
    minHeight: size.control,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: size.touch,
    height: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  option: {
    flex: 1,
    minHeight: size.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.card,
    borderWidth: size.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  outlineButton: {
    minHeight: size.control,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.ground,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  addButton: {
    height: size.button + spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
  linkButton: {
    minHeight: size.touch + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
