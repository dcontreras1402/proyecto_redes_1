const db = require('../config/db');

async function registrarPago(id_orden, metodo_pago, monto, transaccion_id) {
    const [result] = await db.query(
        'INSERT INTO pagos (id_orden, metodo_pago, monto, transaccion_id, estado, fecha_pago) VALUES (?, ?, ?, ?, "exitoso", NOW())',
        [id_orden, metodo_pago, monto, transaccion_id]
    );
    return result.insertId;
}

async function obtenerPagosPorOrden(id_orden) {
    const [rows] = await db.query(
        'SELECT * FROM pagos WHERE id_orden = ?',
        [id_orden]
    );
    return rows;
}

async function obtenerSumaPagosPorOrden(id_orden) {
    const [rows] = await db.query(
        'SELECT SUM(monto) as total_pagado FROM pagos WHERE id_orden = ?',
        [id_orden]
    );
    return rows[0].total_pagado || 0;
}

module.exports = {
    registrarPago,
    obtenerPagosPorOrden,
    obtenerSumaPagosPorOrden
};