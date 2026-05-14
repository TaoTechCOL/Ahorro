// api/depositos.js — Registrar depósitos, dispara correos de confirmación e hitos
import { ObjectId } from 'mongodb';
import { applyCors, getDb, requireAuth } from './_lib/db.js';
import { notifDeposito, notifHito } from './_lib/mailer.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;

  const db = await getDb();
  const depositos = db.collection('depositos');
  const metas = db.collection('metas');

  try {
    if (req.method === 'GET') {
      const lista = await depositos.find({}).sort({ fecha: -1 }).limit(200).toArray();
      // Devolver meta_id como string para que el front lo compare con _id de meta
      const limpia = lista.map(d => ({ ...d, meta_id: String(d.meta_id) }));
      return res.status(200).json({ depositos: limpia });
    }

    if (req.method === 'POST') {
      const { meta_id, monto, bolsillo, nota } = req.body || {};
      if (!meta_id || !monto) {
        return res.status(400).json({ error: 'meta_id y monto requeridos' });
      }
      const meta = await metas.findOne({ _id: new ObjectId(meta_id) });
      if (!meta) return res.status(404).json({ error: 'Meta no encontrada' });

      const montoNum = Number(monto);
      const doc = {
        meta_id: String(meta_id),
        monto: montoNum,
        bolsillo: bolsillo || meta.bolsillo_preferido,
        nota: nota || '',
        fecha: new Date()
      };
      await depositos.insertOne(doc);

      // Actualizar monto_actual de la meta
      const nuevoTotal = (meta.monto_actual || 0) + montoNum;
      const pct = (nuevoTotal / meta.monto_objetivo) * 100;
      const completada = nuevoTotal >= meta.monto_objetivo;

      // Detectar hitos NO notificados aún
      const hitosPosibles = [25, 50, 75, 100];
      const yaNotificados = meta.hitos_notificados || [];
      const nuevosHitos = hitosPosibles.filter(h => pct >= h && !yaNotificados.includes(h));

      await metas.updateOne(
        { _id: meta._id },
        {
          $set: {
            monto_actual: nuevoTotal,
            updated_at: new Date(),
            completada,
            hitos_notificados: [...yaNotificados, ...nuevosHitos]
          }
        }
      );

      // Disparar correos en background (no bloquean la respuesta)
      const metaActualizada = { ...meta, monto_actual: nuevoTotal };

      // Confirmación de depósito
      notifDeposito({ meta: metaActualizada, monto: montoNum, bolsillo: doc.bolsillo, nota: doc.nota })
        .catch(e => console.error('Error notif depósito:', e.message));

      // Correos de hitos (uno por cada hito nuevo cruzado)
      for (const hito of nuevosHitos) {
        notifHito({ meta: metaActualizada, hito })
          .catch(e => console.error('Error notif hito:', e.message));
      }

      return res.status(201).json({ ok: true, hitos_alcanzados: nuevosHitos });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
