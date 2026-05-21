const CONFIG = {
  API_BASE_URL: 'http://192.168.100.3', // IP del balanceador HAProxy
 
  get USUARIOS_URL() { return `${this.API_BASE_URL}/api/usuarios`; },
  get CATALOGO_URL() { return `${this.API_BASE_URL}/api/catalogo`; },
  get ORDENES_URL()  { return `${this.API_BASE_URL}/api/ordenes`; },
  get PAGOS_URL()    { return `${this.API_BASE_URL}/api/pagos`; },
  get CREDITOS_URL() { return `${this.API_BASE_URL}/api/credito`; }, // ← S añadida
};
 