// Lets a tab screen hide the tab bar for a moment (e.g. while one of its bottom sheets is open,
// so the floating bar doesn't cover the sheet's buttons).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const TabBarContext = createContext<{ hidden: boolean; setHidden: (hidden: boolean) => void }>({
  hidden: false,
  setHidden: () => {},
});

export function TabBarProvider({ children }: { children: (hidden: boolean) => ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return <TabBarContext.Provider value={{ hidden, setHidden }}>{children(hidden)}</TabBarContext.Provider>;
}

// Hide the tab bar while `hide` is true
export function useHideTabBar(hide: boolean) {
  const { setHidden } = useContext(TabBarContext);
  useEffect(() => {
    setHidden(hide);
    return () => setHidden(false);
  }, [hide, setHidden]);
}
