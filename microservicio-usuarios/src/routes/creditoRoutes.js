const express = require('express');
const router = express.Router();
const {
  verCredito, usarCredito, pagarCuota,
  verHistorial, verCuotas, verCreditoAdmin, ajustarCupo
} = require('../controllers/creditoController');
const { verificarToken, soloAdmin } = require('../middlewares/authMiddleware');

// Comprador
router.get('/',          verificarToken, verCredito);
router.get('/mio',       verificarToken, verCredito);
router.get('/cuotas',    verificarToken, verCuotas);
router.get('/historial', verificarToken, verHistorial);
router.post('/pagar/:cuota_id', verificarToken, pagarCuota);

// Entre microservicios
router.post('/usar', usarCredito);

// Admin
router.get('/usuario/:id',          verificarToken, soloAdmin, verCreditoAdmin);
router.put('/usuario/:id/ajustar',  verificarToken, soloAdmin, ajustarCupo);

module.exports = router;
