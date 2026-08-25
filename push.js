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

const PUB  = process.env.VAPID_PUBLIC;
const PRIV = process.env.VAPID_PRIVATE;
const SUB  = process.env.PUSH_SUB;
if (!PUB || !PRIV || !SUB) {
  console.error('Faltan claves. Revisa los secretos del repositorio.');
  process.exit(1);
}

webpush.setVapidDetails('mailto:sistema@localhost', PUB, PRIV);

webpush.sendNotification(JSON.parse(SUB), JSON.stringify({
  title: 'Sistema',
  body: AVISOS[turno],
  tag: 'sistema-' + turno
}))
  .then(() => console.log('Enviado (' + turno + ')'))
  .catch(err => {
    console.error('Error ' + err.statusCode + ': ' + err.body);
    process.exit(1);
  });
