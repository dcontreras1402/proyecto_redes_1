# proyecto_redes_1 (Local)

---

# 🛒 Marketplace Microservices Ecosystem

Este proyecto es una arquitectura de microservicios para un marketplace, que incluye gestión de usuarios, catálogo de productos, órdenes de compra y procesamiento de pagos.



## 📋 Requisitos Previos

* **Node.js** (v16 o superior)
* **MySQL** corriendo localmente
* **Postman** (para pruebas de API)

---

## 🚀 Paso a Paso para Levantar el Proyecto

### 1. Configuración de Bases de Datos
Crea las siguientes 4 bases de datos en tu MySQL:
1. `marketplace_usuarios`
2. `buyza_catalogo`
3. `buyza_ordenes`
4. `buyza_pagos`

### 2. Configuración de Variables de Entorno (`.env`)
En **cada carpeta** de microservicio, crea un archivo `.env` siguiendo esta estructura (ajusta los puertos según corresponda):

| Microservicio | Puerto | DB Name |
| :--- | :--- | :--- |
| **Usuarios** | `3001` | `marketplace_usuarios` |
| **Catálogo** | `3002` | `buyza_catalogo` |
| **Órdenes** | `3003` | `buyza_ordenes` |
| **Pagos** | `3004` | `buyza_pagos` |

> **Importante:** El `JWT_SECRET` debe ser el mismo en los 4 archivos `.env`.

### 3. Instalación y Ejecución
Debes abrir **4 terminales diferentes** (una para cada microservicio) y ejecutar los siguientes comandos desde la raíz de cada carpeta:

```bash
# En cada una de las 4 carpetas:
npm install
node src/index.js
```

---

## 🛠️ Flujo de Prueba (Postman)

Sigue este orden exacto para probar el sistema completo:

1.  **Registro/Login (Puerto 3001):** Crea un usuario y haz login para obtener el `token`.
2.  **Aprobación:** (Manual en DB) Cambia el estado del usuario a `aprobado`.
3.  **Crear Producto (Puerto 3002):** Envía un `POST` con el Token para añadir un producto.
4.  **Aprobación Producto:** (Manual en DB) Cambia el estado del producto a `1`.
5.  **Crear Orden (Puerto 3003):** Envía un `POST` con el `id_producto` y el Token.
6.  **Pagar Orden (Puerto 3004):** Envía el `id_orden` y el monto exacto para liquidar la deuda.

---

## 📂 Estructura del Repositorio

* `/microservicio-usuarios`: Autenticación y JWT.
* `/microservicio-catalogo`: Gestión de productos y stock.
* `/microservicio-ordenes`: Lógica de compra y comunicación inter-servicios.
* `/microservicio-pagos`: Procesamiento de transacciones y cierre de órdenes.