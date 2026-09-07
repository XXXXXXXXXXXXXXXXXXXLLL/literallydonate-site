import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

// POST /api/appeal/submit
// body: { appealType: 'game' | 'server', robloxUsername, reason, evidence }
// Requires a valid session cookie. Posts a formatted embed to the staff
// review webhook (Roblox game appeals and Discord server appeals go to
// separate webhooks so staff aren't triaging both queues in one channel).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const cookies = parse(req.headers.cookie || '');
  let user;
  try {
    user = jwt.verify(cookies.ld_session, process.env.SESSION_SECRET);
  } catch {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { appealType, robloxUsername, reason, evidence } = req.body || {};

  if (!['game', 'server'].includes(appealType)) {
    return res.status(400).json({ error: 'Invalid appeal type' });
  }
  if (!reason || reason.trim().length < 20) {
    return res.status(400).json({ error: 'Reason must be at least 20 characters' });
  }
  if (appealType === 'game' && !robloxUsername) {
    return res.status(400).json({ error: 'Roblox username required for game appeals' });
  }

  const webhookUrl = appealType === 'game'
    ? process.env.GAME_APPEAL_WEBHOOK
    : process.env.SERVER_APPEAL_WEBHOOK;

  const embed = {
    title: appealType === 'game' ? 'New Game Ban Appeal' : 'New Discord Server Appeal',
    color: appealType === 'game' ? 0x9b5de5 : 0x2b2d31,
    fields: [
      { name: 'Discord', value: `<@${user.id}> (${user.username})`, inline: true },
      ...(robloxUsername ? [{ name: 'Roblox Username', value: robloxUsername, inline: true }] : []),
      { name: 'Reason', value: reason.slice(0, 1024) },
      ...(evidence ? [{ name: 'Evidence / Context', value: evidence.slice(0, 1024) }] : []),
    ],
    timestamp: new Date().toISOString(),
  };

  const webhookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!webhookRes.ok) {
    return res.status(502).json({ error: 'Failed to submit appeal, try again' });
  }

  res.status(200).json({ ok: true });
}
