// «بالسوق» tab — before a trip: where am I going? «ابدأ التسوق».
// During my trip: the live shopping screen.

import { Redirect } from 'expo-router';

import { ShopView } from '@/components/shop/ShopView';
import { StartTripView } from '@/components/shop/StartTripView';
import { useList } from '@/store/ListStore';

export default function MarketTab() {
  const list = useList();
  // A helper has their own screen on «قوايمي», never the family tabs
  if (list.isHelper) return <Redirect href="/" />;
  return list.trip ? <ShopView /> : <StartTripView />;
}
