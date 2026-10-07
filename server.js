// Servidor estático para la demo (sin base de datos ni persistencia).
// Sirve ./public y responde /healthz. Todas las "consultas" las resuelve public/demo-api.js en el navegador.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`SAC demo escuchando en http://localhost:${PORT}`));
