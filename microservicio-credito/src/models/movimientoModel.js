const db = require('../config/db');

// Registrar movimiento de crédito
const registrarMovimiento = async (usuarioId, tipo, monto, cupoBefore, cupoAfter, descripcion) => {
  try {
    await db.execute(
      `INSERT INTO movimientos_credito (usuario_id, tipo, monto, cupo_antes, cupo_despues, descripcion, fecha)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [usuarioId, tipo, monto, cupoBefore, cupoAfter, descripcion]
    );
  } catch (err) {
    throw new Error(`Error en registrarMovimiento: ${err.message}`);
  }
};

// Obtener historial de movimientos
const obtenerHistorial = async (usuarioId, limite = 20) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, tipo, monto, cupo_antes, cupo_despues, descripcion, fecha
       FROM movimientos_credito
       WHERE usuario_id = ?
       ORDER BY fecha DESC
       LIMIT ?`,
      [usuarioId, limite]
    );
    return rows;
  } catch (err) {
    throw new Error(`Error en obtenerHistorial: ${err.message}`);
  }
};

module.exports = {
  registrarMovimiento,
  obtenerHistorial
};