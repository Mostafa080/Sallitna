import { Mic, MicOff } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Transcript } from '@/components/voice/Transcript';
import { VoiceHeader } from '@/components/voice/VoiceParts';
import type { Phrase } from '@/data/fakeVoice';
import { t } from '@/i18n';
import { colors, radius, size, spacing } from '@/theme';

type Props = {
  phrases: Phrase[];
  caughtName: string | null; // the one item we did understand
  onAddCaught: () => void;
  onRetry: () => void;
  onType: () => void;
  onClose: () => void;
};

export function NotUnderstoodView({ phrases, caughtName, onAddCaught, onRetry, onType, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <VoiceHeader onClose={onClose} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <MicOff size={size.icon * 2} color={colors.onDarkMuted} strokeWidth={size.iconStroke} />
        </View>
        <AppText variant="title" weight="bold" color="onDark" style={styles.center} accessibilityRole="header">
          {t('voice.notUnderstood.title')}
        </AppText>
        <AppText variant="item" color="onDarkMuted" style={styles.center}>
          {t('voice.notUnderstood.body')}
        </AppText>

        <View style={styles.caughtCard}>
          <AppText variant="label" color="onDarkMuted">
            {t('voice.notUnderstood.caught')}
          </AppText>
          <Transcript phrases={phrases} variant="item" color="onDarkMuted" trailing={t('voice.notUnderstood.unclear')} />

          {caughtName && (
            <View style={styles.itemCard}>
              <View style={styles.flex}>
                <AppText variant="item" weight="bold">
                  {caughtName}
                </AppText>
                <AppText variant="body" color="muted">
                  {t('voice.notUnderstood.onlyThis')}
                </AppText>
              </View>
              <Pressable onPress={onAddCaught} style={styles.darkButton} accessibilityRole="button">
                <AppText variant="label" weight="bold" color="onDark">
                  {t('voice.notUnderstood.add')}
                </AppText>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable onPress={onRetry} style={styles.retryButton} accessibilityRole="button">
          <Mic size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
          <AppText variant="item" weight="bold">
            {t('voice.notUnderstood.retry')}
          </AppText>
        </Pressable>
        <Pressable onPress={onType} style={styles.outlineButton} accessibilityRole="button">
          <AppText variant="label" weight="bold" color="onDark">
            {t('voice.notUnderstood.type')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.darkGround,
  },
  flex: {
    flex: 1,
  },
  content: {
    alignItems: 'stretch',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  iconCircle: {
    alignSelf: 'center',
    width: size.voiceMic,
    height: size.voiceMic,
    borderRadius: radius.pill,
    backgroundColor: colors.darkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
  caughtCard: {
    marginTop: spacing.sm,
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.card + spacing.sm,
    backgroundColor: colors.darkSurface,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  darkButton: {
    minHeight: size.control,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  retryButton: {
    height: size.button + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  outlineButton: {
    height: size.button + spacing.md,
    borderRadius: radius.pill,
    borderWidth: size.border,
    borderColor: colors.darkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
