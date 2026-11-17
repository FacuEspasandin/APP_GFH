// Sólo para web: el cockpit sin conexión corre el motor clínico en el dispositivo, y eso
// obliga a meter el motor y la tabla de reglas de interacción en el bundle. En web no
// hace falta (siempre hay red, y el cálculo vive en el servidor), así que se reemplaza
// por esto y el navegador nunca recibe el motor ni las reglas. No afecta a iOS ni Android.
async function guardarContextoOffline() {}
async function leerContextoOffline() {
  return null;
}
async function calcularCockpitOffline() {
  return null;
}

module.exports = { guardarContextoOffline, leerContextoOffline, calcularCockpitOffline };
