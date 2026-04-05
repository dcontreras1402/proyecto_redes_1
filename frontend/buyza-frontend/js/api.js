// ── CONFIG ──────────────────────────────────────────────
const CONFIG = {
  API_BASE_URL: 'http://192.168.100.3',

  PORTS: {
    USUARIOS: 3001,
    CATALOGO: 3002,
    ORDENES:  3003,
    PAGOS:    3004,
  },

  get USUARIOS_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.USUARIOS}/api/usuarios`;
  },
  get CATALOGO_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.CATALOGO}/api/catalogo`;
  },
  get ORDENES_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.ORDENES}/api/ordenes`;
  },
  get PAGOS_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.PAGOS}/api/pagos`;
  },
  get CREDITO_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.USUARIOS}/api/credito`;
  },
};

// ── API ─────────────────────────────────────────────────
const api = {
  request: async function(method, endpoint, data, base) {
    const token = localStorage.getItem('token');

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) options.body = JSON.stringify(data);

    try {
      const res = await fetch(`${base}${endpoint}`, options);
      const result = await res.json();

      if (!res.ok) {
        const err = result || {};
        err.status = res.status;
        throw err;
      }

      return result;
    } catch (err) {
      console.error(`Error en ${method} ${endpoint}:`, err);
      throw err;
    }
  },

  post(ep, data, base)   { return this.request('POST',   ep, data, base); },
  get(ep, base)          { return this.request('GET',    ep, null, base); },
  put(ep, data, base)    { return this.request('PUT',    ep, data, base); },
  delete(ep, base)       { return this.request('DELETE', ep, null, base); }
};

const usuarios = {
  post: (ep, data) => api.post(ep, data, CONFIG.USUARIOS_URL),
  get:  (ep = '')  => api.get(ep, CONFIG.USUARIOS_URL),
  put:  (ep, data) => api.put(ep, data, CONFIG.USUARIOS_URL),
};

const catalogo = {
  get:    (ep = '')  => api.get(ep, CONFIG.CATALOGO_URL),
  post:   (ep, data) => api.post(ep, data, CONFIG.CATALOGO_URL),
  put:    (ep, data) => api.put(ep, data, CONFIG.CATALOGO_URL),
  delete: (ep)       => api.delete(ep, CONFIG.CATALOGO_URL),
};

const ordenes = {
  get:  (ep = '')  => api.get(ep, CONFIG.ORDENES_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.ORDENES_URL),
  put:  (ep, data) => api.put(ep, data, CONFIG.ORDENES_URL),
};

const pagos = {
  get:  (ep = '')  => api.get(ep, CONFIG.PAGOS_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.PAGOS_URL),
};

const credito = {
  get:  (ep = '')  => api.get(ep, CONFIG.CREDITO_URL),
  post: (ep, data) => api.post(ep, data, CONFIG.CREDITO_URL),
};

function getUsuario() {
  const data = localStorage.getItem('usuario');
  return data ? JSON.parse(data) : null;
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.replace('../index.html');
}

function mostrarAlerta(id, mensaje, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${tipo} show`;
  el.textContent = mensaje;
  if (tipo === 'success') setTimeout(() => el.classList.remove('show'), 4000);
}

function formatPeso(n) {
  return '$' + parseFloat(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}