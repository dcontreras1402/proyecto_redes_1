// config.js - Lee variables del .env y las expone globalmente

const CONFIG = {
  // Base URL - cambiar según entorno
  API_BASE_URL: 'http://localhost', // Cambiar a 'http://192.168.100.2' para desarrollo local
  
  // Puertos de microservicios
  PORTS: {
    USUARIOS: 3001,
    CATALOGO: 3002,
    ORDENES: 3003,
    PAGOS: 3004,
  },

  // URLs completas de cada microservicio
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

// Exportar para ser usado
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}