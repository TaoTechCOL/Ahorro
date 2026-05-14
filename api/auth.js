// api/auth.js — POST /api/auth { pin } -> { token }
import bcrypt from 'bcryptjs';
import { applyCors, signToken } from './_lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { pin } = req.body || {};
  if (!pin) return res.status(400).json({ error: 'PIN requerido' });

  const hash = process.env.PIN_HASH;
  if (!hash) {
    return res.status(500).json({ error: 'PIN_HASH no configurado en el servidor' });
  }

  const ok = await bcrypt.compare(String(pin), hash);
  if (!ok) {
    // Pequeño delay para frenar fuerza bruta
    await new Promise(r => setTimeout(r, 600));
    return res.status(401).json({ error: 'PIN incorrecto' });
  }

  const token = signToken({ sub: 'owner' });
  return res.status(200).json({ token });
}
