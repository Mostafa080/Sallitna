// The admin team: who can open this dashboard. Add by phone (they must have used the app once), or remove.

import { useEffect, useState } from 'react';

import { formatDate } from '../format';
import { rpc, type Admin } from '../supabase';
import { text } from '../text';

export function AdminsPage({ me, notify }: { me: string; notify: (message: string) => void }) {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [phone, setPhone] = useState('');
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
      await rpc('admin_add_admin', { phone });
      setPhone('');
      notify(text.done);
      load();
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (admin: Admin) => {
    if (!window.confirm(text.confirmRemoveAdmin(admin.name ?? admin.phone ?? ''))) return;
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
          if (phone.replace(/\D/g, '').length >= 10) add();
        }}>
        <input
          className="input ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={text.addAdminPlaceholder}
          inputMode="tel"
        />
        <button className="btn" type="submit" disabled={busy || phone.replace(/\D/g, '').length < 10}>
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
                <th>{text.colPhone}</th>
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
                  <td className="ltr">{a.phone}</td>
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
