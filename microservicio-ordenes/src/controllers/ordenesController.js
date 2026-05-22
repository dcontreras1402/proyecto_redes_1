const { Router } = require('express');
const router = Router();
const ordenesModel = require('../models/ordenesModel');
const axios = require('axios');
const { verificarToken } = require('../middlewares/authMiddleware');

// ✅ CORREGIDO: usar haproxy como gateway, no nombres DNS internos
const CATALOGO_URL = 'http://haproxy/api/catalogo';
const CREDITO_URL  = 'http://credito:3005/api/credito';

// ✅ CORREGIDO: /crear ahora también descuenta crédito
router.post('/crear', verificarToken, async (req, res) => {
    try {
        const id_comprador = req.usuario.id; console.log('>>> CREDITO_URL:', CREDITO_URL);
        const { id_producto, cuotas } = req.body;

        if (!id_producto) {
            return res.status(400).json({ error: 'ID de producto requerido' });
        }

        let prodInfo;
        try {
            const resp = await axios.get(`${CATALOGO_URL}/${id_producto}`);
            prodInfo = resp.data;
        } catch (err) {
            return res.status(404).json({ error: `Producto ${id_producto} no encontrado` });
        }

        if (prodInfo.cantidad < 1) {
            return res.status(400).json({ error: `Stock insuficiente para: ${prodInfo.nombre}` });
        }

        const totalCalculado = parseFloat(prodInfo.precio);

        // ✅ Descontar crédito antes de crear la orden
        const id_orden = await ordenesModel.crearOrden(id_comprador, totalCalculado, [{
            id_producto,
            cantidad: 1,
            precio: prodInfo.precio
        }]);

        try {
            console.log('>>> LLAMANDO A CREDITO /usar'); const creditoResp = await axios.post(`${CREDITO_URL}/usar`, {
                usuario_id: id_comprador,
                monto: totalCalculado,
                cuotas: cuotas || 1,
                compra_id: id_orden
            }); console.log(">>> CREDITO RESP:", creditoResp.data);
        } catch (err) {
            console.log(">>> CREDITO ERROR:", err.response?.data || err.message); // Si falla el crédito, cancelar la orden
            await ordenesModel.actualizarEstadoOrden(id_orden, 'cancelada');
            const msg = err.response?.data?.error || 'Cupo de crédito insuficiente';
            return res.status(err.response?.status || 400).json({ error: msg });
        }

        // Reducir stock
        await axios.put(`${CATALOGO_URL}/${id_producto}/reducir-stock`, { cantidad_comprada: 1 });

        res.status(201).json({
            id_orden,
            total: totalCalculado.toFixed(2),
            producto: prodInfo.nombre
        });

    } catch (error) {
        res.status(500).json({ error: 'Error interno en órdenes', detalle: error.message });
    }
});

router.post('/', verificarToken, async (req, res) => {
    try {
        const id_comprador = req.usuario.id; console.log('>>> CREDITO_URL:', CREDITO_URL);
        const { productos, cuotas } = req.body;
        let totalCalculado = 0;
        const productosValidados = [];

        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: 'La orden debe tener productos' });
        }

        for (const item of productos) {
            try {
                const resp = await axios.get(`${CATALOGO_URL}/${item.id_producto}`);
                const prodInfo = resp.data;
                if (prodInfo.cantidad < item.cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente para: ${prodInfo.nombre}` });
                }
                totalCalculado += parseFloat(prodInfo.precio) * item.cantidad;
                productosValidados.push({ id_producto: item.id_producto, cantidad: item.cantidad, precio: prodInfo.precio });
            } catch (err) {
                return res.status(404).json({ error: `Producto ${item.id_producto} no encontrado` });
            }
        }

        const id_orden = await ordenesModel.crearOrden(id_comprador, totalCalculado, productosValidados);

        try {
            console.log('>>> LLAMANDO A CREDITO /usar'); const creditoResp = await axios.post(`${CREDITO_URL}/usar`, {
                usuario_id: id_comprador,
                monto: totalCalculado,
                cuotas: cuotas || 1,
                compra_id: id_orden
            });
        } catch (err) {
            await ordenesModel.actualizarEstadoOrden(id_orden, 'cancelada');
            const msg = err.response?.data?.error || 'Error al procesar el crédito';
            return res.status(err.response?.status || 400).json({ error: msg });
        }

        for (const item of productosValidados) {
            await axios.put(`${CATALOGO_URL}/${item.id_producto}/reducir-stock`, { cantidad_comprada: item.cantidad });
        }

        res.status(201).json({ mensaje: 'Compra exitosa con crédito', id_orden, total: totalCalculado.toFixed(2) });

    } catch (error) {
        res.status(500).json({ error: 'Error interno en órdenes', detalle: error.message });
    }
});

router.get('/usuario/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const ordenes = await ordenesModel.obtenerOrdenesPorUsuario(id);
        res.status(200).json(ordenes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/info/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const orden = await ordenesModel.obtenerOrdenPorId(id);
        if (!orden) return res.status(404).json({ error: 'No encontrada' });
        res.status(200).json(orden);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await ordenesModel.obtenerDetalleOrden(id);
        res.status(200).json(detalle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        await ordenesModel.actualizarEstadoOrden(id, estado);
        res.status(200).json({ mensaje: 'Estado actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
