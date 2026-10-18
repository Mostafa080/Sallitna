// Everyone who signed up, newest first: search, «new this week» / «blocked» filters, block / unblock / delete.

import { useEffect, useState } from 'react';

import { formatDate, formatNumber, isWithinDays } from '../format';
import { rpc, type AdminUser } from '../supabase';
import { text } from '../text';

type Filter = 'all' | 'new' | 'blocked';
const NEW_DAYS = 7;
const roleText = { owner: text.roleOwner, member: text.roleMember, helper: text.roleHelper };

export function UsersPage({ me, notify }: { me: string; notify: (message: string) => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setFailed(false);
    rpc<AdminUser[]>('admin_users')
      .then(setUsers)
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  const q = query.trim().toLowerCase();
  const shown = (users ?? []).filter((u) => {
    if (filter === 'new' && !isWithinDays(u.created_at, NEW_DAYS)) return false;
    if (filter === 'blocked' && !u.blocked) return false;
    if (!q) return true;
    return (u.name ?? '').toLowerCase().includes(q) || (u.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000');
  });

  const act = async (user: AdminUser, action: 'block' | 'unblock' | 'delete') => {
    const name = user.name ?? user.phone ?? text.noName;
    const question =
      action === 'block' ? text.confirmBlock(name) : action === 'unblock' ? text.confirmUnblock(name) : text.confirmDelete(name);
    if (!window.confirm(question)) return;
    setBusyId(user.id);
    try {
      if (action === 'delete') await rpc('admin_delete_user', { target: user.id });
      else await rpc('admin_set_blocked', { target: user.id, blocked: action === 'block' });
      notify(text.done);
      load();
    } catch (error) {
      notify(`${text.actionFailed}: ${(error as Error).message}`);
    } finally {
      setBusyId(null);
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: text.filterAll },
    { key: 'new', label: text.filterNew },
    { key: 'blocked', label: text.filterBlocked },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{text.navUsers}</h1>
          {users && <div className="muted">{text.usersCount(shown.length)}</div>}
        </div>
        <button className="btn ghost" onClick={load}>
          {text.refresh}
        </button>
      </div>

      <div className="toolbar">
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={text.searchPlaceholder} />
        {filters.map((f) => (
          <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {failed && <p className="error">{text.loadFailed}</p>}
      {!users && !failed && <p className="muted">{text.loading}</p>}

      {users && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>{text.colName}</th>
                <th>{text.colPhone}</th>
                <th>{text.colJoined}</th>
                <th>{text.colLastSeen}</th>
                <th>{text.colLists}</th>
                <th>{text.colItems}</th>
                <th>{text.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className={u.blocked ? 'is-blocked' : ''}>
                  <td>
                    {u.name ?? <span className="muted">{text.noName}</span>}
                    {isWithinDays(u.created_at, NEW_DAYS) && <span className="badge new">{text.badgeNew}</span>}
                    {u.blocked && <span className="badge blocked">{text.badgeBlocked}</span>}
                    {u.is_admin && <span className="badge admin">{text.badgeAdmin}</span>}
                    {u.id === me && <span className="muted"> {text.you}</span>}
                  </td>
                  <td className="ltr">{u.phone}</td>
                  <td>{formatDate(u.created_at)}</td>
                  <td>{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : <span className="muted">{text.never}</span>}</td>
                  <td>
                    {u.lists.length === 0 ? (
                      <span className="muted">{text.noLists}</span>
                    ) : (
                      u.lists.map((l, i) => (
                        <span className="list-pill" key={i}>
                          {l.name} · {roleText[l.role]}
                        </span>
                      ))
                    )}
                  </td>
                  <td>{formatNumber(u.items_added)}</td>
                  <td>
                    {u.id !== me && (
                      <div className="actions">
                        <button
                          className="btn ghost small"
                          disabled={busyId === u.id}
                          onClick={() => act(u, u.blocked ? 'unblock' : 'block')}>
                          {u.blocked ? text.unblock : text.block}
                        </button>
                        <button className="btn danger small" disabled={busyId === u.id} onClick={() => act(u, 'delete')}>
                          {text.remove}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="muted" style={{ padding: 'var(--space-lg)' }}>{text.noData}</p>}
        </div>
      )}
    </>
  );
}
