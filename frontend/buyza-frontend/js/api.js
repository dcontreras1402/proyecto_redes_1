const api = {
  request: async function(method, endpoint, data, base) {
    if (!base) {
      console.error("Error: URL base no definida. Revisa config.js");
      return { error: "Error de configuración" };
    }
    const token = localStorage.getItem('token');
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
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
  post(ep, data, base) { return this.request('POST', ep, data, base); },
  get(ep, base) { return this.request('GET', ep, null, base); },
  put(ep, data, base) { return this.request('PUT', ep, data, base); },
  delete(ep, base) { return this.request('DELETE', ep, null, base); }
};

const usuarios = {
  post: (ep, data) => api.post(ep, data, window.CONFIG?.USUARIOS_URL),
  get: (ep = '') => api.get(ep, window.CONFIG?.USUARIOS_URL),
  put: (ep, data) => api.put(ep, data, window.CONFIG?.USUARIOS_URL)
};

const catalogo = {
  get: (ep = '') => api.get(ep, window.CONFIG?.CATALOGO_URL),
  post: (ep, data) => api.post(ep, data, window.CONFIG?.CATALOGO_URL),
  put: (ep, data) => api.put(ep, data, window.CONFIG?.CATALOGO_URL),
  delete: (ep) => api.delete(ep, window.CONFIG?.CATALOGO_URL)
};

const ordenes = {
  get: (ep = '') => api.get(ep, window.CONFIG?.ORDENES_URL),
  post: (ep, data) => api.post(ep, data, window.CONFIG?.ORDENES_URL),
  put: (ep, data) => api.put(ep, data, window.CONFIG?.ORDENES_URL)
};

const pagos = {
  get: (ep = '') => api.get(ep, window.CONFIG?.PAGOS_URL),
  post: (ep, data) => api.post(ep, data, window.CONFIG?.PAGOS_URL)
};

const credito = {
  get: (ep = '') => api.get(ep, window.CONFIG?.CREDITO_URL),
  post: (ep, data) => api.post(ep, data, window.CONFIG?.CREDITO_URL)
};

function getUsuario() {
  const data = localStorage.getItem('usuario');
  return data ? JSON.parse(data) : null;
}

function cerrarSesion() {
  localStorage.clear();
  window.location.replace('../index.html');
}

function mostrarAlerta(id, mensaje, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${tipo} show`;
  el.textContent = mensaje;
  setTimeout(() => el.classList.remove('show'), 4000);
}

function formatPeso(n) {
  return '$' + parseFloat(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}