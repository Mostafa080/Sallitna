// Sign in → check the admin list → the dashboard (overview · users · admins).

import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { BrandMark } from './BrandMark';
import { AdminsPage } from './pages/Admins';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { ProductsPage } from './pages/Products';
import { UsersPage } from './pages/Users';
import { rpc, supabase } from './supabase';
import { text } from './text';

type Page = 'overview' | 'users' | 'products' | 'admins';

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState<Page>('overview');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsAdmin(undefined);
    if (!session) return;
    rpc<boolean>('admin_me')
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [session?.user.id]);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const signOut = () => supabase.auth.signOut();

  if (session === undefined || (session && isAdmin === undefined)) {
    return <div className="center-page muted">{text.loading}</div>;
  }
  if (!session) return <LoginPage />;
  if (!isAdmin) {
    return (
      <div className="center-page">
        <div className="login card">
          <h1>{text.notAdmin}</h1>
          <p className="muted">{text.notAdminBody}</p>
          <button className="btn ghost" onClick={signOut}>
            {text.signOut}
          </button>
        </div>
      </div>
    );
  }

  const nav: { key: Page; label: string }[] = [
    { key: 'overview', label: text.navOverview },
    { key: 'users', label: text.navUsers },
    { key: 'products', label: text.navProducts },
    { key: 'admins', label: text.navAdmins },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          {text.appName}
        </div>
        {nav.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}>
            {item.label}
          </button>
        ))}
        <div className="sidebar-footer">
          <button className="nav-item" onClick={signOut}>
            {text.signOut}
          </button>
        </div>
      </aside>
      <main className="main">
        {page === 'overview' && <OverviewPage />}
        {page === 'users' && <UsersPage me={session.user.id} notify={notify} />}
        {page === 'products' && <ProductsPage notify={notify} />}
        {page === 'admins' && <AdminsPage me={session.user.id} notify={notify} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
