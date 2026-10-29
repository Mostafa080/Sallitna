// «ملقوهاش في المحل» — items someone (usually the helper) couldn't find in the shop.
// Sits at the top of the family's list until each one is put back on the list or removed.

import { SearchX } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { Item } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { formatQuantity } from '@/lib/format';
import { colors, radius, size, spacing } from '@/theme';

type Props = {
  items: Item[];
  onReopen: (id: string) => void;
  onRemove: (id: string) => void;
};

export function NotFoundCard({ items, onReopen, onRemove }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SearchX size={size.icon - spacing.xs} color={colors.accentInk} strokeWidth={size.iconStroke} />
        <AppText variant="label" weight="bold" color="accentInk">
          {t('notFoundCard.title', { n: items.length })}
        </AppText>
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="item" weight="semibold" numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="meta" color="muted">
              {formatQuantity(item.qty, item.unit)}
            </AppText>
          </View>
          <Pressable
            onPress={() => onReopen(item.id)}
            style={[styles.button, styles.reopen]}
            accessibilityRole="button"
            accessibilityLabel={t('notFoundCard.reopenA11y', { name: item.name })}>
            <AppText variant="body" weight="bold" color="onDark">
              {t('notFoundCard.reopen')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => onRemove(item.id)}
            style={[styles.button, styles.remove]}
            accessibilityRole="button"
            accessibilityLabel={t('notFoundCard.removeA11y', { name: item.name })}>
            <AppText variant="body" weight="bold">
              {t('notFoundCard.remove')}
            </AppText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentTint,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  button: {
    minHeight: size.touch - spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopen: {
    backgroundColor: colors.accent,
  },
  remove: {
    backgroundColor: colors.surface,
  },
});
