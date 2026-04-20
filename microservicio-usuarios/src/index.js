const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Logger con Morgan
app.use(morgan('dev'));

// Rutas
app.use('/api/usuarios', require('./routes/usuarioRoutes'));

app.get('/', (req, res) => res.json({ mensaje: 'Microservicio de Usuarios activo' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log('\x1b[36m╔════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[36m║   Microservicio Usuarios - Buyza       ║\x1b[0m');
    console.log(`\x1b[36m║   Puerto: ${PORT}                          ║\x1b[0m`);
    console.log('\x1b[36m╚════════════════════════════════════════╝\x1b[0m');
    console.log('\x1b[90mEsperando peticiones...\x1b[0m\n');
});