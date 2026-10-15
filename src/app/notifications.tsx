// Simulated lock screen with Sallitna notifications (notifications.png).
// Built from what's happening in the app: a question from whoever is shopping, that they're
// shopping, and what someone else added today. Real push notifications come with Supabase.
// Reached from the test menu (long-press the household name on Home).

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { setStatusBarStyle, StatusBar } from 'expo-status-bar';
import { Mic, ShoppingBasket } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { UndoToast } from '@/components/UndoToast';
import { activeShopperId, activeShopperSinceMinutes, type Item } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { features } from '@/lib/features';
import { formatClock, formatQuantity, formatRelativeTime, formatTimestamp, isToday } from '@/lib/format';
import { useList } from '@/store/ListStore';
import type { QuestionAnswer } from '@/store/tripTypes';
import { colors, motion, radius, size, spacing } from '@/theme';

const cardLayout = LinearTransition.duration(motion.normal);
const cardExit = FadeOut.duration(motion.fast);
const MAX_ADDED_NAMES = 3;
const RECENT_HOURS = 24;

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const [questionId, setQuestionId] = useState<string | null>(null);

  // Sara (or whoever is shopping) asks about cardamom as the screen opens
  useEffect(() => {
    setQuestionId(list.receiveQuestion());
    // Back to dark status-bar text for the light screens underneath
    return () => setStatusBarStyle('dark');
  }, []);

  const me = list.currentMemberId;
  const question = list.questions.find((q) => q.id === questionId && !q.answer);
  const asker = question && list.memberById(question.from);
  const askedItem = question && list.items.find((i) => i.id === question.itemId);

  const shopper = list.members.find((m) => m.id === activeShopperId && m.id !== me);
  const shoppingSince = new Date(Date.now() - activeShopperSinceMinutes * 60_000).toISOString();

  // Latest person (not me) who added things in the last day, and what
  const dayAgo = Date.now() - RECENT_HOURS * 60 * 60_000;
  const addedToday = list.items.filter(
    (i) => i.status === 'open' && i.added_by !== me && new Date(i.created_at).getTime() > dayAgo,
  );
  const latest = [...addedToday].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const adder = latest && list.memberById(latest.added_by);
  const theirs = latest ? addedToday.filter((i) => i.added_by === latest.added_by) : [];

  // Opened straight from a notification there's nothing underneath — then open the list instead
  const goToList = () => (router.canGoBack() ? router.dismissAll() : router.replace('/'));

  const reply = (answer: QuestionAnswer, label: string) => {
    if (!question) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.answerQuestion(question.id, answer, label);
  };

  const nameWithQty = (item: Item) =>
    item.unit === 'count' && item.qty > 1 ? `${item.name} ${formatQuantity(item.qty, item.unit)}` : item.name;

  const hasAny = !!(question && asker && askedItem) || !!shopper || !!adder;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}>
        {question && asker && askedItem && (
          <Animated.View layout={cardLayout} exiting={cardExit}>
            <NotificationCard
              time={t('time.justNow')}
              title={t(`notifications.asks_${asker.gender}`, { name: asker.display_name, item: askedItem.name })}
              body={
                question.altName
                  ? t('notFound.questionAlt', { name: askedItem.name, alt: question.altName })
                  : t('notFound.question', { name: askedItem.name })
              }
              onPress={() => router.push({ pathname: '/answer', params: { id: question.id } })}>
              <View style={styles.actions}>
                <ActionButton
                  label={t(`notifications.yes_${asker.gender}`)}
                  onPress={() => reply('alt', t(`notifications.yes_${asker.gender}`))}
                />
                <ActionButton label={t('notifications.no')} onPress={() => reply('no', t('notifications.no'))} />
                <ActionButton
                  label={t('notifications.reply')}
                  onPress={() => router.push({ pathname: '/answer', params: { id: question.id } })}
                />
              </View>
            </NotificationCard>
          </Animated.View>
        )}

        {shopper && (
          <Animated.View layout={cardLayout}>
            <NotificationCard
              time={formatRelativeTime(shoppingSince)}
              title={t('notifications.shopping', { name: shopper.display_name, store: t('stores.supermarket') })}
              body={t(`notifications.shoppingBody_${shopper.gender}`)}
              onPress={goToList}>
              {features.voice && (
                <ActionButton
                  label={t('notifications.addVoice')}
                  icon={<Mic size={size.iconSmall + spacing.xxs} color={colors.ink} strokeWidth={size.iconStroke} />}
                  onPress={() => router.push('/voice')}
                />
              )}
            </NotificationCard>
          </Animated.View>
        )}

        {adder && latest && (
          <Animated.View layout={cardLayout}>
            <NotificationCard
              old
              time={isToday(latest.created_at) ? formatClock(new Date(latest.created_at)) : formatTimestamp(latest.created_at)}
              title={t(`notifications.added_${adder.gender}`, { name: adder.display_name, n: theirs.length, item: latest.name })}
              body={
                theirs.length > 1
                  ? theirs
                      .slice(0, MAX_ADDED_NAMES)
                      .map(nameWithQty)
                      .join(t('notifications.listSeparator')) + (theirs.length > MAX_ADDED_NAMES ? '…' : '')
                  : undefined
              }
              onPress={goToList}
            />
          </Animated.View>
        )}

        {!hasAny && (
          <AppText variant="label" color="onDarkMuted" style={styles.center}>
            {t('notifications.empty')}
          </AppText>
        )}

        <Pressable onPress={goToList} style={styles.openButton} accessibilityRole="button">
          <AppText variant="label" color="onDark">
            {t('notifications.open')}
          </AppText>
        </Pressable>
      </ScrollView>

      <UndoToast bottomOffset={insets.bottom + spacing.lg} />
    </View>
  );
}

type CardProps = {
  time: string;
  title: string;
  body?: string;
  old?: boolean; // older notifications look slightly greyer
  onPress: () => void;
  children?: ReactNode;
};

function NotificationCard({ time, title, body, old, onPress, children }: CardProps) {
  return (
    <View style={[styles.card, { backgroundColor: old ? colors.notificationOld : colors.notification }]}>
      <Pressable onPress={onPress} style={styles.cardText} accessibilityRole="button">
        <View style={styles.cardHeader}>
          <View style={styles.appIcon}>
            <ShoppingBasket size={size.iconSmall + spacing.xxs} color={colors.ink} strokeWidth={size.iconStroke} />
          </View>
          <AppText variant="label" weight="medium" style={styles.flex}>
            {t('notifications.appName')}
          </AppText>
          <AppText variant="body" color="muted">
            {time}
          </AppText>
        </View>
        <AppText variant="item" weight="bold">
          {title}
        </AppText>
        {body && <AppText variant="label">{body}</AppText>}
      </Pressable>
      {children}
    </View>
  );
}

function ActionButton({ label, icon, onPress }: { label: string; icon?: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.action} accessibilityRole="button">
      {icon}
      <AppText variant="label" weight="bold" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.lockScreen,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.card + spacing.sm,
  },
  cardText: {
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  appIcon: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.badge,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    minHeight: size.control + spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  openButton: {
    alignSelf: 'center',
    minHeight: size.button - spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.onDarkSubtle,
  },
});
