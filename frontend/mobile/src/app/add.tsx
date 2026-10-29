import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ClipboardList, Mic, Plus, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddChip } from '@/components/AddChip';
import { AppText } from '@/components/AppText';
import { UndoToast } from '@/components/UndoToast';
import { catalogToDraft, runningLow, searchCatalog, usualItems, type CatalogItem } from '@/data/fakeCatalog';
import { t } from '@/i18n';
import { normalizeArabic } from '@/lib/arabic';
import { isRTLLayout } from '@/lib/direction';
import { features } from '@/lib/features';
import { formatQuantity } from '@/lib/format';
import { parseShoppingList } from '@/lib/parseList';
import { useList } from '@/store/ListStore';
import { colors, fonts, fontSize, motion, radius, size, spacing } from '@/theme';

const DAYS_PER_WEEK = 7;
const PASTE_BAR_HEIGHT = size.control + spacing.md * 2;
const layout = LinearTransition.duration(motion.normal);

export default function TypeAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const [query, setQuery] = useState('');
  const [keyboardShown, setKeyboardShown] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  // Above the keyboard there's no home indicator to leave room for
  const bottomInset = keyboardShown ? 0 : insets.bottom;

  const onListNames = new Set(
    list.items.filter((item) => item.status === 'open').map((item) => normalizeArabic(item.name)),
  );
  const results = searchCatalog(query);
  const lowItem = runningLow(onListNames)[0];
  // Don't repeat the running-low item in the chips
  const usual = usualItems(new Set([...onListNames, ...(lowItem ? [normalizeArabic(lowItem.name)] : [])]));
  const trimmed = query.trim();
  const showAddAsIs = trimmed.length > 0 && !results.some((r) => normalizeArabic(r.name) === normalizeArabic(trimmed));

  const addFromCatalog = (item: CatalogItem) => {
    Haptics.selectionAsync();
    list.addItems([catalogToDraft(item)]);
    setQuery('');
  };

  const addAsIs = () => {
    Haptics.selectionAsync();
    list.addItems([{ name: trimmed, qty: 1, unit: 'count', category: 'other' }]);
    setQuery('');
  };

  const onPaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) return list.notify(t('toast.clipboardEmpty'));
    const drafts = parseShoppingList(text);
    if (drafts.length === 0) return list.notify(t('toast.nothingFound'));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.addItems(drafts);
  };

  const resultMeta = (item: CatalogItem) => {
    const parts: string[] = [];
    const times = item.habits?.times_this_month ?? 0;
    if (times > 0) parts.push(t('typeAdd.boughtThisMonth', { n: times }));
    const onList = list.findOpenByName(item.name);
    if (onList) parts.push(t('typeAdd.inList', { qty: formatQuantity(onList.qty, onList.unit) }));
    if (parts.length === 0) parts.push(t(`categories.${item.category}`));
    return parts.join(t('item.metaSeparator'));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Search field + cancel */}
      <View style={[styles.searchRow, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.searchField}>
          <Search size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('typeAdd.placeholder')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (results[0]) addFromCatalog(results[0]);
              else if (trimmed) addAsIs();
            }}
            accessibilityLabel={t('typeAdd.searchA11y')}
          />
          {features.voice && (
            <Pressable
              onPress={() => router.replace('/voice')}
              style={styles.micButton}
              accessibilityRole="button"
              accessibilityLabel={t('typeAdd.voiceA11y')}>
              <Mic size={size.icon - spacing.xs} color={colors.onDark} strokeWidth={size.iconStroke} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={spacing.md} accessibilityRole="button">
          <AppText variant="label" weight="semibold">
            {t('typeAdd.cancel')}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: PASTE_BAR_HEIGHT + spacing.xxxl }]}>
        {/* Search results */}
        {trimmed.length > 0 && (
          <Animated.View entering={FadeIn.duration(motion.fast)} layout={layout} style={styles.card}>
            {results.map((item, index) => (
              <View key={item.id} style={[styles.resultRow, index > 0 && styles.divider]}>
                <View style={styles.flex}>
                  <AppText variant="item" weight="semibold" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="meta" color="muted" numberOfLines={1}>
                    {resultMeta(item)}
                  </AppText>
                </View>
                <Pressable
                  onPress={() => addFromCatalog(item)}
                  style={styles.plusButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('typeAdd.addA11y', { name: item.name })}>
                  <Plus size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
                </Pressable>
              </View>
            ))}
            {showAddAsIs && (
              <Pressable
                onPress={addAsIs}
                style={[styles.resultRow, results.length > 0 && styles.divider]}
                accessibilityRole="button">
                <AppText variant="label" weight="medium">
                  {t('typeAdd.addAsIs', { text: trimmed })}
                </AppText>
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Running low */}
        {lowItem && (
          <Animated.View layout={layout} exiting={FadeOut.duration(motion.fast)} style={styles.section}>
            <AppText variant="body" weight="semibold" color="muted" style={styles.sectionHeader}>
              {t('typeAdd.runningLow')}
            </AppText>
            <View style={styles.lowCard}>
              <View style={styles.flex}>
                <AppText variant="label" weight="bold">
                  {lowItem.name + t('item.metaSeparator') + formatQuantity(lowItem.default_qty, lowItem.default_unit)}
                </AppText>
                <AppText variant="meta" color="muted">
                  {t('typeAdd.habit', {
                    cadence: t('typeAdd.cadence', { n: Math.round(lowItem.habits!.cadence_days! / DAYS_PER_WEEK) }),
                    ago: t('time.daysAgo', { n: lowItem.habits!.last_bought_days_ago! }),
                  })}
                </AppText>
              </View>
              <Pressable onPress={() => addFromCatalog(lowItem)} style={styles.darkButton} accessibilityRole="button">
                <AppText variant="body" weight="bold" color="onDark">
                  {t('typeAdd.addIt')}
                </AppText>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Usual items */}
        {usual.length > 0 && (
          <Animated.View layout={layout} style={styles.section}>
            <AppText variant="body" weight="semibold" color="muted" style={styles.sectionHeader}>
              {t('typeAdd.usual')}
            </AppText>
            <View style={styles.chips}>
              {usual.map((item) => (
                <Animated.View key={item.id} layout={layout} exiting={FadeOut.duration(motion.fast)}>
                  <AddChip label={item.name} onPress={() => addFromCatalog(item)} />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <UndoToast bottomOffset={PASTE_BAR_HEIGHT + bottomInset + spacing.md} />

      {/* Paste a WhatsApp list */}
      <View style={[styles.pasteBar, { paddingBottom: bottomInset + spacing.md }]}>
        <View style={styles.pasteIcon}>
          <ClipboardList size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
        </View>
        <View style={styles.flex}>
          <AppText variant="body" weight="bold">
            {t('typeAdd.pasteTitle')}
          </AppText>
          <AppText variant="meta" color="muted">
            {t('typeAdd.pasteSubtitle')}
          </AppText>
        </View>
        <Pressable onPress={onPaste} style={styles.outlineButton} accessibilityRole="button">
          <AppText variant="label" weight="bold">
            {t('typeAdd.paste')}
          </AppText>
        </Pressable>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchField: {
    flex: 1,
    height: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingStart: spacing.lg,
    paddingEnd: spacing.sm,
    borderRadius: radius.card,
    borderWidth: size.borderThick,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.item,
    textAlign: isRTLLayout ? 'right' : 'left',
    writingDirection: isRTLLayout ? 'rtl' : 'ltr',
  },
  micButton: {
    width: size.bannerIcon,
    height: size.bannerIcon,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  resultRow: {
    minHeight: size.touch + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  plusButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
  },
  lowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.accentTint,
  },
  darkButton: {
    minHeight: size.touch,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pasteBar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  pasteIcon: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.control,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    minHeight: size.touch,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
