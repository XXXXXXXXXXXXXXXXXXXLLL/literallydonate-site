// GET /api/auth/discord
// Redirects the user into Discord's OAuth2 consent screen.
export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI, // e.g. https://appeals.literallydonate.com/api/auth/callback
    response_type: 'code',
    scope: 'identify',
    prompt: 'consent',
  });

  res.writeHead(302, { Location: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
  res.end();
}
