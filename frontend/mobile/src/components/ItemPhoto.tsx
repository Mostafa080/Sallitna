// Product photos («صوّرها عشان ما يغلط»): a small picture on a list row that opens full screen when tapped,
// and the bigger one on the item screen. Family photos are private, so they open through a temporary link.

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import * as api from '@/lib/api';
import type { PhotoSource } from '@/store/ListStore';
import { colors, motion, radius, size, spacing } from '@/theme';

// The address to load a photo from (null while a private link is being made, or if it failed)
export function usePhotoUri(source: PhotoSource | null): string | null {
  const key = source ? (source.kind === 'url' ? source.url : source.path) : null;
  const [uri, setUri] = useState<string | null>(source?.kind === 'url' ? source.url : null);
  useEffect(() => {
    if (!source) return setUri(null);
    if (source.kind === 'url') return setUri(source.url);
    let cancelled = false;
    setUri(null);
    api
      .familyPhotoUrl(source.path)
      .then((url) => !cancelled && setUri(url))
      .catch((error) => __DEV__ && console.warn('[photo link]', error));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return uri;
}

// The photo filling the screen; tap anywhere to close
function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={[styles.viewer, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('photo.close')}>
        <Image source={{ uri }} style={styles.full} contentFit="contain" transition={motion.fast} />
      </Pressable>
    </Modal>
  );
}

// Small photo on a list row; nothing at all when the item has no picture
export function ItemPhotoThumb({ source, name }: { source: PhotoSource | null; name: string }) {
  const uri = usePhotoUri(source);
  const [open, setOpen] = useState(false);
  if (!source) return null;
  return (
    <>
      <Pressable
        onPress={() => uri && setOpen(true)}
        style={styles.thumb}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('photo.open', { name })}>
        {uri && <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={motion.fast} />}
      </Pressable>
      {open && uri && <PhotoViewer uri={uri} onClose={() => setOpen(false)} />}
    </>
  );
}

// The bigger photo on the item screen (also opens full screen)
export function ItemPhotoPreview({ source, name }: { source: PhotoSource; name: string }) {
  const uri = usePhotoUri(source);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => uri && setOpen(true)}
        style={styles.preview}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('photo.open', { name })}>
        {uri ? (
          <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={motion.fast} />
        ) : (
          <View style={styles.fill} />
        )}
      </Pressable>
      {open && uri && <PhotoViewer uri={uri} onClose={() => setOpen(false)} />}
    </>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: size.photoThumb,
    height: size.photoThumb,
    borderRadius: radius.control,
    overflow: 'hidden',
    backgroundColor: colors.ground,
  },
  preview: {
    height: size.photoPreview,
    borderRadius: radius.control,
    overflow: 'hidden',
    backgroundColor: colors.ground,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  viewer: {
    flex: 1,
    backgroundColor: colors.photoViewer,
    paddingHorizontal: spacing.lg,
  },
  full: {
    flex: 1,
  },
});
