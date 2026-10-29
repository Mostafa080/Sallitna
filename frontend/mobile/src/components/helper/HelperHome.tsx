// The helper's list (driver / maid) — in their own language, left-to-right for English/Hindi.
// Live: a helper who signed in sees this instead of the family tabs (tick «bought», add items, switch language,
// sign out from the avatar). Demo: opened from the test menu as Rahul; the avatar goes back.

import * as Haptics from 'expo-haptics';
import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { ItemPhotoThumb } from '@/components/ItemPhoto';
import { SwipeActions } from '@/components/SwipeActions';
import { UndoToast } from '@/components/UndoToast';
import { catalogToDraft, searchCatalogIn, type CatalogItem } from '@/data/fakeCatalog';
import { household, NEW_ITEM_WINDOW_MINUTES, type Item, type LanguageKey, type Member } from '@/data/fakeHousehold';
import { tIn } from '@/i18n';
import { LayoutDirectionContext } from '@/lib/direction';
import { formatQuantity } from '@/lib/format';
import { useList } from '@/store/ListStore';
import { colors, fonts, fontSize, motion, radius, size, spacing } from '@/theme';

const rowLayout = LinearTransition.duration(motion.normal);
const rowExit = FadeOut.duration(motion.fast);
const CHECKBOX_HIT_SLOP = (size.touch - size.checkbox) / 2;
const BAR_HEIGHT = size.button + spacing.lg * 2;
const MAX_SUGGESTIONS = 4;
// Helpers mostly read English or Hindi, so those come first (as in helper.png)
const helperLanguages: LanguageKey[] = ['en', 'hi', 'ar'];

// How a member's name reads in the helper's language
const nameIn = (member: Member | undefined, language: LanguageKey) =>
  !member ? '' : language === 'ar' ? member.display_name : (member.names?.[language] ?? member.display_name);

type Props = {
  helper: Member;
  live: boolean; // the signed-in helper (else the demo's Rahul, seen from the family's phone)
  onExit: () => void; // demo: back to the family's list
};

