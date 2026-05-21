-- init-db/00_create_databases.sql
-- Este archivo debe ir en ./init-db/ y se monta en /docker-entrypoint-initdb.d/
-- MySQL lo ejecuta automáticamente la primera vez que el contenedor arranca.
-- ✅ Soluciona que el stack no creaba las BDs automáticamente.

CREATE DATABASE IF NOT EXISTS buyza_usuarios   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS buyza_catalogo   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS buyza_ordenes    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS buyza_pagos      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS buyza_credito    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── buyza_usuarios ──────────────────────────────────────────────────────────
USE buyza_usuarios;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `nombre`          VARCHAR(255) NOT NULL,
  `email`           VARCHAR(255) NOT NULL,
  `password`        VARCHAR(255) NOT NULL,
  `rol`             ENUM('comprador','vendedor','admin') NOT NULL DEFAULT 'comprador',
  `estado`          ENUM('activo','pendiente','rechazado') NOT NULL DEFAULT 'activo',
  `fecha_registro`  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuario admin por defecto (password: admin123)
INSERT IGNORE INTO usuarios (nombre, email, password, rol, estado)
VALUES ('Administrador', 'admin@buyza.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHHG',
        'admin', 'activo');

-- ─── buyza_catalogo ──────────────────────────────────────────────────────────
USE buyza_catalogo;

CREATE TABLE IF NOT EXISTS `productos` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `id_vendedor`    INT NOT NULL,
  `nombre`         VARCHAR(255) NOT NULL,
  `descripcion`    TEXT,
  `precio`         DECIMAL(10,2) NOT NULL,
  `cantidad`       INT NOT NULL DEFAULT '0',
  `activo`         TINYINT(1) DEFAULT '1',
  `aprobado`       TINYINT(1) DEFAULT '0',
  `fecha_creacion` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── buyza_ordenes ───────────────────────────────────────────────────────────
USE buyza_ordenes;

CREATE TABLE IF NOT EXISTS `ordenes` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `id_comprador` INT NOT NULL,
  `total`        DECIMAL(10,2) NOT NULL,
  `estado`       ENUM('pendiente','pagada','cancelada') DEFAULT 'pendiente',
  `fecha`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `orden_detalles` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `id_orden`        INT NOT NULL,
  `id_producto`     INT NOT NULL,
  `cantidad`        INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_orden` (`id_orden`),
  CONSTRAINT `fk_orden` FOREIGN KEY (`id_orden`) REFERENCES `ordenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── buyza_pagos ─────────────────────────────────────────────────────────────
USE buyza_pagos;

CREATE TABLE IF NOT EXISTS `pagos` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `id_orden`       INT NOT NULL,
  `metodo_pago`    VARCHAR(50) NOT NULL,
  `monto`          DECIMAL(10,2) NOT NULL,
  `transaccion_id` VARCHAR(100) NOT NULL,
  `estado`         VARCHAR(20) DEFAULT 'exitoso',
  `fecha_pago`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaccion_id` (`transaccion_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── buyza_credito ───────────────────────────────────────────────────────────
USE buyza_credito;

CREATE TABLE IF NOT EXISTS `creditos` (
  `id`                  INT NOT NULL AUTO_INCREMENT,
  `usuario_id`          INT NOT NULL,
  `cupo_total`          DECIMAL(12,2) NOT NULL DEFAULT '100000.00',
  `cupo_disponible`     DECIMAL(12,2) NOT NULL DEFAULT '100000.00',
  `compras_completadas` INT DEFAULT '0',
  `estado`              ENUM('activo','inactivo','suspendido') DEFAULT 'activo',
  `fecha_creacion`      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `cuotas_pendientes` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `usuario_id`      INT NOT NULL,
  `compra_id`       INT DEFAULT NULL,
  `monto_total`     DECIMAL(12,2) NOT NULL,
  `monto_por_cuota` DECIMAL(12,2) NOT NULL,
  `cuotas_totales`  INT NOT NULL,
  `cuotas_pagadas`  INT DEFAULT '0',
  `estado`          ENUM('pendiente','pagada') DEFAULT 'pendiente',
  `fecha_compra`    TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `movimientos_credito` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `usuario_id`   INT NOT NULL,
  `tipo`         ENUM('compra','pago','aumento_cupo','ajuste_admin','suspension') NOT NULL,
  `monto`        DECIMAL(12,2) DEFAULT NULL,
  `cupo_antes`   DECIMAL(12,2) DEFAULT NULL,
  `cupo_despues` DECIMAL(12,2) DEFAULT NULL,
  `descripcion`  VARCHAR(255) DEFAULT NULL,
  `fecha`        TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
