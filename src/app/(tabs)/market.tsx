// «بالسوق» tab — before a trip: where am I going? «ابدأ التسوق».
// During my trip: the live shopping screen.

import { ShopView } from '@/components/shop/ShopView';
import { StartTripView } from '@/components/shop/StartTripView';
import { useList } from '@/store/ListStore';

export default function MarketTab() {
  const list = useList();
  return list.trip ? <ShopView /> : <StartTripView />;
}
