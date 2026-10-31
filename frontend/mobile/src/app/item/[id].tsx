import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronLeft, ChevronRight, Minus, Play, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Avatar } from '@/components/Avatar';
import { GlassCard } from '@/components/glass/Glass';
import { GradientBackground } from '@/components/glass/GradientBackground';
import { ItemPhotoPreview } from '@/components/ItemPhoto';
import { UndoToast } from '@/components/UndoToast';
import { commonUnits, type Unit } from '@/data/fakeHousehold';
import { t } from '@/i18n';
import { isRTLLayout } from '@/lib/direction';
import { formatQuantity, formatTimestamp } from '@/lib/format';
import { useList } from '@/store/ListStore';
import { colors, fonts, fontSize, opacity, radius, size, spacing } from '@/theme';

const MIN_QTY = 1;
// Photos are squeezed a little before upload: clear enough to recognise a product, quick to send
const PHOTO_QUALITY = 0.6;
const PHOTO_ASPECT: [number, number] = [4, 3];
// The back arrow points toward the start side
const BackIcon = isRTLLayout ? ChevronRight : ChevronLeft;

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useList();
  const item = list.items.find((i) => i.id === id);

  const [qty, setQty] = useState(item?.qty ?? MIN_QTY);
  const [unit, setUnit] = useState<Unit>(item?.unit ?? 'count');
  const [note, setNote] = useState(item?.note ?? '');
  const [savingPhoto, setSavingPhoto] = useState(false);

  useEffect(() => {
    if (!item) router.back();
  }, [item, router]);

  if (!item) return null;

  const memberById = (memberId: string) => list.memberById(memberId);
  const adder = memberById(item.added_by);
  const helper = list.members.find((m) => m.role === 'helper');
  const lastBuyer = item.purchase_stats ? memberById(item.purchase_stats.last_bought_by) : undefined;
  const unitOptions = commonUnits.includes(item.unit) ? commonUnits : [...commonUnits, item.unit];

  const comingSoon = () => list.notify(t('toast.comingSoon'));

  // «صوّرها عشان ما يغلط»: camera or gallery → saved on the item and as the family's picture of the product
  const photo = list.photoFor(item);
  const ownPhoto = photo?.kind === 'family';
  const pickPhoto = async (from: 'camera' | 'library') => {
    try {
      if (from === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        return list.notify(t('detail.photoDenied'));
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: PHOTO_ASPECT,
        quality: PHOTO_QUALITY,
      };
      const result =
        from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      const picked = result.canceled ? undefined : result.assets[0];
      if (!picked) return;
      setSavingPhoto(true);
      const saved = await list.setItemPhoto(item.id, picked.uri);
      setSavingPhoto(false);
      if (saved) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.warn('[photo]', error);
      setSavingPhoto(false);
      list.notify(t('toast.photoFailed'));
    }
  };
  const onPhoto = () => {
    if (list.mode !== 'live') return comingSoon();
    Alert.alert(t('detail.photoSourceTitle'), undefined, [
      { text: t('detail.photoTake'), onPress: () => pickPhoto('camera') },
      { text: t('detail.photoChoose'), onPress: () => pickPhoto('library') },
      { text: t('detail.photoCancel'), style: 'cancel' },
    ]);
  };
  const onRemovePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    list.removeItemPhoto(item.id);
  };

  const changeQty = (delta: number) => {
    Haptics.selectionAsync();
    setQty((current) => Math.max(MIN_QTY, current + delta));
  };

  const onSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    list.saveItem(item.id, { qty, unit, note: note.trim() });
    router.back();
  };

  const onDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    list.removeItem(item.id);
    router.back();
  };

  const addedByKey = `detail.${item.added_via === 'voice' ? 'addedByVoice' : 'addedByText'}_${adder?.gender ?? 'm'}`;
  const historyMeta = [
    formatTimestamp(item.created_at),
    item.voice_transcript ? t('detail.quote', { text: item.voice_transcript }) : null,
  ]
    .filter(Boolean)
    .join(t('item.metaSeparator'));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GradientBackground />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + size.button + spacing.xxxl,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}>
        {/* Top bar: back on the start side, delete on the end side */}
        <View style={styles.topBar}>
          <CircleButton onPress={() => router.back()} label={t('detail.back')}>
            <BackIcon size={size.icon} color={colors.ink} strokeWidth={size.iconStroke} />
          </CircleButton>
          <CircleButton onPress={onDelete} label={t('detail.delete')}>
            <Trash2 size={size.icon - spacing.xs} color={colors.danger} strokeWidth={size.iconStroke} />
          </CircleButton>
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <View style={styles.categoryPill}>
            <AppText variant="body" weight="medium">
              {t(`categories.${item.category}`)}
            </AppText>
          </View>
          <AppText variant="title" weight="bold" style={styles.title} accessibilityRole="header">
            {item.name}
          </AppText>
          {helper && item.translations && (
            <AppText variant="body" color="muted">
              {t('detail.translations', { ...item.translations, name: helper.display_name })}
            </AppText>
          )}
        </View>

        {/* Quantity */}
        <GlassCard style={styles.card}>
          <View style={styles.quantityRow}>
            <AppText variant="label" weight="semibold" style={styles.flex}>
              {t('detail.quantity')}
            </AppText>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => changeQty(1)}
                style={styles.stepperButton}
                accessibilityRole="button"
                accessibilityLabel={t('detail.increase')}>
                <Plus size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
              </Pressable>
              <AppText
                variant="item"
                weight="bold"
                style={styles.stepperValue}
                accessibilityLiveRegion="polite">
                {formatQuantity(qty, unit)}
              </AppText>
              <Pressable
                onPress={() => changeQty(-1)}
                disabled={qty <= MIN_QTY}
                style={[styles.stepperButton, qty <= MIN_QTY && styles.disabled]}
                accessibilityRole="button"
                accessibilityState={{ disabled: qty <= MIN_QTY }}
                accessibilityLabel={t('detail.decrease')}>
                <Minus size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
              </Pressable>
            </View>
          </View>

          <View style={styles.unitRow} accessibilityRole="radiogroup">
            {unitOptions.map((option) => {
              const selected = option === unit;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setUnit(option);
                  }}
                  style={[styles.unitButton, selected ? styles.unitSelected : styles.unitIdle]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}>
                  <AppText variant="label" weight={selected ? 'semibold' : 'regular'} color={selected ? 'onDark' : 'ink'}>
                    {t(`unitNames.${option}`)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {/* Note for the shopper */}
        <GlassCard style={styles.card}>
          <AppText variant="label" weight="semibold">
            {t('detail.noteLabel')}
          </AppText>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('detail.notePlaceholder')}
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            accessibilityLabel={t('detail.noteLabel')}
            returnKeyType="done"
            multiline
            blurOnSubmit
          />
          {photo && (
            <>
              <ItemPhotoPreview source={photo} name={item.name} />
              <AppText variant="meta" color="muted">
                {t(ownPhoto ? 'detail.photoFamily' : 'detail.photoOfficial')}
              </AppText>
            </>
          )}
          <View style={styles.photoActions}>
            <Pressable
              onPress={onPhoto}
              disabled={savingPhoto}
              style={[styles.photoButton, styles.flex]}
              accessibilityRole="button"
              accessibilityState={{ busy: savingPhoto }}>
              {savingPhoto ? (
                <ActivityIndicator color={colors.muted} />
              ) : (
                <Camera size={size.icon - spacing.xs} color={colors.ink} strokeWidth={size.iconStroke} />
              )}
              <AppText variant="label">
                {t(savingPhoto ? 'detail.photoSaving' : ownPhoto ? 'detail.photoChange' : 'detail.photo')}
              </AppText>
            </Pressable>
            {ownPhoto && !savingPhoto && (
              <Pressable onPress={onRemovePhoto} style={styles.photoRemove} accessibilityRole="button">
                <AppText variant="label" color="danger">
                  {t('detail.photoRemove')}
                </AppText>
              </Pressable>
            )}
          </View>
          {ownPhoto && !savingPhoto && (
            <AppText variant="meta" color="muted">
              {t('detail.photoChangeHint')}
            </AppText>
          )}
        </GlassCard>

        {/* Who added it + history */}
        <GlassCard style={styles.card}>
          <View style={styles.historyRow}>
            {adder && <Avatar member={adder} ring="surface" />}
            <View style={styles.flex}>
              <AppText variant="label" weight="semibold">
                {t(addedByKey, { name: adder?.display_name ?? '' })}
              </AppText>
              <AppText variant="meta" color="muted" numberOfLines={1}>
                {historyMeta}
              </AppText>
            </View>
            {item.added_via === 'voice' && (
              <Pressable
                onPress={comingSoon}
                style={styles.playButton}
                accessibilityRole="button"
                accessibilityLabel={t('detail.play')}>
                <Play size={size.iconSmall + spacing.xxs} color={colors.ink} fill={colors.ink} />
              </Pressable>
            )}
          </View>
          {item.purchase_stats && lastBuyer && (
            <>
              <View style={styles.divider} />
              <AppText variant="body" color="muted">
                {t('detail.stats', { n: item.purchase_stats.times_this_month, name: lastBuyer.display_name })}
              </AppText>
            </>
          )}
        </GlassCard>
      </ScrollView>

      <UndoToast />

      {/* Save */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable onPress={onSave} style={styles.saveButton} accessibilityRole="button">
          <AppText variant="label" weight="bold" color="onDark">
            {t('detail.save')}
          </AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

type CircleButtonProps = {
  onPress: () => void;
  label: string;
  children: ReactNode;
};

function CircleButton({ onPress, label, children }: CircleButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.circleButton} accessibilityRole="button" accessibilityLabel={label}>
      {children}
    </Pressable>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  circleButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: size.border,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  title: {
    lineHeight: size.titleLine + spacing.sm,
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: size.control,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
  },
  stepperButton: {
    width: size.touch,
    height: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: size.button + spacing.xxxl,
    textAlign: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
  unitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unitButton: {
    flex: 1,
    height: size.control,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: size.border,
  },
  unitSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  unitIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  noteInput: {
    minHeight: size.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.control,
    borderWidth: size.border,
    borderColor: colors.line,
    backgroundColor: colors.ground,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: fontSize.label,
    textAlign: isRTLLayout ? 'right' : 'left',
    writingDirection: isRTLLayout ? 'rtl' : 'ltr',
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photoRemove: {
    height: size.control,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  photoButton: {
    height: size.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.control,
    borderWidth: size.border,
    borderStyle: 'dashed',
    borderColor: colors.muted,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playButton: {
    width: size.touch,
    height: size.touch,
    borderRadius: radius.pill,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: size.border,
    backgroundColor: colors.line,
  },
  footer: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  saveButton: {
    height: size.button,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
