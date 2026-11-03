import { createHash, timingSafeEqual } from 'node:crypto';
import { list, put } from '@vercel/blob';
import { merge, validate } from '../js/pricing-settings.js';

const PATHNAME = 'pricing.json';
const digest = (s) => createHash('sha256').update(String(s)).digest();

async function readPublished() {
  const { blobs } = await list({ prefix: PATHNAME, limit: 1 });
  if (!blobs.length) return null;
  const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
  return res.ok ? res.json() : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ settings: await readPublished() });
    }
    if (req.method === 'PUT') {
      const expected = process.env.PRICING_EDIT_PASSWORD;
      if (!expected) return res.status(500).json({ error: 'Publishing is not set up on the server.' });
      const given = req.headers['x-edit-password'] || '';
      if (!timingSafeEqual(digest(given), digest(expected))) {
        await new Promise((r) => setTimeout(r, 800)); // slow down guessing
        return res.status(401).json({ error: 'Wrong edit password.' });
      }
      const settings = merge(req.body && req.body.settings);
      const error = validate(settings);
      if (error) return res.status(400).json({ error });
      await put(PATHNAME, JSON.stringify(settings), {
        access: 'public', allowOverwrite: true, addRandomSuffix: false,
        contentType: 'application/json', cacheControlMaxAge: 0,
      });
      return res.status(200).json({ ok: true, settings });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    console.error('pricing api failed', err);
    return res.status(500).json({ error: 'Could not reach the pricing store. Try again.' });
  }
}
