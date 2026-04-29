const CONFIG = {
  API_BASE_URL: 'http://192.168.100.3', // Reemplaza con la IP de tu balanceador

  get USUARIOS_URL() { return `${this.API_BASE_URL}/api/usuarios`; },
  get CATALOGO_URL() { return `${this.API_BASE_URL}/api/catalogo`; },
  get ORDENES_URL()  { return `${this.API_BASE_URL}/api/ordenes`; },
  get PAGOS_URL()    { return `${this.API_BASE_URL}/api/pagos`; },
  get CREDITO_URL()  { return `${this.API_BASE_URL}/api/credito`; },
};