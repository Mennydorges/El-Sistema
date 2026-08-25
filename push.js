/* ==========================================================
   SISTEMA · envío de avisos
   Lo ejecuta GitHub Actions. El turno se decide aquí,
   a partir de TURNO_MANUAL o de la hora del cron.
   ========================================================== */
const webpush = require('web-push');

const AVISOS = {
  manana: 'Es un nuevo día. Tus misiones diarias están disponibles de nuevo.',
  tarde:  'La mitad del día se ha ido. Revisa qué te falta.',
  noche:  'Recuerda marcar las diarias del día de hoy.'
};

const CRONES = {
  '30 11 * * *': 'manana',
  '0 19 * * *':  'tarde',
  '0 2 * * *':   'noche'
};

const turno = AVISOS[process.env.TURNO_MANUAL]
  ? process.env.TURNO_MANUAL
  : (CRONES[process.env.CRON] || 'noche');

const PUB  = (process.env.VAPID_PUBLIC  || '').trim();
const PRIV = (process.env.VAPID_PRIVATE || '').trim();
const SUB  = (process.env.PUSH_SUB      || '').trim();

// --- diagnóstico: dice qué falta sin enseñar el contenido ---
console.log('Turno: ' + turno);
console.log('VAPID_PUBLIC:  ' + (PUB  ? PUB.length + ' caracteres'  : 'VACÍO O NO EXISTE'));
console.log('VAPID_PRIVATE: ' + (PRIV ? PRIV.length + ' caracteres' : 'VACÍO O NO EXISTE'));
console.log('PUSH_SUB:      ' + (SUB  ? SUB.length + ' caracteres'  : 'VACÍO O NO EXISTE'));

const fallos = [];
if (!PUB)  fallos.push('Falta el secreto VAPID_PUBLIC.');
if (!PRIV) fallos.push('Falta el secreto VAPID_PRIVATE.');
if (!SUB)  fallos.push('Falta el secreto PUSH_SUB.');
if (PUB  && PUB.length  !== 87) fallos.push('VAPID_PUBLIC debería tener 87 caracteres y tiene ' + PUB.length + '.');
if (PRIV && PRIV.length !== 43) fallos.push('VAPID_PRIVATE debería tener 43 caracteres y tiene ' + PRIV.length + '.');

let sub = null;
if (SUB) {
  if (SUB[0] !== '{' || SUB[SUB.length - 1] !== '}') {
    fallos.push('PUSH_SUB no empieza por { o no termina por }. Se copió cortado.');
  } else {
    try {
      sub = JSON.parse(SUB);
      if (!sub.endpoint) fallos.push('PUSH_SUB no tiene endpoint.');
      else console.log('Destino: ' + sub.endpoint.slice(0, 42) + '...');
      if (!sub.keys || !sub.keys.p256dh || !sub.keys.auth) fallos.push('PUSH_SUB no trae las dos claves.');
    } catch (e) {
      fallos.push('PUSH_SUB no es un JSON válido: ' + e.message);
    }
  }
}

if (fallos.length) {
  console.error('\n--- PROBLEMAS ---');
  fallos.forEach(f => console.error('  · ' + f));
  process.exit(1);
}

webpush.setVapidDetails('mailto:sistema@localhost', PUB, PRIV);

webpush.sendNotification(sub, JSON.stringify({
  title: 'Sistema',
  body: AVISOS[turno],
  tag: 'sistema-' + turno
}))
  .then(() => console.log('\nEnviado correctamente (' + turno + ')'))
  .catch(err => {
    console.error('\n--- FALLO AL ENVIAR ---');
    console.error('Código: ' + (err.statusCode !== undefined ? err.statusCode : 'sin código'));
    console.error('Respuesta: ' + (err.body || err.message || err));
    if (err.statusCode === 403) console.error('Las claves VAPID no coinciden con las que usó el teléfono.');
    if (err.statusCode === 410 || err.statusCode === 404)
      console.error('La suscripción caducó: vuelve a activar las notificaciones y actualiza PUSH_SUB.');
    if (err.statusCode === 400) console.error('La suscripción está mal formada o incompleta.');
    process.exit(1);
  });
