const creditoModel = require('../models/creditoModel');
const cuotaModel = require('../models/cuotaModel');
const movimientoModel = require('../models/movimientoModel');

// Ver crédito disponible (comprador)
const verCredito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const credito = await creditoModel.obtenerCreditoUsuario(usuarioId);

    if (!credito) {
      return res.status(404).json({ error: 'No tiene crédito registrado' });
    }

    const cupoUsado = parseFloat(credito.cupo_total) - parseFloat(credito.cupo_disponible);

    res.json({
      cupo_total: parseFloat(credito.cupo_total),
      cupo_disponible: parseFloat(credito.cupo_disponible),
      cupo_usado: cupoUsado,
      compras_completadas: credito.compras_completadas,
      compras_para_aumento: 3 - (credito.compras_completadas % 3)
    });
  } catch (err) {
    console.error('Error verCredito:', err);
    res.status(500).json({ error: err.message });
  }
};

// Usar crédito (llamado desde microservicio-ordenes)
const usarCredito = async (req, res) => {
  const { usuario_id, monto, cuotas, compra_id } = req.body;

  if (!usuario_id || !monto || !cuotas) {
    return res.status(400).json({ error: 'Faltan datos: usuario_id, monto, cuotas' });
  }

  if (cuotas < 1 || cuotas > 12) {
    return res.status(400).json({ error: 'Las cuotas deben ser entre 1 y 12' });
  }

  try {
    // Obtener crédito del usuario
    const credito = await creditoModel.obtenerCreditoUsuario(usuario_id);

    if (!credito) {
      return res.status(404).json({ error: 'Usuario no tiene crédito registrado' });
    }

    if (credito.estado !== 'activo') {
      return res.status(403).json({ error: 'Crédito no activo' });
    }

    const cupoDisp = parseFloat(credito.cupo_disponible);

    if (monto > cupoDisp) {
      return res.status(400).json({
        error: 'Cupo insuficiente',
        cupo_disponible: cupoDisp,
        monto_solicitado: monto
      });
    }

    // Descontar cupo
    const resultadoDescuento = await creditoModel.descontarCupo(usuario_id, monto);
    if (!resultadoDescuento.success) {
      return res.status(400).json(resultadoDescuento);
    }

    // Crear registro de cuotas
    const montoPorCuota = (monto / cuotas).toFixed(2);
    await cuotaModel.crearCuotas(usuario_id, compra_id, monto, cuotas);

    // Registrar movimiento
    await movimientoModel.registrarMovimiento(
      usuario_id,
      'compra',
      monto,
      cupoDisp,
      resultadoDescuento.nuevo_cupo,
      `Compra en ${cuotas} cuota(s) - Orden #${compra_id || 'N/A'}`
    );

    res.json({
      mensaje: 'Crédito aprobado',
      monto_aprobado: monto,
      cuotas: cuotas,
      monto_por_cuota: parseFloat(montoPorCuota),
      cupo_disponible_restante: resultadoDescuento.nuevo_cupo
    });

  } catch (err) {
    console.error('Error usarCredito:', err);
    res.status(500).json({ error: err.message });
  }
};

