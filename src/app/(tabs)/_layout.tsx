// The three tabs, using Apple's native tab bar (Liquid Glass on iOS 26):
// «قوايمي» (the open list) · «بالسوق» (start / follow a shopping trip) · «حسابي».
// Hidden until someone is signed in with a list (welcome and sign-up open over it).

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/i18n';
import { TabBarProvider } from '@/lib/tabBar';
import { useList } from '@/store/ListStore';
import { colors, fonts, fontSize } from '@/theme';

export default function TabsLayout() {
  const list = useList();
  const ready = list.mode === 'live' || list.mode === 'demo';
  // Someone in the family is shopping right now (me included) → a dot on «بالسوق»
  const shopping = !!list.currentShopperId;

  return (
    <TabBarProvider>
      {(sheetOpen) => (
        <NativeTabs
          hidden={!ready || sheetOpen}
          tintColor={colors.accent}
          badgeBackgroundColor={colors.accent}
          minimizeBehavior="onScrollDown"
          // App font on the labels: medium, semibold when selected
          labelStyle={{
            default: { fontFamily: fonts.medium, fontSize: fontSize.caption, color: colors.ink },
            selected: { fontFamily: fonts.semibold, fontSize: fontSize.caption, color: colors.accent },
          }}
          // Right-to-left: «قوايمي» on the right, «حسابي» on the left — also in Expo Go
          unstable_nativeProps={{ direction: 'rtl' }}>
          <NativeTabs.Trigger name="index">
            <NativeTabs.Trigger.Label>{t('tabs.list')}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} md="list" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="market">
            <NativeTabs.Trigger.Label>{t('tabs.market')}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'cart', selected: 'cart.fill' }} md="shopping_cart" />
            {shopping && <NativeTabs.Trigger.Badge> </NativeTabs.Trigger.Badge>}
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="account">
            <NativeTabs.Trigger.Label>{t('tabs.account')}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
              md="person"
            />
          </NativeTabs.Trigger>
        </NativeTabs>
      )}
    </TabBarProvider>
  );
}
