const creditoModel = require('../models/creditoModel');
const cuotaModel = require('../models/cuotaModel');
const movimientoModel = require('../models/movimientoModel');

const verCredito = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const credito = await creditoModel.obtenerCreditoUsuario(usuarioId);

    if (!credito) {
      return res.status(404).json({ error: 'No tiene crédito registrado' });
    }

    const cupoTotal = parseFloat(credito.cupo_total);
    const cupoDisponible = parseFloat(credito.cupo_disponible);
    const cupoUsado = cupoTotal - cupoDisponible;

    res.json({
      cupo_total: cupoTotal,
      cupo_disponible: cupoDisponible,
      cupo_usado: cupoUsado,
      compras_completadas: credito.compras_completadas,
      compras_para_aumento: 3 - (credito.compras_completadas % 3)
    });
  } catch (err) {
    console.error('Error verCredito:', err);
    res.status(500).json({ error: err.message });
  }
};

const usarCredito = async (req, res) => {
  const { usuario_id, monto, cuotas, compra_id } = req.body;

  if (!usuario_id || !monto || !cuotas) {
    return res.status(400).json({ error: 'Faltan datos: usuario_id, monto, cuotas' });
  }

  try {
    const credito = await creditoModel.obtenerCreditoUsuario(usuario_id);

    if (!credito || credito.estado !== 'activo') {
      return res.status(403).json({ error: 'Crédito no activo' });
    }

    const cupoDisp = parseFloat(credito.cupo_disponible);

    if (monto > cupoDisp) {
      return res.status(400).json({ error: 'Cupo insuficiente' });
    }

    const resultadoDescuento = await creditoModel.descontarCupo(usuario_id, monto);
    
    await cuotaModel.crearCuotas(usuario_id, compra_id, monto, cuotas);

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
      cupo_disponible_restante: resultadoDescuento.nuevo_cupo
    });
  } catch (err) {
    console.error('Error usarCredito:', err);
    res.status(500).json({ error: err.message });
  }
};

const pagarCuota = async (req, res) => {
  const { cuota_id } = req.params;
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const cuota = await cuotaModel.obtenerCuotaById(cuota_id);

    if (!cuota || cuota.usuario_id !== usuarioId) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const nuevasCuotasPagadas = cuota.cuotas_pagadas + 1;
    const completada = nuevasCuotasPagadas >= cuota.cuotas_totales;

    await cuotaModel.actualizarCuota(cuota_id, nuevasCuotasPagadas);

    const creditoAntes = await creditoModel.obtenerCreditoUsuario(usuarioId);
    const montoPorCuota = parseFloat(cuota.monto_por_cuota);

    const resultadoDevolucion = await creditoModel.devolverCupo(usuarioId, montoPorCuota);

    await movimientoModel.registrarMovimiento(
      usuarioId,
      'pago',
      montoPorCuota,
      creditoAntes.cupo_disponible,
      resultadoDevolucion.nuevo_cupo,
      `Pago cuota ${nuevasCuotasPagadas} de ${cuota.cuotas_totales}`
    );

    if (completada) {
      const creditoActualizado = await creditoModel.actualizarCompletadas(usuarioId);
      if (creditoActualizado.nuevas_compras % 3 === 0) {
        await creditoModel.aumentarCupo(usuarioId);
      }
    }

    res.json({
      mensaje: 'Pago realizado',
      cupo_disponible: resultadoDevolucion.nuevo_cupo
    });
  } catch (err) {
    console.error('Error pagarCuota:', err);
    res.status(500).json({ error: err.message });
  }
};

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

const verCreditoAdmin = async (req, res) => {
  const { usuario_id } = req.params;
  try {
    const credito = await creditoModel.obtenerCreditoUsuario(usuario_id);
    if (!credito) return res.status(404).json({ error: 'No encontrado' });
    res.json(credito);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const ajustarCupo = async (req, res) => {
  const { usuario_id } = req.params;
  const { cupo_total } = req.body;
  try {
    const db = require('../config/db');
    await db.query(
      'UPDATE creditos SET cupo_total = ?, cupo_disponible = ? WHERE usuario_id = ?',
      [cupo_total, cupo_total, usuario_id]
    );
    res.json({ mensaje: 'Cupo ajustado' });
  } catch (err) {
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