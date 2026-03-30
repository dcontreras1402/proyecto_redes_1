const db = require('../config/db');

// Ver cupo disponible del usuario
const verCredito = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT cupo_total, cupo_disponible, compras_completadas FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = rows[0];
    const cupo_usado = parseFloat(user.cupo_total) - parseFloat(user.cupo_disponible);

    res.json({
      cupo_total: parseFloat(user.cupo_total),
      cupo_disponible: parseFloat(user.cupo_disponible),
      cupo_usado: cupo_usado,
      compras_completadas: user.compras_completadas,
      compras_para_siguiente_aumento: 3 - (user.compras_completadas % 3)
    });
  } catch (err) {
    console.error('Error verCredito:', err);
    res.status(500).json({ error: err.message });
  }
};

// Usar credito (lo llama el microservicio de ventas)
const usarCredito = async (req, res) => {
  const { usuario_id, monto, cuotas, compra_id } = req.body;

  if (!usuario_id || !monto || !cuotas)
    return res.status(400).json({ error: 'Faltan datos: usuario_id, monto, cuotas' });

  if (cuotas < 1 || cuotas > 12)
    return res.status(400).json({ error: 'Las cuotas deben ser entre 1 y 12' });

  try {
    // Verificar usuario y cupo
    const [rows] = await db.execute(
      'SELECT cupo_disponible, cupo_total, rol, estado FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = rows[0];

    if (user.rol !== 'comprador')
      return res.status(403).json({ error: 'Solo los compradores pueden usar credito' });

    if (user.estado !== 'activo')
      return res.status(403).json({ error: 'Usuario no activo' });

    const cupoDisp = parseFloat(user.cupo_disponible);
    if (monto > cupoDisp)
      return res.status(400).json({
        error: 'Cupo insuficiente',
        cupo_disponible: cupoDisp,
        monto_solicitado: monto
      });

    const monto_por_cuota = (monto / cuotas).toFixed(2);
    const nuevo_cupo = (cupoDisp - monto).toFixed(2);

    // Descontar cupo
    await db.execute(
      'UPDATE usuarios SET cupo_disponible = ? WHERE id = ?',
      [nuevo_cupo, usuario_id]
    );

    // Registrar movimiento
    await db.execute(
      'INSERT INTO movimientos_credito (usuario_id, tipo, monto, cuotas, cupo_antes, cupo_despues, descripcion) VALUES (?,?,?,?,?,?,?)',
      [usuario_id, 'compra', monto, cuotas, cupoDisp, nuevo_cupo, `Compra en ${cuotas} cuota(s)`]
    );

    // Registrar cuotas pendientes
    await db.execute(
      'INSERT INTO cuotas_pendientes (usuario_id, compra_id, monto_total, monto_por_cuota, cuotas_totales) VALUES (?,?,?,?,?)',
      [usuario_id, compra_id || null, monto, monto_por_cuota, cuotas]
    );

    res.json({
      mensaje: 'Credito aprobado',
      monto_aprobado: monto,
      cuotas: cuotas,
      monto_por_cuota: parseFloat(monto_por_cuota),
      cupo_disponible_restante: parseFloat(nuevo_cupo)
    });

  } catch (err) {
    console.error('Error usarCredito:', err);
    res.status(500).json({ error: err.message });
  }
};

// Registrar pago de cuota
const pagarCuota = async (req, res) => {
  const { cuota_id } = req.params;
  const usuario_id = req.usuario?.id;

  if (!usuario_id) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const [cuotas] = await db.execute(
      'SELECT * FROM cuotas_pendientes WHERE id = ? AND usuario_id = ?',
      [cuota_id, usuario_id]
    );

    if (!cuotas.length) return res.status(404).json({ error: 'Cuota no encontrada' });

    const cuota = cuotas[0];

    if (cuota.cuotas_pagadas >= cuota.cuotas_totales)
      return res.status(400).json({ error: 'Esta compra ya esta pagada completamente' });

    const nuevas_cuotas_pagadas = cuota.cuotas_pagadas + 1;
    const pagado_total = nuevas_cuotas_pagadas >= cuota.cuotas_totales;

    // Actualizar cuotas pagadas
    await db.execute(
      'UPDATE cuotas_pendientes SET cuotas_pagadas = ? WHERE id = ?',
      [nuevas_cuotas_pagadas, cuota_id]
    );

    // Devolver el monto de la cuota al cupo disponible
    const [userRows] = await db.execute(
      'SELECT cupo_disponible, cupo_total, compras_completadas FROM usuarios WHERE id = ?',
      [usuario_id]
    );
    
    if (!userRows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const user = userRows[0];
    const cupoDisp = parseFloat(user.cupo_disponible || 0);
    const cupoTotal = parseFloat(user.cupo_total || 0);
    const montoPorCuota = parseFloat(cuota.monto_por_cuota || 0);
    
    let nuevo_cupo = cupoDisp + montoPorCuota;
    let nuevo_cupo_total = cupoTotal;
    let nuevas_compras = user.compras_completadas || 0;
    let aumento_cupo = false;

    // Si termino de pagar la compra completa
    if (pagado_total) {
      nuevas_compras = nuevas_compras + 1;

      // Cada 3 compras completadas aumentar cupo en 50.000
      if (nuevas_compras % 3 === 0 && nuevo_cupo_total < 500000) {
        nuevo_cupo_total = Math.min(cupoTotal + 50000, 500000);
        nuevo_cupo = Math.min(nuevo_cupo + 50000, 500000);
        aumento_cupo = true;

        // Registrar aumento de cupo
        await db.execute(
          'INSERT INTO movimientos_credito (usuario_id, tipo, monto, cupo_antes, cupo_despues, descripcion) VALUES (?,?,?,?,?,?)',
          [usuario_id, 'aumento_cupo', 50000, cupoTotal, nuevo_cupo_total, 'Aumento por buen historial de pagos']
        );
      }

      await db.execute(
        'UPDATE usuarios SET cupo_disponible = ?, cupo_total = ?, compras_completadas = ? WHERE id = ?',
        [nuevo_cupo.toFixed(2), nuevo_cupo_total.toFixed(2), nuevas_compras, usuario_id]
      );
    } else {
      await db.execute(
        'UPDATE usuarios SET cupo_disponible = ? WHERE id = ?',
        [nuevo_cupo.toFixed(2), usuario_id]
      );
    }

    // Registrar movimiento de pago
    await db.execute(
      'INSERT INTO movimientos_credito (usuario_id, tipo, monto, cupo_antes, cupo_despues, descripcion) VALUES (?,?,?,?,?,?)',
      [usuario_id, 'pago', montoPorCuota, cupoDisp, nuevo_cupo.toFixed(2),
        `Pago cuota ${nuevas_cuotas_pagadas} de ${cuota.cuotas_totales}`]
    );

    res.json({
      mensaje: pagado_total ? 'Compra pagada completamente' : `Cuota ${nuevas_cuotas_pagadas} de ${cuota.cuotas_totales} pagada`,
      cuotas_pagadas: nuevas_cuotas_pagadas,
      cuotas_totales: cuota.cuotas_totales,
      compra_completada: pagado_total,
      aumento_cupo: aumento_cupo ? 'Tu cupo aumento $50.000 por buen historial' : null,
      cupo_disponible: parseFloat(nuevo_cupo.toFixed(2)),
      cupo_total: parseFloat(nuevo_cupo_total.toFixed(2))
    });

  } catch (err) {
    console.error('Error pagarCuota:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ver historial de movimientos
const verHistorial = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM movimientos_credito WHERE usuario_id = ? ORDER BY fecha DESC LIMIT 20',
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error verHistorial:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ver cuotas pendientes
const verCuotas = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, monto_total, monto_por_cuota, cuotas_totales, cuotas_pagadas,
       (cuotas_totales - cuotas_pagadas) AS cuotas_restantes,
       estado, fecha_compra
       FROM cuotas_pendientes
       WHERE usuario_id = ? AND cuotas_pagadas < cuotas_totales
       ORDER BY fecha_compra DESC`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error verCuotas:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ver credito de cualquier usuario (admin)
const verCreditoAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.nombre, u.email, u.cupo_total, u.cupo_disponible,
       u.compras_completadas,
       (u.cupo_total - u.cupo_disponible) AS cupo_usado
       FROM usuarios u WHERE u.id = ? AND u.rol = 'comprador'`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Comprador no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error verCreditoAdmin:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ajustar cupo manualmente (admin)
const ajustarCupo = async (req, res) => {
  const { id } = req.params;
  const { cupo_total } = req.body;

  if (!cupo_total || cupo_total < 0)
    return res.status(400).json({ error: 'El cupo debe ser mayor a 0' });

  try {
    await db.execute(
      'UPDATE usuarios SET cupo_total = ?, cupo_disponible = ? WHERE id = ?',
      [cupo_total, cupo_total, id]
    );

    await db.execute(
      'INSERT INTO movimientos_credito (usuario_id, tipo, monto, descripcion) VALUES (?,?,?,?)',
      [id, 'aumento_cupo', cupo_total, 'Ajuste manual por administrador']
    );

    res.json({ mensaje: `Cupo ajustado a $${cupo_total} correctamente` });
  } catch (err) {
    console.error('Error ajustarCupo:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { verCredito, usarCredito, pagarCuota, verHistorial, verCuotas, verCreditoAdmin, ajustarCupo };