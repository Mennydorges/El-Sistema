/* ==========================================================
   SISTEMA · avisos
   ==========================================================
   PARA AÑADIR, QUITAR O CAMBIAR UN AVISO, EDITA SOLO LA LISTA
   DE AQUÍ ABAJO. No hace falta tocar ningún otro archivo.

   Formato de cada línea:
       hora: ['Título corto', 'Texto completo del aviso'],

   La hora es en hora de Ecuador, de 0 a 23, sin minutos.
   Ejemplos:  6 = 6 de la mañana   14 = 2 de la tarde   21 = 9 de la noche

   El TÍTULO sale en negrita y es UNA SOLA LÍNEA: si es largo se corta.
   Déjalo en tres o cuatro palabras.
   El TEXTO sale debajo, admite varias líneas y no se corta.

   Para AÑADIR un aviso: copia una línea y cámbiale la hora y los textos.
   Para QUITAR un aviso: borra su línea entera.
   Para CAMBIAR la hora: cambia el número del principio.

   Cuidado: cada línea acaba en coma, menos la última.
   Si un texto lleva un apóstrofo, escríbelo así: \'
   ========================================================== */

const AVISOS = {
  6:  ['Notificación', '¡Es un nuevo día! Tus misiones diarias vuelven a estar disponibles.'],
  15: ['Notificación', 'El día ha terminado. Aún puedes completar tus misiones diarias.'],
  21: ['Notificación', 'No olvides registrar las misiones que completaste hoy.']
};

/* ==========================================================
   De aquí para abajo no hace falta tocar nada.
   ========================================================== */
// Hora de Ecuador (UTC-5, sin cambios de horario)
const ahora = new Date();
const horaEc = (ahora.getUTCHours() + 24 - 5) % 24;

// Si se lanza a mano se puede forzar una hora concreta
const forzada = (process.env.HORA_MANUAL || '').trim();
const hora = forzada !== '' ? parseInt(forzada, 10) : horaEc;

console.log('Hora en Ecuador: ' + horaEc + ':00' + (forzada !== '' ? '  ·  forzada a las ' + hora : ''));

// GitHub se retrasa: un aviso de las 6 puede ejecutarse a las 7.
// Por eso cada aviso vale para su hora y la siguiente. La etiqueta es
// la misma, así que si se repitiera, la segunda sustituye a la primera.
let hAviso = null;
if (AVISOS[hora]) hAviso = hora;
else if (AVISOS[(hora + 23) % 24]) hAviso = (hora + 23) % 24;

const aviso = hAviso !== null ? AVISOS[hAviso] : null;
if (!aviso) {
  console.log('No hay ningún aviso para esta hora. Nada que enviar.');
  process.exit(0);
}
if (hAviso !== hora) console.log('Recuperando el aviso de las ' + hAviso + ':00 (llegó tarde).');
// Admite ['título','texto'] o un texto suelto
const titulo = Array.isArray(aviso) ? aviso[0] : 'Sistema';
const texto  = Array.isArray(aviso) ? (aviso[1] || '') : aviso;
console.log('Título: ' + titulo);
console.log('Texto:  ' + texto);

const webpush = require('web-push');

const PUB  = (process.env.VAPID_PUBLIC  || '').trim();
const PRIV = (process.env.VAPID_PRIVATE || '').trim();
const SUB  = (process.env.PUSH_SUB      || '').trim();

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

// Apple valida el remitente: mailto con dominio real o URL https
const SUBJ = (process.env.VAPID_SUB || '').trim() || 'mailto:sistema@sistema.app';
webpush.setVapidDetails(SUBJ, PUB, PRIV);

webpush.sendNotification(sub, JSON.stringify({
  title: titulo,
  body: texto,
  tag: 'sistema-' + hAviso
}))
  .then(() => console.log('\nEnviado correctamente.'))
  .catch(err => {
    console.error('\n--- FALLO AL ENVIAR ---');
    console.error('Código: ' + (err.statusCode !== undefined ? err.statusCode : 'sin código'));
    console.error('Respuesta: ' + (err.body || err.message || err));
    if (err.statusCode === 403) console.error('Apple rechazó la firma: revisa las claves VAPID.');
    if (err.statusCode === 410 || err.statusCode === 404)
      console.error('La suscripción caducó: vuelve a activar las notificaciones y actualiza PUSH_SUB.');
    if (err.statusCode === 400) console.error('La suscripción está mal formada o incompleta.');
    process.exit(1);
  });
