import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RadioCard, Sheet, SheetButton } from '@/components/shop/Sheet';
import { catalogById, findCatalogMatch } from '@/data/fakeCatalog';
import type { Item, Member } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { formatQuantity } from '@/lib/format';
import { colors, radius, size, spacing } from '@/theme';

// --- Pick which item wasn't found ---------------------------------------------

type PickProps = {
  visible: boolean;
  items: Item[];
  onPick: (item: Item) => void;
  onClose: () => void;
};

export function PickItemSheet({ visible, items, onPick, onClose }: PickProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={t('shop.pickTitle')}>
      <View style={styles.pickList}>
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => onPick(item)} style={styles.pickRow} accessibilityRole="button">
            <AppText variant="item" weight="semibold" style={styles.flex}>
              {item.name}
            </AppText>
            <AppText variant="body" color="muted">
              {formatQuantity(item.qty, item.unit)}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

// --- "الهيل مو موجود؟" -------------------------------------------------------------

type NotFoundChoice = 'ask' | 'next' | 'remove';

type NotFoundProps = {
  item: Item | null;
  adder: Member | undefined;
  askTarget: Member | undefined; // who we'd ask (the adder, unless that's the shopper)
  onConfirm: (choice: NotFoundChoice) => void;
  onClose: () => void;
};

export function NotFoundSheet({ item, adder, askTarget, onConfirm, onClose }: NotFoundProps) {
  // Starts fresh for each item (the shop screen gives each item its own sheet)
  const [choice, setChoice] = useState<NotFoundChoice>(askTarget ? 'ask' : 'next');

  if (!item) return null;

  const altId = findCatalogMatch(item.name)?.alternative;
  const alt = altId ? catalogById(altId)?.name : undefined;
  const question = alt ? t('notFound.questionAlt', { name: item.name, alt }) : t('notFound.question', { name: item.name });

  return (
    <Sheet
      visible
      onClose={onClose}
      title={t('notFound.title', { name: item.name })}
      subtitle={
        adder
          ? t(`notFound.subtitle_${adder.gender}`, { who: adder.display_name, qty: formatQuantity(item.qty, item.unit) })
          : undefined
      }
      footer={
        <SheetButton label={t(choice === 'ask' ? 'notFound.send' : 'notFound.confirm')} onPress={() => onConfirm(choice)} />
      }>
      <View style={styles.options} accessibilityRole="radiogroup">
        {askTarget && (
          <RadioCard
            title={t('notFound.ask', { name: askTarget.display_name })}
            body={t(`notFound.askBody_${askTarget.gender}`)}
            selected={choice === 'ask'}
            onPress={() => setChoice('ask')}
          />
        )}
        <RadioCard title={t('notFound.next')} body={t('notFound.nextBody')} selected={choice === 'next'} onPress={() => setChoice('next')} />
        <RadioCard
          title={t('notFound.remove')}
          body={t('notFound.removeBody')}
          selected={choice === 'remove'}
          onPress={() => setChoice('remove')}
        />
      </View>

      {choice === 'ask' && askTarget && (
        <View style={styles.preview}>
          <AppText variant="body" color="muted">
            {t('notFound.previewLabel', { name: askTarget.display_name })}
          </AppText>
          <AppText variant="item">{question}</AppText>
          <View style={styles.replyRow}>
            <View style={styles.replyChip}>
              <AppText variant="body">{`${t('notFound.replyLabel')} ${t('notFound.replyYes')}`}</AppText>
            </View>
            <View style={styles.replyChip}>
              <AppText variant="body">{t('notFound.replyNo')}</AppText>
            </View>
            <View style={styles.replyChip}>
              <AppText variant="body">{t('notFound.replyLater')}</AppText>
            </View>
          </View>
        </View>
      )}
    </Sheet>
  );
}

// --- "طالعة قبل ما تخلّصين؟" -------------------------------------------------------

const MAX_NAMES = 5;

type EndEarlyProps = {
  visible: boolean;
  remaining: Item[];
  gender: 'f' | 'm';
  onFinish: (handoff: boolean) => void;
  onClose: () => void;
};

export function EndEarlySheet({ visible, remaining, gender, onFinish, onClose }: EndEarlyProps) {
  const [handoff, setHandoff] = useState(false);
  const names = remaining
    .slice(0, MAX_NAMES)
    .map((i) => i.name)
    .join('، ');

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t(`endEarly.title_${gender}`)}
      subtitle={t('endEarly.left', { n: remaining.length, names: remaining.length > MAX_NAMES ? `${names}…` : names })}
      footer={
        <>
          <SheetButton label={t(`endEarly.finish_${gender}`)} onPress={() => onFinish(handoff)} />
          <SheetButton label={t('endEarly.back')} tone="link" onPress={onClose} />
        </>
      }>
      <View style={styles.options} accessibilityRole="radiogroup">
        <RadioCard
          title={t('endEarly.keep')}
          body={t('endEarly.keepBody', { count: t('home.itemCount', { n: remaining.length }) })}
          selected={!handoff}
          onPress={() => setHandoff(false)}
        />
        <RadioCard
          title={t(`endEarly.handoff_${gender}`)}
          body={t('endEarly.handoffBody')}
          selected={handoff}
          onPress={() => setHandoff(true)}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  options: {
    gap: spacing.md,
  },
  pickList: {
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  pickRow: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: size.border,
    borderBottomColor: colors.line,
  },
  preview: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.ground,
  },
  replyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  replyChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
});