// Pagar cuota
const pagarCuota = async (req, res) => {
  const { cuota_id } = req.params;
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const cuota = await cuotaModel.obtenerCuotaById(cuota_id);

    if (!cuota) {
      return res.status(404).json({ error: 'Cuota no encontrada' });
    }

    if (cuota.usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'No tienes permiso para pagar esta cuota' });
    }

    if (cuota.cuotas_pagadas >= cuota.cuotas_totales) {
      return res.status(400).json({ error: 'Esta cuota ya está completamente pagada' });
    }

    const nuevasCuotasPagadas = cuota.cuotas_pagadas + 1;
    const completada = nuevasCuotasPagadas >= cuota.cuotas_totales;

    // Actualizar cuota
    await cuotaModel.actualizarCuota(cuota_id, nuevasCuotasPagadas);

    // Devolver cupo
    const creditoAntes = await creditoModel.obtenerCreditoUsuario(usuarioId);
    const montoPorCuota = parseFloat(cuota.monto_por_cuota);

    const resultadoDevolucion = await creditoModel.devolverCupo(usuarioId, montoPorCuota);

    // Registrar movimiento
    await movimientoModel.registrarMovimiento(
      usuarioId,
      'pago',
      montoPorCuota,
      creditoAntes.cupo_disponible,
      resultadoDevolucion.nuevo_cupo,
      `Pago cuota ${nuevasCuotasPagadas} de ${cuota.cuotas_totales}`
    );

    let mensajeExtra = null;

    // Si completó la compra, aumentar contador
    if (completada) {
      const creditoActualizado = await creditoModel.actualizarCompletadas(usuarioId);

      // Cada 3 compras, aumentar cupo
      if (creditoActualizado.nuevas_compras % 3 === 0) {
        const resultadoAumento = await creditoModel.aumentarCupo(usuarioId);

        await movimientoModel.registrarMovimiento(
          usuarioId,
          'aumento_cupo',
          50000,
          creditoAntes.cupo_total,
          resultadoAumento.cupo_nuevo,
          'Aumento por buen historial de pagos'
        );

        mensajeExtra = `¡Felicidades! Tu cupo ha aumentado a $${resultadoAumento.cupo_nuevo}`;
      }
    }

    res.json({
      mensaje: completada ? 'Compra pagada completamente' : `Cuota ${nuevasCuotasPagadas} de ${cuota.cuotas_totales} pagada`,
      cuotas_pagadas: nuevasCuotasPagadas,
      cuotas_totales: cuota.cuotas_totales,
      compra_completada: completada,
      cupo_disponible: resultadoDevolucion.nuevo_cupo,
      mensaje_extra: mensajeExtra
    });

  } catch (err) {
    console.error('Error pagarCuota:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ver cuotas pendientes
const verCuotas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const cuotas = await cuotaModel.obtenerCuotasPendientes(usuarioId);
    res.json(cuotas);
  } catch (err) {
    console.error('Error verCuotas:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ver historial de movimientos
const verHistorial = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const historial = await movimientoModel.obtenerHistorial(usuarioId);
    res.json(historial);
  } catch (err) {
    console.error('Error verHistorial:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ver crédito de usuario (admin)
const verCreditoAdmin = async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const credito = await creditoModel.obtenerCreditoUsuario(usuario_id);

    if (!credito) {
      return res.status(404).json({ error: 'Usuario no tiene crédito registrado' });
    }

    const cupoUsado = parseFloat(credito.cupo_total) - parseFloat(credito.cupo_disponible);

    res.json({
      usuario_id: credito.usuario_id,
      cupo_total: parseFloat(credito.cupo_total),
      cupo_disponible: parseFloat(credito.cupo_disponible),
      cupo_usado: cupoUsado,
      compras_completadas: credito.compras_completadas,
      estado: credito.estado
    });
  } catch (err) {
    console.error('Error verCreditoAdmin:', err);
    res.status(500).json({ error: err.message });
  }
};

// Ajustar cupo (admin)
const ajustarCupo = async (req, res) => {
  const { usuario_id } = req.params;
  const { cupo_total } = req.body;

  if (!cupo_total || cupo_total < 0) {
    return res.status(400).json({ error: 'El cupo debe ser mayor a 0' });
  }

  try {
    const creditoAntes = await creditoModel.obtenerCreditoUsuario(usuario_id);

    if (!creditoAntes) {
      return res.status(404).json({ error: 'Usuario no tiene crédito registrado' });
    }

    // Actualizar cupo
    const db = require('../config/db');
    await db.execute(
      'UPDATE creditos SET cupo_total = ?, cupo_disponible = ? WHERE usuario_id = ?',
      [cupo_total, cupo_total, usuario_id]
    );

    // Registrar movimiento
    await movimientoModel.registrarMovimiento(
      usuario_id,
      'ajuste_admin',
      cupo_total,
      creditoAntes.cupo_total,
      cupo_total,
      'Ajuste manual por administrador'
    );

    res.json({
      mensaje: 'Cupo ajustado correctamente',
      cupo_anterior: creditoAntes.cupo_total,
      cupo_nuevo: parseFloat(cupo_total)
    });

  } catch (err) {
    console.error('Error ajustarCupo:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  verCredito,
  usarCredito,
  pagarCuota,
  verCuotas,
  verHistorial,
  verCreditoAdmin,
  ajustarCupo
};