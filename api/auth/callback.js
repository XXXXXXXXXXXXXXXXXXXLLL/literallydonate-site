import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';

// GET /api/auth/callback?code=...
// Exchanges the OAuth code for a token, pulls the user's identity,
// and drops a signed session cookie. Discord's token is not kept around.
export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) return res.redirect('/?error=discord_denied');
  if (!code) return res.status(400).send('Missing code');

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) return res.redirect('/?error=token_exchange_failed');
  const tokenData = await tokenRes.json();

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return res.redirect('/?error=identity_fetch_failed');
  const user = await userRes.json();

  const session = jwt.sign(
    {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
    },
    process.env.SESSION_SECRET,
    { expiresIn: '2h' }
  );

  res.setHeader('Set-Cookie', serialize('ld_session', session, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2,
  }));

  res.writeHead(302, { Location: '/appeal.html' });
  res.end();
}
