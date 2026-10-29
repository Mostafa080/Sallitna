// «قوايمي» — first page of the app: a card per list (name, its people, «+» to invite) and «قائمة جديدة».
// Tapping a card opens that list (list.tsx) inside this tab.
// Also the app's gate: the logo while loading, welcome when signed out, sign-up when there's no list yet.

import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ellipsis, LogOut, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { ForwardIcon } from '@/components/family/FamilyParts';
import { HelperHome } from '@/components/helper/HelperHome';
import { Brand, Field } from '@/components/onboarding/OnboardingParts';
import { Sheet, SheetButton } from '@/components/shop/Sheet';
import { UndoToast } from '@/components/UndoToast';
import { t } from '@/i18n';
import * as api from '@/lib/api';
import type { ListSummary } from '@/lib/api';
import { useHideTabBar } from '@/lib/tabBar';
import { useList } from '@/store/ListStore';
import { colors, opacity, radius, size, spacing } from '@/theme';

// Faces on a card; more than this become «+N»
const MAX_CARD_AVATARS = 5;

export default function MyListsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const list = useList();
  // The card being opened (switching lists loads it first)
  const [opening, setOpening] = useState<string | null>(null);
  // The card whose «…» menu is open
  const [menuFor, setMenuFor] = useState<ListSummary | null>(null);
  useHideTabBar(!!menuFor); // the floating tab bar would cover the sheet
  // «غيّر الاسم»: the new name being typed (null = showing the menu)
  const [newName, setNewName] = useState<string | null>(null);
  const closeMenu = () => {
    setMenuFor(null);
    setNewName(null);
  };
  const onSaveName = async () => {
    if (!menuFor || !newName?.trim()) return;
    const id = menuFor.householdId;
    closeMenu();
    if (await list.renameList(id, newName)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onRemove = (l: ListSummary) => {
    const how = l.myRole === 'owner' ? 'delete' : 'leave';
    closeMenu();
    Alert.alert(
      t(how === 'delete' ? 'lists.deleteTitle' : 'lists.leaveTitle', { name: l.name }),
      how === 'delete'
        ? t('lists.deleteMessage', { members: t('lists.members', { n: l.memberCount }) })
        : t('lists.leaveBody'),
      [
        { text: t('lists.cancel'), style: 'cancel' },
        {
          text: t(how === 'delete' ? 'lists.deleteConfirm' : 'lists.leaveConfirm'),
          style: 'destructive',
          onPress: async () => {
            if (await list.removeList(l.householdId, how)) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
    );
  };

  // Just signed out (from «حسابي», «عرّفنا عليك»…): close whatever is open, back to welcome
  const previousMode = useRef(list.mode);
  useEffect(() => {
    const was = previousMode.current;
    previousMode.current = list.mode;
    if (list.mode === 'signedOut' && (was === 'live' || was === 'demo' || was === 'needsHousehold')) {
      if (router.canDismiss()) router.dismissAll();
      router.push('/welcome');
    }
  }, [list.mode]);

  // Not signed in → welcome. Signed in without a list → «عرّفنا عليك» or «أنشئ قائمتك الأولى»
  // (after «اعمل كلمة سر» for someone without a password yet — components/PasswordGate.tsx opens that one).
  // Runs again whenever we come back here unfinished, so nobody gets stuck on the logo.
  useFocusEffect(
    useCallback(() => {
      if (list.mode === 'signedOut') {
        router.push('/welcome');
        return;
      }
      if (list.mode !== 'needsHousehold') return;
      let active = true;
      api.hasPassword().then((has) => {
        if (active && has) router.push(list.hasSignupProfile ? '/first-list' : '/about-you');
      });
      return () => {
        active = false;
      };
    }, [list.mode, list.hasSignupProfile]),
  );

  // Make this list the open one (loads its items and people), then run `then`
  const withList = async (householdId: string, then: () => void) => {
    if (opening) return;
    Haptics.selectionAsync();
    if (householdId !== list.householdId) {
      setOpening(householdId);
      await list.switchList(householdId);
      setOpening(null);
    }
    then();
  };

  const onOpen = (l: ListSummary) => withList(l.householdId, () => router.push('/list'));
  const onInvite = (l: ListSummary) => withList(l.householdId, () => router.push('/invite'));

  const onNew = () => {
    if (list.mode === 'demo') {
      Alert.alert(t('lists.demoTitle'), t('lists.demoBody'), [
        { text: t('home.demoStay'), style: 'cancel' },
        { text: t('home.demoLeave'), onPress: list.signOut },
      ]);
      return;
    }
    router.push('/new-list');
  };

  // A helper (driver / maid) gets their own simple screen in their language, without the family tabs
  const me = list.memberById(list.currentMemberId);
  if (list.isHelper && me) return <HelperHome helper={me} live onExit={() => {}} />;

  // Until we know who's signed in (and behind welcome / sign-up): the logo, not an empty screen
  if (list.mode !== 'live' && list.mode !== 'demo') {
    return (
      <View style={styles.loading}>
        <Brand />
        {list.mode === 'loading' && <ActivityIndicator color={colors.muted} />}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + size.tabBar + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}>
        <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
          {t('lists.sheetTitle')}
        </AppText>

        {list.lists.map((l) => (
          <Pressable
            key={l.householdId}
            onPress={() => onOpen(l)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('lists.cardA11y', {
              name: l.name,
              members: t('lists.members', { n: l.memberCount }),
            })}>
            <View style={styles.cardTop}>
              <AppText variant="heading" weight="bold" style={styles.flex} numberOfLines={1}>
                {l.name}
              </AppText>
              {/* «…» — delete (manager) or leave the list; not in the demo */}
              {list.mode === 'live' && (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMenuFor(l);
                  }}
                  style={styles.more}
                  hitSlop={spacing.sm}
                  accessibilityRole="button"
                  accessibilityLabel={t('lists.optionsA11y', { name: l.name })}>
                  <Ellipsis size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
                </Pressable>
              )}
              {opening === l.householdId ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <ForwardIcon size={size.icon} color={colors.muted} strokeWidth={size.iconStroke} />
              )}
            </View>

            {/* The list's people, «+» right next to them to invite more, and the count when there's more than one */}
            <View style={styles.cardBottom}>
              {l.members.length > 0 && <AvatarStack members={l.members} ring="surface" max={MAX_CARD_AVATARS} />}
              <Pressable
                onPress={() => onInvite(l)}
                style={styles.invite}
                hitSlop={spacing.sm}
                accessibilityRole="button"
                accessibilityLabel={t('lists.inviteA11y', { name: l.name })}>
                <Plus size={size.iconSmall + spacing.xxs} color={colors.ink} strokeWidth={size.iconStroke + 0.5} />
              </Pressable>
              {l.memberCount > 1 && (
                <AppText variant="body" color="muted" style={styles.flex} numberOfLines={1}>
                  {t('lists.members', { n: l.memberCount })}
                </AppText>
              )}
            </View>
          </Pressable>
        ))}

        <Pressable
          onPress={onNew}
          style={({ pressed }) => [styles.newCard, pressed && styles.pressed]}
          accessibilityRole="button">
          <View style={styles.newIcon}>
            <Plus size={size.icon - spacing.xs} color={colors.onDark} strokeWidth={size.iconStroke} />
          </View>
          <AppText variant="item" weight="semibold">
            {t('lists.new')}
          </AppText>
        </Pressable>
      </ScrollView>

      <UndoToast bottomOffset={insets.bottom + size.tabBar + spacing.sm} />

      <Sheet
        visible={!!menuFor}
        onClose={closeMenu}
        title={newName !== null ? t('lists.renameTitle') : (menuFor?.name ?? '')}
        footer={
          newName !== null ? (
            <SheetButton label={t('lists.renameSave')} onPress={onSaveName} disabled={!newName.trim()} />
          ) : undefined
        }>
        {menuFor && newName !== null && (
          <Field
            label={t('lists.nameLabel')}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={onSaveName}
          />
        )}
        {menuFor && newName === null && menuFor.myRole === 'owner' && (
          <Pressable
            onPress={() => setNewName(menuFor.name)}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            accessibilityRole="button">
            <View style={styles.menuIcon}>
              <Pencil size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
            </View>
            <View style={styles.flex}>
              <AppText variant="item" weight="semibold">
                {t('lists.rename')}
              </AppText>
              <AppText variant="body" color="muted">
                {t('lists.renameBody')}
              </AppText>
            </View>
          </Pressable>
        )}
        {menuFor && newName === null && (
          <Pressable
            onPress={() => onRemove(menuFor)}
            style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
            accessibilityRole="button">
            <View style={styles.menuIcon}>
              {menuFor.myRole === 'owner' ? (
                <Trash2 size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
              ) : (
                <LogOut size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="item" weight="semibold" color="danger">
                {t(menuFor.myRole === 'owner' ? 'lists.delete' : 'lists.leave')}
              </AppText>
              <AppText variant="body" color="muted">
                {t(menuFor.myRole === 'owner' ? 'lists.deleteBody' : 'lists.leaveBody')}
              </AppText>
            </View>
          </Pressable>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.ground,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    lineHeight: size.titleLine,
    marginBottom: spacing.sm,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: opacity.pressed,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invite: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderStyle: 'dashed',
    borderColor: colors.muted,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    width: size.touch - spacing.sm,
    height: size.touch - spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderColor: colors.line,
  },
  menuIcon: {
    width: size.touch - spacing.sm,
    height: size.touch - spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: size.button,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    borderWidth: size.border,
    borderStyle: 'dashed',
    borderColor: colors.muted,
  },
  newIcon: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
