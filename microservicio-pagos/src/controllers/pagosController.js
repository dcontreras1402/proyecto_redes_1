// microservicio-pagos/src/controllers/pagosController.js
// ✅ CORRECCIONES:
// 1. El catch del bloque de cierre ya no es silencioso — logea el error
// 2. El servicio de pagos NO llama a /api/credito/usar; ese desconteo ya lo hace
//    microservicio-ordenes cuando crea la orden (POST /api/ordenes). Llamarlo 
//    de nuevo aquí provocaba doble descuento del cupo de crédito.
// 3. Se agrega /health para que HAProxy pueda hacer healthcheck

const { Router } = require('express');
const router = Router();
const pagosModel = require('../models/pagosModel');
const axios = require('axios');
const { verificarToken } = require('../middlewares/authMiddleware');

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.json({ servicio: 'Pagos', estado: 'OK' });
});

// ── POST /procesar ────────────────────────────────────────────────────────────
router.post('/procesar', verificarToken, async (req, res) => {
    try {
        const { id_orden, metodo_pago, monto } = req.body;
        const montoAbono = parseFloat(monto);

        // Obtiene la orden desde el microservicio de órdenes vía HAProxy
        const respuestaOrden = await axios.get(`http://haproxy/api/ordenes/info/${id_orden}`);
        const orden = respuestaOrden.data;
        const totalOrden = parseFloat(orden.total);

        if (orden.estado === 'pagada') {
            return res.status(400).json({ error: 'La orden ya está totalmente pagada' });
        }

        const pagosPrevios = await pagosModel.obtenerSumaPagosPorOrden(id_orden);
        const totalAcumulado = pagosPrevios + montoAbono;

        if (totalAcumulado > (totalOrden + 0.01)) {
            return res.status(400).json({
                error: 'El monto excede el saldo pendiente',
                total_orden: totalOrden,
                saldo_actual: totalOrden - pagosPrevios
            });
        }

        // Registra el abono
        const transaccion_id = 'TXN-' + Math.random().toString(36).slice(2, 11).toUpperCase();
        await pagosModel.registrarPago(id_orden, metodo_pago, montoAbono, transaccion_id, 'exitoso');

        let mensajeCierre = "Abono registrado con éxito";
        let estadoFinal = "pendiente";

        // Si el pago completa el total de la orden, marcarla como pagada
        if (Math.abs(totalAcumulado - totalOrden) < 0.01) {
            try {
                // ✅ CORREGIDO: Solo actualiza el estado de la orden.
                // El descuento de crédito ya ocurrió en microservicio-ordenes al crear la orden.
                await axios.put(`http://haproxy/api/ordenes/${id_orden}/estado`, { estado: 'pagada' });
                mensajeCierre = "Pago completado. Orden liquidada";
                estadoFinal = "pagada";
            } catch (error) {
                // ✅ CORREGIDO: el catch ya no es silencioso
                console.error(`[Pagos] Error al actualizar estado de orden ${id_orden}:`, error.message);
                // No lanzamos el error — el pago sí se registró correctamente
            }
        }

        res.status(201).json({
            mensaje: mensajeCierre,
            id_orden: id_orden,
            transaccion: transaccion_id,
            monto_total_orden: totalOrden,
            monto_abonado_ahora: montoAbono,
            total_pagado_acumulado: totalAcumulado,
            saldo_restante: Math.max(0, totalOrden - totalAcumulado),
            estado_orden: estadoFinal
        });

    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Fallo en comunicación con otros servicios',
                detalle: error.response.data
            });
        }
        res.status(500).json({ error: 'Error interno en Pagos', mensaje: error.message });
    }
});

// ── GET /estado-cuenta/:id_orden ──────────────────────────────────────────────
router.get('/estado-cuenta/:id_orden', verificarToken, async (req, res) => {
    try {
        const { id_orden } = req.params;
        const respuestaOrden = await axios.get(`http://haproxy/api/ordenes/info/${id_orden}`);
        const totalOrden = parseFloat(respuestaOrden.data.total);

        const historialPagos = await pagosModel.obtenerPagosPorOrden(id_orden);
        const totalPagado = historialPagos.reduce((acc, pago) => acc + parseFloat(pago.monto), 0);

        res.status(200).json({
            id_orden: id_orden,
            monto_total_orden: totalOrden,
            total_pagado_acumulado: totalPagado,
            saldo_restante: Math.max(0, totalOrden - totalPagado),
            estado_pago: totalPagado >= (totalOrden - 0.01) ? 'liquidada' : 'pendiente',
            detalles_transacciones: historialPagos
        });
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json({ error: 'La orden no existe' });
        }
        res.status(500).json({ error: 'Error al generar el estado de cuenta' });
    }
});

// ── GET /suma/:id ─────────────────────────────────────────────────────────────
router.get('/suma/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const total = await pagosModel.obtenerSumaPagosPorOrden(id);
        res.status(200).json({ total_pagado: total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;