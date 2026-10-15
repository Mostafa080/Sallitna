// «قوائمي» — bottom sheet to switch between my lists (each with its own people) or start a new one.
// Its own see-through screen (like start-trip) so it sits above the tab bar.

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Sheet } from '@/components/shop/Sheet';
import { t } from '@/i18n';
import { useList } from '@/store/ListStore';
import { colors, radius, size, spacing } from '@/theme';

export default function ListSwitcherScreen() {
  const router = useRouter();
  const list = useList();
  const onClose = () => router.back();

  const onNew = () => {
    if (list.mode === 'demo') {
      Alert.alert(t('lists.demoTitle'), t('lists.demoBody'), [
        { text: t('home.demoStay'), style: 'cancel' },
        {
          text: t('home.demoLeave'),
          onPress: () => {
            router.back();
            list.signOut();
          },
        },
      ]);
      return;
    }
    router.replace('/new-list');
  };

  const onPick = (householdId: string) => {
    onClose();
    if (householdId === list.householdId) return;
    Haptics.selectionAsync();
    list.switchList(householdId);
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Sheet visible onClose={onClose} title={t('lists.sheetTitle')}>
        <View style={styles.card} accessibilityRole="radiogroup">
          {list.lists.map((l, index) => {
            const current = l.householdId === (list.householdId ?? l.householdId);
            return (
              <Pressable
                key={l.householdId}
                onPress={() => onPick(l.householdId)}
                style={[styles.row, index > 0 && styles.divider]}
                accessibilityRole="radio"
                accessibilityState={{ selected: current }}>
                <View style={styles.check}>
                  {current && (
                    <Check size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke + 1} />
                  )}
                </View>
                <AppText variant="item" weight={current ? 'bold' : 'regular'} style={styles.flex} numberOfLines={1}>
                  {l.name}
                </AppText>
                <AppText variant="body" color="muted">
                  {t('lists.members', { n: l.memberCount })}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable onPress={onNew} style={[styles.row, styles.divider]} accessibilityRole="button">
            <View style={styles.plus}>
              <Plus size={size.icon - spacing.xs} color={colors.onDark} strokeWidth={size.iconStroke} />
            </View>
            <AppText variant="item" weight="semibold" style={styles.flex}>
              {t('lists.new')}
            </AppText>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  row: {
    minHeight: size.toast,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  check: {
    width: size.checkbox,
    alignItems: 'center',
  },
  plus: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
