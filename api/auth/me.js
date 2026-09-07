import { parse } from 'cookie';
import jwt from 'jsonwebtoken';

// GET /api/auth/me
// Reads the session cookie and returns the logged-in Discord identity, or null.
export default function handler(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const session = cookies.ld_session;

  if (!session) return res.status(200).json({ user: null });

  try {
    const user = jwt.verify(session, process.env.SESSION_SECRET);
    res.status(200).json({ user });
  } catch {
    res.status(200).json({ user: null });
  }
}
