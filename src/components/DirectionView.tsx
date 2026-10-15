// Lays a screen out in a language's direction: Arabic right-to-left, English / Hindi left-to-right.
// Used where a helper sees the app in their own language (join steps, their list).

import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { LanguageKey } from '@/data/fakeHousehold';
import { LayoutDirectionContext } from '@/lib/direction';

export const directionOf = (language: LanguageKey) => (language === 'ar' ? 'rtl' : 'ltr');

export function DirectionView({
  language,
  style,
  children,
}: {
  language: LanguageKey;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const direction = directionOf(language);
  return (
    <LayoutDirectionContext.Provider value={direction}>
      <View style={[styles.flex, { direction }, style]}>{children}</View>
    </LayoutDirectionContext.Provider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
