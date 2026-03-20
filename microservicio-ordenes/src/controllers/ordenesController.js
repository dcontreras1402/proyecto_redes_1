const { Router } = require('express');
const router = Router();
const ordenesModel = require('../models/ordenesModel');
const axios = require('axios');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/api/ordenes', verificarToken, async (req, res) => {
    try {
        const id_comprador = req.usuario.id;
        const { productos } = req.body;
        let totalCalculado = 0;
        const productosValidados = [];

        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: 'La orden debe tener productos' });
        }

        for (const item of productos) {
            try {
                const resp = await axios.get(`http://localhost:3002/api/productos/${item.id_producto}`);
                const prodInfo = resp.data;

                if (prodInfo.cantidad < item.cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente para producto ID: ${item.id_producto}` });
                }

                totalCalculado += parseFloat(prodInfo.precio) * item.cantidad;
                productosValidados.push({
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                    precio: prodInfo.precio
                });
            } catch (err) {
                return res.status(404).json({ error: `Producto ${item.id_producto} no existe en catalogo` });
            }
        }

        const id_orden = await ordenesModel.crearOrden(id_comprador, totalCalculado, productosValidados);

        for (const item of productosValidados) {
            await axios.put(`http://localhost:3002/api/productos/${item.id_producto}/reducir-stock`, {
                cantidad_comprada: item.cantidad
            });
        }

        res.status(201).json({ 
            mensaje: 'Orden creada y stock actualizado', 
            id_orden, 
            total: totalCalculado.toFixed(2) 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno', detalle: error.message });
    }
});

router.get('/api/ordenes/usuario/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const ordenes = await ordenesModel.obtenerOrdenesPorUsuario(id);

        const ordenesConDeuda = await Promise.all(ordenes.map(async (orden) => {
            let deuda = orden.total;
            try {
                const respuestaPagos = await axios.get(`http://localhost:3004/api/pagos/suma/${orden.id}`);
                deuda = (parseFloat(orden.total) - parseFloat(respuestaPagos.data.total_pagado)).toFixed(2);
            } catch (error) {
                deuda = parseFloat(orden.total).toFixed(2);
            }
            return { ...orden, deuda };
        }));

        res.status(200).json(ordenesConDeuda);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/ordenes/info/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const orden = await ordenesModel.obtenerOrdenPorId(id);
        if (!orden) return res.status(404).json({ error: 'No encontrada' });

        let deuda = orden.total;
        try {
            const respuestaPagos = await axios.get(`http://localhost:3004/api/pagos/suma/${id}`);
            deuda = (parseFloat(orden.total) - parseFloat(respuestaPagos.data.total_pagado)).toFixed(2);
        } catch (error) {
            deuda = parseFloat(orden.total).toFixed(2);
        }
        res.status(200).json({ ...orden, deuda });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/api/ordenes/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await ordenesModel.obtenerDetalleOrden(id);
        res.status(200).json(detalle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/api/ordenes/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        await ordenesModel.actualizarEstadoOrden(id, estado);
        res.status(200).json({ mensaje: 'Actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;