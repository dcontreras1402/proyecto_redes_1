const { Router } = require('express');
const router = Router();
const productosModel = require('../models/productosModel');
const { verificarToken, soloAdmin } = require('../middlewares/authMiddleware');

router.get('/', async (req, res) => {
    try {
        const productos = await productosModel.obtenerProductosActivos();
        res.status(200).json(productos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await productosModel.obtenerProductoPorId(id);
        if (!producto) return res.status(404).json({ error: 'No encontrado' });
        res.status(200).json(producto);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', verificarToken, async (req, res) => {
    try {
        const { nombre, descripcion, precio, cantidad } = req.body;
        const id_vendedor = req.usuario.id;
        await productosModel.crearProducto(id_vendedor, nombre, descripcion, precio, cantidad);
        res.status(201).json({ mensaje: 'Pendiente de aprobacion' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, cantidad } = req.body;
        const id_vendedor = req.usuario.id;
        await productosModel.editarProducto(id, id_vendedor, nombre, descripcion, precio, cantidad);
        res.status(200).json({ mensaje: 'Actualizado' });
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
});

router.put('/:id/desactivar', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const id_vendedor = req.usuario.id;
        await productosModel.desactivarProducto(id, id_vendedor);
        res.status(200).json({ mensaje: 'Desactivado' });
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
});

router.put('/:id/reducir-stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad_comprada } = req.body;
        await productosModel.reducirStock(id, cantidad_comprada);
        res.status(200).json({ mensaje: 'Stock actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/aprobar', verificarToken, soloAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await productosModel.aprobarProducto(id);
        res.status(200).json({ mensaje: 'Aprobado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;