export function HelperHome({ helper, live, onExit }: Props) {
  const insets = useSafeAreaInsets();
  const list = useList();
  const [checking, setChecking] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const language = helper.view_language;
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const tr = (key: string, params?: Record<string, string | number>) => tIn(language, key, params);

  const homeName =
    list.householdName !== household.name || language === 'ar'
      ? list.householdName
      : tr('helper.home', { name: household.names[language] });

  const now = Date.now();
  const isNew = (item: Item) => now - new Date(item.created_at).getTime() < NEW_ITEM_WINDOW_MINUTES * 60_000;
  const open = list.items.filter((i) => i.status === 'open');
  const total = list.items.filter((i) => i.status !== 'removed').length;
  // Newest additions first, then the family's order
  const rows = [...open.filter(isNew), ...open.filter((i) => !isNew(i))];

  const itemName = (item: Item) => (language === 'ar' ? item.name : (item.translations?.[language] ?? item.name));

  const metaFor = (item: Item) => {
    const adder = list.memberById(item.added_by);
    // Everyone else who asked for it: "Umm Khalid + Khalid"
    const others = item.requested_by
      .filter((id) => id !== item.added_by)
      .map((id) => tr('helper.plus', { name: nameIn(list.memberById(id), language) }))
      .join('');
    const addedBy =
      item.added_by === helper.id
        ? tr('helper.addedByYou') + others
        : tr(`helper.addedBy_${adder?.gender ?? 'm'}`, { name: nameIn(adder, language) + others });
    // The Arabic name too, so it can be matched with what's said or written in the shop
    const original = language !== 'ar' && itemName(item) !== item.name ? item.name : null;
    return [original, addedBy].filter(Boolean).join(tr('item.metaSeparator'));
  };

  const onCheck = (item: Item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecking((ids) => [...ids, item.id]);
    // Show the tick for a moment before the row leaves
    setTimeout(() => {
      list.markBought(item.id, tr('helper.bought', { name: itemName(item) }));
      setChecking((ids) => ids.filter((id) => id !== item.id));
    }, motion.checkDelay);
  };

  const onLanguage = (key: LanguageKey) => {
    if (key === language) return;
    Haptics.selectionAsync();
    // Live: saved on my profile (the whole app switches); demo: Rahul's setting on this phone
    if (live) list.updateProfile({ view_language: key });
    else list.updateMember(helper.id, { view_language: key }, true);
  };

  // --- Add an item by typing (search knows English / Hindi names: «milk» → لبن) ---
  const trimmed = query.trim();
  const suggestions = trimmed ? searchCatalogIn(trimmed, language, MAX_SUGGESTIONS) : [];
  const addFromCatalog = (item: CatalogItem) => {
    Haptics.selectionAsync();
    list.addItems([catalogToDraft(item)]);
    setQuery('');
  };
  const addAsIs = () => {
    if (!trimmed) return;
    Haptics.selectionAsync();
    list.addItems([{ name: trimmed, qty: 1, unit: 'count', category: 'other' }]);
    setQuery('');
  };
  const catalogName = (item: CatalogItem) =>
    language === 'ar' ? item.name : (item.translations?.[language] ?? item.name);

  // The avatar: live → sign out (asks first); demo → back to the family's list
  const onAvatar = () => {
    if (!live) return onExit();
    Alert.alert(tr('helper.signOutTitle'), tr('helper.signOutBody'), [
      { text: tr('helper.cancel'), style: 'cancel' },
      { text: tr('helper.signOut'), style: 'destructive', onPress: list.signOut },
    ]);
  };

  return (
    <LayoutDirectionContext.Provider value={direction}>
      <View style={[styles.screen, { direction }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + BAR_HEIGHT + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <AppText variant="label" color="muted">
                {homeName}
              </AppText>
              <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
                {tr('helper.title')}
              </AppText>
            </View>
            <Pressable
              onPress={onAvatar}
              accessibilityRole="button"
              accessibilityLabel={tr(live ? 'helper.signOut' : 'helper.exitA11y')}>
              <Avatar member={helper} large="list" ring="ground" />
            </Pressable>
          </View>

          <View style={styles.languageBlock}>
            <AppText variant="label" weight="medium" color="muted">
              {tr('helper.showIn')}
            </AppText>
            <View style={styles.segments} accessibilityRole="radiogroup">
              {helperLanguages.map((key) => {
                const selected = key === language;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onLanguage(key)}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <AppText
                      variant="item"
                      weight={selected ? 'semibold' : 'regular'}
                      color={selected ? 'ink' : 'muted'}>
                      {tIn(key, `languages.${key}`)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {list.itemsLoading ? (
            // Still loading: a spinner, not «0 of 0 · nothing left to buy»
            <ActivityIndicator color={colors.muted} style={styles.empty} />
          ) : (
            <AppText variant="label" weight="semibold" color="muted" style={styles.count}>
              {tr('helper.leftToBuy', { open: open.length, total })}
            </AppText>
          )}

          {list.itemsLoading ? null : rows.length === 0 ? (
            <View style={styles.empty}>
              <AppText variant="item" weight="bold">
                {tr('helper.empty')}
              </AppText>
              <AppText variant="body" color="muted" style={styles.center}>
                {tr('helper.emptyBody')}
              </AppText>
            </View>
          ) : (
            <View style={styles.card}>
              {rows.map((item, index) => {
                const checked = checking.includes(item.id);
                return (
                  <Animated.View key={item.id} layout={rowLayout} exiting={rowExit} style={index > 0 && styles.divider}>
                    {/* Swipe left = bought, right = not found (same as the family's shopping screen) */}
                    <SwipeActions
                      boughtLabel={tr('helper.swipeBought')}
                      notFoundLabel={tr('helper.swipeNotFound')}
                      onBought={() => list.markBought(item.id, tr('helper.bought', { name: itemName(item) }))}
                      onNotFound={() => list.markNotFound(item.id, tr('helper.notFound', { name: itemName(item) }))}>
                      <View
                        style={styles.row}
                        accessibilityActions={[
                          { name: 'bought', label: tr('helper.swipeBought') },
                          { name: 'notFound', label: tr('helper.swipeNotFound') },
                        ]}
                        onAccessibilityAction={(e) => {
                          if (e.nativeEvent.actionName === 'bought')
                            list.markBought(item.id, tr('helper.bought', { name: itemName(item) }));
                          if (e.nativeEvent.actionName === 'notFound')
                            list.markNotFound(item.id, tr('helper.notFound', { name: itemName(item) }));
                        }}>
                        <Pressable
                          onPress={() => !checked && onCheck(item)}
                          hitSlop={CHECKBOX_HIT_SLOP}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          accessibilityLabel={tr('helper.markBoughtA11y', { name: itemName(item) })}
                          style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && (
                            <Check size={size.iconSmall} color={colors.onDark} strokeWidth={size.iconStroke + 1} />
                          )}
                        </Pressable>

                        <ItemPhotoThumb source={list.photoFor(item)} name={itemName(item)} />

                        <View style={styles.body}>
                          <View style={styles.nameLine}>
                            <AppText variant="item" weight="semibold" numberOfLines={1} style={styles.name}>
                              {itemName(item)}
                            </AppText>
                            {isNew(item) && (
                              <View style={styles.newBadge}>
                                <AppText variant="meta" weight="medium" color="accentInk">
                                  {tr('helper.new')}
                                </AppText>
                              </View>
                            )}
                          </View>
                          <AppText variant="meta" color="muted">
                            {metaFor(item)}
                          </AppText>
                        </View>

                        <View style={styles.qtyPill}>
                          <AppText variant="body" weight="bold">
                            {formatQuantity(item.qty, item.unit, language)}
                          </AppText>
                        </View>
                      </View>
                    </SwipeActions>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Covers the status bar area so the list doesn't scroll under the clock */}
        <View style={[styles.statusBarCover, { height: insets.top }]} />

        <UndoToast language={language} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.barWrap}
          pointerEvents="box-none">
          <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
            {trimmed !== '' && (
              <View style={styles.suggestions}>
                {suggestions.map((item, index) => (
                  <Pressable
                    key={item.id}
                    onPress={() => addFromCatalog(item)}
                    style={[styles.suggestion, index > 0 && styles.divider]}
                    accessibilityRole="button"
                    accessibilityLabel={tr('helper.addA11y', { name: catalogName(item) })}>
                    <View style={styles.flex}>
                      <AppText variant="item" weight="semibold" numberOfLines={1}>
                        {catalogName(item)}
                      </AppText>
                      {language !== 'ar' && (
                        <AppText variant="meta" color="muted" numberOfLines={1}>
                          {item.name}
                        </AppText>
                      )}
                    </View>
                    <Plus size={size.icon - spacing.xs} color={colors.accent} strokeWidth={size.iconStroke} />
                  </Pressable>
                ))}
                <Pressable
                  onPress={addAsIs}
                  style={[styles.suggestion, suggestions.length > 0 && styles.divider]}
                  accessibilityRole="button">
                  <AppText variant="item" style={styles.flex} numberOfLines={1}>
                    {tr('helper.addAsIs', { text: trimmed })}
                  </AppText>
                  <Plus size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
                </Pressable>
              </View>
            )}
            <View style={styles.addField}>
              <Plus size={size.icon - spacing.xs} color={colors.muted} strokeWidth={size.iconStroke} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tr('helper.addPlaceholder')}
                placeholderTextColor={colors.muted}
                style={[styles.addInput, { textAlign: direction === 'rtl' ? 'right' : 'left' }]}
                returnKeyType="done"
                autoCorrect={false}
                onSubmitEditing={() => (suggestions[0] ? addFromCatalog(suggestions[0]) : addAsIs())}
                accessibilityLabel={tr('helper.addPlaceholder')}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </LayoutDirectionContext.Provider>
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
    gap: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    lineHeight: size.titleLine,
  },
  languageBlock: {
    gap: spacing.sm,
  },
  segments: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.card,
    backgroundColor: colors.line,
  },
  segment: {
    flex: 1,
    minHeight: size.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control + spacing.xxs,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
  count: {
    paddingHorizontal: spacing.xs,
    marginBottom: -spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: size.border,
    borderTopColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: size.touch + spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface, // covers the swipe colors until the row moves
  },
  checkbox: {
    width: size.checkbox,
    height: size.checkbox,
    borderRadius: radius.pill,
    borderWidth: size.borderThick,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: colors.accentTint,
    borderRadius: radius.badge,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  qtyPill: {
    minHeight: size.qtyPill,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    backgroundColor: colors.ground,
  },
  barWrap: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
  },
  bar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: size.border,
    borderTopColor: colors.line,
    backgroundColor: colors.ground,
  },
  suggestions: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  suggestion: {
    minHeight: size.touch + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addField: {
    minHeight: size.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  addInput: {
    flex: 1,
    minHeight: size.button,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.item,
  },
});
