const db = require('../config/db');

async function crearOrden(id_comprador, total, productos) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const [orden] = await conn.query(
            'INSERT INTO ordenes (id_comprador, total, estado, fecha) VALUES (?, ?, "pendiente", NOW())',
            [id_comprador, total]
        );
        const id_orden = orden.insertId;
        for (const prod of productos) {
            await conn.query(
                'INSERT INTO orden_detalles (id_orden, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
                [id_orden, prod.id_producto, prod.cantidad, prod.precio]
            );
        }
        await conn.commit();
        return id_orden;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

async function obtenerOrdenesPorUsuario(id_comprador) {
    const [rows] = await db.query(
        'SELECT * FROM ordenes WHERE id_comprador = ? ORDER BY fecha DESC',
        [id_comprador]
    );
    return rows;
}

async function obtenerOrdenPorId(id) {
    const [rows] = await db.query(
        'SELECT * FROM ordenes WHERE id = ?',
        [id]
    );
    return rows[0];
}

async function obtenerDetalleOrden(id_orden) {
    const [rows] = await db.query(
        'SELECT * FROM orden_detalles WHERE id_orden = ?',
        [id_orden]
    );
    return rows;
}

async function actualizarEstadoOrden(id, estado) {
    const [result] = await db.query(
        'UPDATE ordenes SET estado = ? WHERE id = ?',
        [estado, id]
    );
    return result;
}

module.exports = {
    crearOrden,
    obtenerOrdenesPorUsuario,
    obtenerOrdenPorId,
    obtenerDetalleOrden,
    actualizarEstadoOrden
};