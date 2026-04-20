const express = require('express');
const dotenv = require('dotenv');
const creditoRoutes = require('./routes/creditoRoutes');
const db = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());

// Rutas
app.use('/api/creditos', creditoRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'microservicio-creditos' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Microservicio de Créditos ejecutándose en puerto ${PORT}`);
});