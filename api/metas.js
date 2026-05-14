// api/metas.js — CRUD de metas de ahorro
import { ObjectId } from 'mongodb';
import { applyCors, getDb, requireAuth } from './_lib/db.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;

  const db = await getDb();
  const metas = db.collection('metas');
  const id = req.query.id;

  try {
    if (req.method === 'GET') {
      const lista = await metas.find({}).sort({ completada: 1, created_at: -1 }).toArray();
      return res.status(200).json({ metas: lista });
    }

    if (req.method === 'POST') {
      const { nombre, monto_objetivo, bolsillo_preferido, fecha_limite } = req.body || {};
      if (!nombre || !monto_objetivo) {
        return res.status(400).json({ error: 'Nombre y monto son requeridos' });
      }
      const doc = {
        nombre: String(nombre).trim(),
        monto_objetivo: Number(monto_objetivo),
        monto_actual: 0,
        bolsillo_preferido: bolsillo_preferido || 'Nu',
        fecha_limite: fecha_limite ? new Date(fecha_limite) : null,
        hitos_notificados: [],
        completada: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      const result = await metas.insertOne(doc);
      return res.status(201).json({ meta: { _id: result.insertedId, ...doc } });
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      const { nombre, monto_objetivo, bolsillo_preferido, fecha_limite } = req.body || {};
      const update = {
        updated_at: new Date()
      };
      if (nombre) update.nombre = String(nombre).trim();
      if (monto_objetivo) update.monto_objetivo = Number(monto_objetivo);
      if (bolsillo_preferido) update.bolsillo_preferido = bolsillo_preferido;
      if (fecha_limite !== undefined) update.fecha_limite = fecha_limite ? new Date(fecha_limite) : null;
      await metas.updateOne({ _id: new ObjectId(id) }, { $set: update });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      const _id = new ObjectId(id);
      await metas.deleteOne({ _id });
      await db.collection('depositos').deleteMany({ meta_id: id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
