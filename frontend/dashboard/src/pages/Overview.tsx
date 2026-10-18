// The numbers at a glance: sign-ups, activity, lists, a 14-day sign-up chart and the most-added items.

import { useEffect, useState } from 'react';

import { formatDay, formatNumber } from '../format';
import { rpc, type Overview } from '../supabase';
import { text } from '../text';

export function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    rpc<Overview>('admin_overview')
      .then(setData)
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  const stats: { label: string; value: string; accent?: boolean }[] = data
    ? [
        { label: text.usersTotal, value: formatNumber(data.users_total) },
        { label: text.usersToday, value: formatNumber(data.users_today), accent: true },
        { label: text.usersWeek, value: formatNumber(data.users_week), accent: true },
        { label: text.usersMonth, value: formatNumber(data.users_month) },
        { label: text.activeWeek, value: formatNumber(data.active_week) },
        { label: text.blocked, value: formatNumber(data.users_blocked) },
        { label: text.listsActive, value: formatNumber(data.lists_active) },
        { label: text.listsWithHelper, value: formatNumber(data.lists_with_helper) },
        { label: text.helpers, value: formatNumber(data.helpers) },
        { label: text.itemsToday, value: formatNumber(data.items_today) },
        { label: text.itemsWeek, value: formatNumber(data.items_week) },
        { label: text.tripsWeek, value: formatNumber(data.trips_week) },
        { label: text.spentWeek, value: `${formatNumber(Number(data.spent_week))} ${text.currency}` },
      ]
    : [];
  const maxSignups = Math.max(1, ...(data?.signups_by_day.map((d) => d.count) ?? [1]));

  return (
    <>
      <div className="page-head">
        <h1>{text.navOverview}</h1>
        <button className="btn ghost" onClick={load}>
          {text.refresh}
        </button>
      </div>

      {failed && <p className="error">{text.loadFailed}</p>}
      {!data && !failed && <p className="muted">{text.loading}</p>}

      {data && (
        <>
          <div className="stats">
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <div className={`stat-value ${s.accent ? 'accent' : ''}`}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="two-col">
            <div className="card">
              <h2>{text.signupsChart}</h2>
              <div className="bars" role="img" aria-label={text.signupsChart}>
                {data.signups_by_day.map((d) => (
                  <div className="bar-col" key={d.day} title={`${formatDay(d.day)}: ${d.count}`}>
                    {d.count > 0 && <span className="bar-count">{d.count}</span>}
                    <div className={`bar ${d.count === 0 ? 'zero' : ''}`} style={{ height: `${(d.count / maxSignups) * 85}%` }} />
                    <span className="bar-label">{formatDay(d.day)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2>{text.topItems}</h2>
              {data.top_items.length === 0 ? (
                <p className="muted">{text.noData}</p>
              ) : (
                <ul className="top-list">
                  {data.top_items.map((item) => (
                    <li key={item.name}>
                      <span>{item.name}</span>
                      <span className="muted">{formatNumber(item.count)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
