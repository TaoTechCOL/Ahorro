// api/check-reminders.js — Llamado por GitHub Actions
// Verifica inactividad (>=7 días) y envía resumen semanal los domingos.
// Protegido con CRON_SECRET (no requiere PIN porque lo llama el workflow).

import { getDb } from './_lib/db.js';
import { notifInactividad, notifResumenSemanal } from './_lib/mailer.js';

export default async function handler(req, res) {
  // Verificación de secreto del cron
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const tipo = req.query.tipo || 'inactividad';
  const db = await getDb();
  const metas = db.collection('metas');
  const depositos = db.collection('depositos');

  try {
    if (tipo === 'inactividad') {
      const dias = Number(process.env.DIAS_ALERTA_INACTIVIDAD || 7);
      const ultimoDep = await depositos.find({}).sort({ fecha: -1 }).limit(1).toArray();
      if (ultimoDep.length === 0) {
        return res.status(200).json({ ok: true, mensaje: 'Sin depósitos aún' });
      }
      const diasDesde = Math.floor(
        (Date.now() - new Date(ultimoDep[0].fecha).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diasDesde < dias) {
        return res.status(200).json({ ok: true, mensaje: `Solo ${diasDesde} días, sin alerta` });
      }
      // Para no spammear: solo notificamos cada N días
      const ultimaAlerta = await db.collection('config').findOne({ _id: 'ultima_alerta_inactividad' });
      if (ultimaAlerta) {
        const horasDesde = (Date.now() - new Date(ultimaAlerta.fecha).getTime()) / (1000 * 60 * 60);
        if (horasDesde < 48) {
          return res.status(200).json({ ok: true, mensaje: 'Alerta enviada recientemente' });
        }
      }
      const metasActivas = await metas.find({ completada: false }).toArray();
      if (metasActivas.length === 0) {
        return res.status(200).json({ ok: true, mensaje: 'Sin metas activas' });
      }
      await notifInactividad({ dias: diasDesde, metas: metasActivas });
      await db.collection('config').updateOne(
        { _id: 'ultima_alerta_inactividad' },
        { $set: { fecha: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true, enviada: true, dias: diasDesde });
    }

    if (tipo === 'semanal') {
      const desde = new Date();
      desde.setDate(desde.getDate() - 7);
      const depSemana = await depositos.find({ fecha: { $gte: desde } }).toArray();
      const metasActivas = await metas.find({ completada: false }).toArray();
      if (metasActivas.length === 0) {
        return res.status(200).json({ ok: true, mensaje: 'Sin metas activas' });
      }
      await notifResumenSemanal({ metas: metasActivas, depositosSemana: depSemana });
      return res.status(200).json({ ok: true, enviada: true, total_semana: depSemana.length });
    }

    return res.status(400).json({ error: 'tipo inválido (use inactividad o semanal)' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
