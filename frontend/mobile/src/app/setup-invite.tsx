// Last step of starting a new household: the invite screen with progress dashes.
// A separate route so it can open as a full-screen step of sign-up (see _layout.tsx).

import InviteScreen from './invite';

export default function SetupInviteScreen() {
  return <InviteScreen setup />;
}
