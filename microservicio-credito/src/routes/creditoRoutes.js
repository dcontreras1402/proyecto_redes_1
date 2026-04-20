const express = require('express');
const router = express.Router();
const creditoController = require('../controllers/creditoController');
const { verificarToken, soloAdmin, soloComprador } = require('../middlewares/authMiddleware');

// Rutas para compradores
router.get('/', verificarToken, soloComprador, creditoController.verCredito);
router.get('/mio', verificarToken, soloComprador, creditoController.verCredito);
router.get('/cuotas', verificarToken, soloComprador, creditoController.verCuotas);
router.get('/historial', verificarToken, soloComprador, creditoController.verHistorial);
router.post('/pagar/:cuota_id', verificarToken, soloComprador, creditoController.pagarCuota);

// Rutas entre microservicios (sin autenticación, solo para otros servicios internos)
router.post('/usar', creditoController.usarCredito);

// Rutas para administradores
router.get('/admin/usuario/:usuario_id', verificarToken, soloAdmin, creditoController.verCreditoAdmin);
router.put('/admin/usuario/:usuario_id/ajustar', verificarToken, soloAdmin, creditoController.ajustarCupo);

module.exports = router;