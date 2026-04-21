const CONFIG = {
  API_BASE_URL: 'http://192.168.100.2',

  PORTS: {
    USUARIOS: 3001,
    CREDITOS: 3002,
    CATALOGO: 3003,
    ORDENES:  3004,
    PAGOS:    3005,
  },

  get USUARIOS_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.USUARIOS}/api/usuarios/`;
  },
  get CREDITOS_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.CREDITOS}/api/credito/`;
  },
  get CATALOGO_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.CATALOGO}/api/catalogo/`;
  },
  get ORDENES_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.ORDENES}/api/ordenes/`;
  },
  get PAGOS_URL() {
    return `${this.API_BASE_URL}:${this.PORTS.PAGOS}/api/pagos/`;
  },
};