// The admin team: who can open this dashboard. Add by email (they must have used the app once), or remove.

import { useEffect, useState } from 'react';

import { formatDate, isEmail } from '../format';
import { rpc, type Admin } from '../supabase';
import { text } from '../text';

export function AdminsPage({ me, notify }: { me: string; notify: (message: string) => void }) {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    rpc<Admin[]>('admin_list_admins')
      .then(setAdmins)
      .catch(() => notify(text.loadFailed));
  };
  useEffect(load, []);

  const add = async () => {
    setBusy(true);
    try {
      await rpc('admin_add_admin', { email });
      setEmail('');
      notify(text.done);
      load();
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (admin: Admin) => {
    if (!window.confirm(text.confirmRemoveAdmin(admin.name ?? admin.contact ?? ''))) return;
    try {
      await rpc('admin_remove_admin', { target: admin.user_id });
      notify(text.done);
      load();
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{text.navAdmins}</h1>
          <div className="muted">{text.adminsBody}</div>
        </div>
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (isEmail(email)) add();
        }}>
        <input
          className="input ltr"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          placeholder={text.addAdminPlaceholder}
          autoComplete="off"
        />
        <button className="btn" type="submit" disabled={busy || !isEmail(email)}>
          {text.addAdmin}
        </button>
      </form>

      {!admins && <p className="muted">{text.loading}</p>}
      {admins && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{text.colName}</th>
                <th>{text.colContact}</th>
                <th>{text.colAdminSince}</th>
                <th>{text.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.user_id}>
                  <td>
                    {a.name ?? <span className="muted">{text.noName}</span>}
                    {a.user_id === me && <span className="muted"> {text.you}</span>}
                  </td>
                  <td className="ltr">{a.contact}</td>
                  <td>{formatDate(a.added_at)}</td>
                  <td>
                    {a.user_id !== me && (
                      <div className="actions">
                        <button className="btn danger small" onClick={() => remove(a)}>
                          {text.removeAdmin}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
