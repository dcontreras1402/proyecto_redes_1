// API HELPER - Funciones para llamadas HTTP
// Nota: Requiere que config.js esté cargado primero

const api = {
  async post(endpoint, data, base = CONFIG.USUARIOS_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async get(endpoint, base = CONFIG.USUARIOS_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  async put(endpoint, data, base = CONFIG.USUARIOS_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async delete(endpoint, base = CONFIG.USUARIOS_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
};

// ============================================
// SERVICIOS POR MICROSERVICIO
// ============================================

const usuarios = {
  post: (ep, data) => api.post(ep, data, CONFIG.USUARIOS_URL),
  get: (ep = '') => api.get(ep, CONFIG.USUARIOS_URL),
  put: (ep, data) => api.put(ep, data, CONFIG.USUARIOS_URL),
};

const catalogo = {
  get: (ep = '') => api.get(ep, CONFIG.CATALOGO_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.CATALOGO_URL),
  put: (ep, data) => api.put(ep, data, CONFIG.CATALOGO_URL),
  delete: (ep) => api.delete(ep, CONFIG.CATALOGO_URL),
};

const ordenes = {
  get: (ep = '') => api.get(ep, CONFIG.ORDENES_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.ORDENES_URL),
  put: (ep, data) => api.put(ep, data, CONFIG.ORDENES_URL),
};

const pagos = {
  get: (ep = '') => api.get(ep, CONFIG.PAGOS_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.PAGOS_URL),
};

const credito = {
  get: (ep = '') => api.get(ep, CONFIG.CREDITO_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.CREDITO_URL)
};

// ============================================
// UTILIDADES GENERALES
// ============================================

function getUsuario() {
  const data = localStorage.getItem('usuario');
  return data ? JSON.parse(data) : null;
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '../index.html';
}

function mostrarAlerta(id, mensaje, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${tipo} show`;
  el.textContent = mensaje;
  if (tipo === 'success') setTimeout(() => el.classList.remove('show'), 4000);
}

function formatPeso(n) {
  return '$' + parseFloat(n).toLocaleString('es-CO', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}