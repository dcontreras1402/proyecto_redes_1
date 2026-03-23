const API_URL = 'http://192.168.100.2:3001/api/usuarios';
const CREDITO_URL = 'http://192.168.100.2:3001/api/credito';

const api = {
  async post(endpoint, data, base = API_URL) {
    const res = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async get(endpoint, base = API_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },

  async put(endpoint, data, base = API_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async delete(endpoint, base = API_URL) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
};

const credito = {
  get: (ep) => api.get(ep, CREDITO_URL),
  post: (ep, data) => api.post(ep, data, CREDITO_URL)
};

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
  return '$' + parseFloat(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
