/* ==========================================================
   SISTEMA · envío de avisos
   Lo ejecuta GitHub Actions. Recibe el turno por argumento:
   node push.js manana | tarde | noche
   ========================================================== */
const webpush = require('web-push');

const AVISOS = {
  manana: {
    title: 'Sistema',
    body: 'Es un nuevo día. Tus misiones diarias están disponibles de nuevo.'
  },
  tarde: {
    title: 'Sistema',
    body: 'La mitad del día se ha ido. Revisa qué te falta.'
  },
  noche: {
    title: 'Sistema',
    body: 'Recuerda marcar las diarias del día de hoy.'
  }
};

const turno = process.argv[2];
const aviso = AVISOS[turno];
if (!aviso) { console.error('Turno desconocido: ' + turno); process.exit(1); }

const PUB = process.env.VAPID_PUBLIC;
const PRIV = process.env.VAPID_PRIVATE;
const SUB = process.env.PUSH_SUB;
if (!PUB || !PRIV || !SUB) { console.error('Faltan las claves.'); process.exit(1); }

webpush.setVapidDetails('mailto:sistema@localhost', PUB, PRIV);

const sub = JSON.parse(SUB);
webpush.sendNotification(sub, JSON.stringify({
  title: aviso.title,
  body: aviso.body,
  tag: 'sistema-' + turno
}))
  .then(() => console.log('Enviado: ' + turno))
  .catch(err => {
    console.error('Error ' + err.statusCode + ': ' + err.body);
    process.exit(1);
  });
