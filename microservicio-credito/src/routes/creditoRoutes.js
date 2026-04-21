const express = require('express');
const router = express.Router();
const creditoController = require('../controllers/creditoController');
const { verificarToken, soloAdmin, soloComprador } = require('../middlewares/authMiddleware');

// 1. RUTAS ESTÁTICAS (Deben ir PRIMERO)
router.get('/mio', verificarToken, soloComprador, creditoController.verCredito);
router.get('/cuotas', verificarToken, soloComprador, creditoController.verCuotas);
router.get('/historial', verificarToken, soloComprador, creditoController.verHistorial);

// 2. RUTAS CON PARÁMETROS DINÁMICOS
router.post('/pagar/:cuota_id', verificarToken, soloComprador, creditoController.pagarCuota);
router.get('/admin/usuario/:usuario_id', verificarToken, soloAdmin, creditoController.verCreditoAdmin);
router.put('/admin/usuario/:usuario_id/ajustar', verificarToken, soloAdmin, creditoController.ajustarCupo);

// 3. RUTAS ENTRE MICROSERVICIOS
router.post('/usar', creditoController.usarCredito);

// 4. RUTA GENÉRICA (Al final)
router.get('/', verificarToken, soloComprador, creditoController.verCredito);

module.exports = router;