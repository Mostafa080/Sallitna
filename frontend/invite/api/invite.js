// GET /api/invite?code=YAN9WHHT — what the invite page shows about a code: the list's name, who invited,
// who the list is for, how many are in it. Asks Supabase with the PUBLIC key (the same one inside the app),
// kept in this Vercel project's settings, not in the page. Only the few details below come back.

const CODE = /^[A-Z0-9]{4,12}$/;
const KINDS = ['family', 'friends', 'work', 'other'];

module.exports = async function handler(req, res) {
  const code = String(req.query.code ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!CODE.test(code)) return res.status(400).json({ found: false });

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!url || !key) return res.status(500).json({ found: false });

  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_invite`, {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code }),
    });
    if (!response.ok) return res.status(502).json({ found: false });
    const [row] = await response.json();
    if (!row) return res.status(404).json({ found: false });

    // A code's details change rarely: browsers and Vercel may keep the answer for a minute
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    return res.status(200).json({
      found: true,
      list: row.household_name,
      inviter: row.inviter_name,
      inviterGender: row.inviter_gender === 'm' ? 'm' : 'f',
      memberCount: row.member_count,
      members: (row.members ?? []).slice(0, 5).map((m) => ({ initial: m.initial, color: m.color })),
      expired: Boolean(row.expired),
      helper: row.role === 'helper',
      kind: KINDS.includes(row.kind) ? row.kind : 'family',
    });
  } catch {
    return res.status(502).json({ found: false });
  }
};
