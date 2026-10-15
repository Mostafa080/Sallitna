// «قوايمي» — first page of the app: a card per list (name, its people, «+» to invite) and «قائمة جديدة».
// Tapping a card opens that list (list.tsx) inside this tab.
// Also the app's gate: the logo while loading, welcome when signed out, sign-up when there's no list yet.

import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/components/Avatar';
import { ForwardIcon } from '@/components/family/FamilyParts';
import { Brand } from '@/components/onboarding/OnboardingParts';
import { UndoToast } from '@/components/UndoToast';
import { t } from '@/i18n';
import type { ListSummary } from '@/lib/api';
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

  // Not signed in → welcome. Signed in without a list → «عرّفنا عليك» or «أنشئ قائمتك الأولى».
  // Runs again whenever we come back here unfinished, so nobody gets stuck on the logo.
  useFocusEffect(
    useCallback(() => {
      if (list.mode === 'signedOut') router.push('/welcome');
      else if (list.mode === 'needsHousehold') router.push(list.hasSignupProfile ? '/first-list' : '/about-you');
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
            accessibilityLabel={t('lists.cardA11y', { name: l.name, members: t('lists.members', { n: l.memberCount }) })}>
            <View style={styles.cardTop}>
              <AppText variant="heading" weight="bold" style={styles.flex} numberOfLines={1}>
                {l.name}
              </AppText>
              {opening === l.householdId ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <ForwardIcon size={size.icon} color={colors.muted} strokeWidth={size.iconStroke} />
              )}
            </View>

            {/* The list's people + «+» to invite more */}
            <View style={styles.cardBottom}>
              {l.members.length > 0 && <AvatarStack members={l.members} ring="surface" max={MAX_CARD_AVATARS} />}
              <AppText variant="body" color="muted" style={styles.flex} numberOfLines={1}>
                {t('lists.members', { n: l.memberCount })}
              </AppText>
              <Pressable
                onPress={() => onInvite(l)}
                style={styles.invite}
                hitSlop={spacing.sm}
                accessibilityRole="button"
                accessibilityLabel={t('lists.inviteA11y', { name: l.name })}>
                <Plus size={size.iconSmall + spacing.xxs} color={colors.ink} strokeWidth={size.iconStroke + 0.5} />
              </Pressable>
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
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
