// api/_lib/mailer.js
// Envío de correo vía Gmail con App Password (Nodemailer).

import nodemailer from 'nodemailer';

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  return cachedTransport;
}

const formatCOP = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n || 0);

// Plantilla base — sobria, alineada con la estética del frontend
function wrapHtml(title, body) {
  return `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4ede0;font-family:Georgia,serif;color:#1f1a14;">
  <div style="max-width:560px;margin:0 auto;padding:40px 30px;">
    <table width="100%" style="border-bottom:1px solid #d6c8af;padding-bottom:16px;margin-bottom:24px;">
      <tr>
        <td>
          <div style="width:42px;height:42px;border:2px solid #1f1a14;border-radius:50%;text-align:center;line-height:38px;font-size:20px;font-weight:600;">道</div>
        </td>
        <td style="text-align:right;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5c5346;">
          Tao · Ahorro
        </td>
      </tr>
    </table>
    <h1 style="font-size:28px;font-weight:400;margin:0 0 16px 0;letter-spacing:-0.5px;">${title}</h1>
    ${body}
    <p style="margin-top:40px;padding-top:20px;border-top:1px solid #d6c8af;font-size:11px;color:#5c5346;font-style:italic;text-align:center;">
      "Gota a gota se labra la piedra."<br>
      <span style="font-family:monospace;letter-spacing:1px;">TaoTech · Tao Ahorro</span>
    </p>
  </div>
</body></html>`;
}

export async function enviarCorreo({ subject, html, to }) {
  const destinatario = to || process.env.EMAIL_DESTINO;
  if (!destinatario) {
    console.warn('No hay destinatario configurado');
    return;
  }
  await getTransport().sendMail({
    from: `"Tao Ahorro" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject,
    html
  });
}

// === PLANTILLAS DE NOTIFICACIONES ===

export async function notifDeposito({ meta, monto, bolsillo, nota }) {
  const pct = (meta.monto_actual / meta.monto_objetivo * 100).toFixed(1);
  const restante = Math.max(0, meta.monto_objetivo - meta.monto_actual);
  const body = `
    <p style="font-size:15px;line-height:1.6;">Acabas de depositar <strong style="color:#b14a2c;">${formatCOP(monto)}</strong> en <strong>${meta.nombre}</strong>.</p>
    <table width="100%" style="background:#ebe0cc;border:1px solid #d6c8af;padding:20px;margin:20px 0;">
      <tr><td style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#5c5346;">Progreso actual</td></tr>
      <tr><td style="font-size:32px;font-weight:600;padding:8px 0;">${formatCOP(meta.monto_actual)}</td></tr>
      <tr><td style="font-size:13px;color:#5c5346;">de ${formatCOP(meta.monto_objetivo)} · ${pct}% completado</td></tr>
      <tr><td style="font-size:13px;color:#5c5346;padding-top:8px;">Te faltan <strong>${formatCOP(restante)}</strong></td></tr>
    </table>
    <p style="font-size:13px;color:#5c5346;">Bolsillo: <strong>${bolsillo}</strong>${nota ? ` · ${nota}` : ''}</p>
  `;
  await enviarCorreo({
    subject: `+${formatCOP(monto)} en ${meta.nombre}`,
    html: wrapHtml('Depósito registrado', body)
  });
}

export async function notifHito({ meta, hito }) {
  const mensajes = {
    25: { titulo: 'Un cuarto del camino', frase: 'El comienzo más difícil ya está superado.' },
    50: { titulo: 'A mitad de camino', frase: 'La constancia se ha convertido en hábito.' },
    75: { titulo: 'Tres cuartos completos', frase: 'La meta está al alcance de la mano.' },
    100: { titulo: '¡Meta completada!', frase: 'Has demostrado que sabes el camino.' }
  };
  const m = mensajes[hito] || mensajes[50];
  const body = `
    <p style="font-size:16px;font-style:italic;line-height:1.6;color:#5c5346;">"${m.frase}"</p>
    <div style="text-align:center;margin:30px 0;padding:30px;background:#ebe0cc;border:1px solid #d6c8af;">
      <div style="font-size:56px;font-weight:600;color:#b14a2c;line-height:1;">${hito}%</div>
      <p style="margin:8px 0 0 0;font-size:14px;letter-spacing:2px;text-transform:uppercase;">${meta.nombre}</p>
    </div>
    <p style="font-size:14px;">Ahorrado: <strong>${formatCOP(meta.monto_actual)}</strong> de ${formatCOP(meta.monto_objetivo)}</p>
  `;
  await enviarCorreo({
    subject: `🎯 ${hito}% en ${meta.nombre}`,
    html: wrapHtml(m.titulo, body)
  });
}

export async function notifInactividad({ dias, metas }) {
  const lista = metas.map(m => {
    const pct = ((m.monto_actual / m.monto_objetivo) * 100).toFixed(0);
    return `<li style="margin-bottom:8px;"><strong>${m.nombre}</strong> · ${formatCOP(m.monto_actual)} / ${formatCOP(m.monto_objetivo)} (${pct}%)</li>`;
  }).join('');
  const body = `
    <p style="font-size:15px;line-height:1.6;">Han pasado <strong>${dias} días</strong> sin que registres un ahorro. El agua que no fluye, se estanca.</p>
    <p style="font-size:14px;color:#5c5346;margin-top:20px;"><strong>Tus metas activas esperan:</strong></p>
    <ul style="font-size:14px;line-height:1.8;">${lista}</ul>
    <p style="font-size:13px;color:#5c5346;font-style:italic;margin-top:20px;">No tiene que ser mucho. Un pequeño paso es suficiente.</p>
  `;
  await enviarCorreo({
    subject: `${dias} días sin ahorrar`,
    html: wrapHtml('Un recordatorio amable', body)
  });
}

export async function notifResumenSemanal({ metas, depositosSemana }) {
  const totalSemana = depositosSemana.reduce((s, d) => s + d.monto, 0);
  const lista = metas.map(m => {
    const pct = ((m.monto_actual / m.monto_objetivo) * 100).toFixed(0);
    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #d6c8af;">
          <strong>${m.nombre}</strong><br>
          <span style="font-size:12px;color:#5c5346;font-family:monospace;">${formatCOP(m.monto_actual)} / ${formatCOP(m.monto_objetivo)} · ${pct}%</span>
        </td>
      </tr>`;
  }).join('');
  const body = `
    <p style="font-size:15px;">Esta semana ahorraste <strong style="color:#b14a2c;font-size:18px;">${formatCOP(totalSemana)}</strong> en <strong>${depositosSemana.length}</strong> ${depositosSemana.length === 1 ? 'depósito' : 'depósitos'}.</p>
    <table width="100%" style="margin:20px 0;border-top:1px solid #d6c8af;">${lista}</table>
    <p style="font-size:13px;color:#5c5346;font-style:italic;margin-top:20px;">"El camino se hace andando."</p>
  `;
  await enviarCorreo({
    subject: `Resumen semanal · ${formatCOP(totalSemana)} ahorrados`,
    html: wrapHtml('Tu semana en cifras', body)
  });
}
