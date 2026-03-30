const { Router } = require('express');
const router = Router();
const ordenesModel = require('../models/ordenesModel');
const axios = require('axios');
const { verificarToken } = require('../middlewares/authMiddleware');

// ✅ RUTA PARA CREAR ORDEN SIMPLE (desde catálogo - un producto)
router.post('/api/ordenes/crear', verificarToken, async (req, res) => {
    try {
        const id_comprador = req.usuario.id;
        const { id_producto } = req.body;

        if (!id_producto) {
            return res.status(400).json({ error: 'ID de producto requerido' });
        }

        // 1. Obtener info del producto
        try {
            const resp = await axios.get(`http://localhost:3002/api/catalogo/${id_producto}`);
            const prodInfo = resp.data;

            if (prodInfo.cantidad < 1) {
                return res.status(400).json({ error: `Stock insuficiente para: ${prodInfo.nombre}` });
            }

            const totalCalculado = parseFloat(prodInfo.precio);

            // 2. Crear orden (sin usar crédito aún, solo crear orden pendiente de pago)
            const id_orden = await ordenesModel.crearOrden(id_comprador, totalCalculado, [{
                id_producto: id_producto,
                cantidad: 1,
                precio: prodInfo.precio
            }]);

            res.status(201).json({ 
                id_orden,
                total: totalCalculado.toFixed(2),
                producto: prodInfo.nombre
            });

        } catch (err) {
            return res.status(404).json({ error: `Producto ${id_producto} no encontrado` });
        }

    } catch (error) {
        res.status(500).json({ error: 'Error interno en órdenes', detalle: error.message });
    }
});

// ✅ RUTA ORIGINAL - CREAR ORDEN CON MÚLTIPLES PRODUCTOS Y CRÉDITO
router.post('/api/ordenes', verificarToken, async (req, res) => {
    try {
        const id_comprador = req.usuario.id;
        const { productos, cuotas } = req.body;
        let totalCalculado = 0;
        const productosValidados = [];

        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: 'La orden debe tener productos' });
        }

        // 1. Validar Stock en Microservicio Catálogo (3002)
        for (const item of productos) {
            try {
                const resp = await axios.get(`http://localhost:3002/api/catalogo/${item.id_producto}`);
                const prodInfo = resp.data;

                if (prodInfo.cantidad < item.cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente para: ${prodInfo.nombre}` });
                }

                totalCalculado += parseFloat(prodInfo.precio) * item.cantidad;
                productosValidados.push({
                    id_producto: item.id_producto,
                    cantidad: item.cantidad,
                    precio: prodInfo.precio
                });
            } catch (err) {
                return res.status(404).json({ error: `Producto ${item.id_producto} no encontrado` });
            }
        }

        // 2. Validar y Descontar Cupo en Microservicio Usuarios (3001)
        try {
            await axios.post('http://localhost:3001/api/credito/usar', {
                usuario_id: id_comprador,
                monto: totalCalculado,
                cuotas: cuotas || 1
            });
        } catch (err) {
            const msg = err.response?.data?.error || 'Error al procesar el crédito';
            return res.status(err.response?.status || 400).json({ error: msg });
        }

        // 3. Crear la Orden (Ahora que el crédito está aprobado)
        const id_orden = await ordenesModel.crearOrden(id_comprador, totalCalculado, productosValidados);

        // 4. Actualizar Stock
        for (const item of productosValidados) {
            await axios.put(`http://localhost:3002/api/catalogo/${item.id_producto}/reducir-stock`, {
                cantidad_comprada: item.cantidad
            });
        }

        res.status(201).json({ 
            mensaje: 'Compra exitosa con crédito', 
            id_orden, 
            total: totalCalculado.toFixed(2) 
        });

    } catch (error) {
        res.status(500).json({ error: 'Error interno en órdenes', detalle: error.message });
    }
});

// ✅ OBTENER ÓRDENES DEL USUARIO
router.get('/api/ordenes/usuario/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const ordenes = await ordenesModel.obtenerOrdenesPorUsuario(id);
        res.status(200).json(ordenes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ OBTENER INFO DE UNA ORDEN (sin autenticación)
router.get('/api/ordenes/info/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const orden = await ordenesModel.obtenerOrdenPorId(id);
        if (!orden) return res.status(404).json({ error: 'No encontrada' });
        res.status(200).json(orden);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ OBTENER DETALLE DE UNA ORDEN (con autenticación)
router.get('/api/ordenes/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await ordenesModel.obtenerDetalleOrden(id);
        res.status(200).json(detalle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ ACTUALIZAR ESTADO DE ORDEN
router.put('/api/ordenes/:id/estado', async (req, res) => {
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