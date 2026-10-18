// Demo only: the family's phone sees the list as Rahul (test menu → «شوف القائمة كأنك Rahul»).
// A real helper who signs in gets the same screen as their home (see app/(tabs)/index.tsx).

import { useRouter } from 'expo-router';

import { HelperHome } from '@/components/helper/HelperHome';
import { useList } from '@/store/ListStore';

export default function HelperDemoScreen() {
  const router = useRouter();
  const list = useList();
  const helper = list.members.find((m) => m.role === 'helper');
  if (!helper) return null;
  return <HelperHome helper={helper} live={false} onExit={() => router.back()} />;
}
