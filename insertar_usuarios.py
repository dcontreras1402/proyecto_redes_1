import csv
import mysql.connector

def insertar_usuarios_desde_csv(ruta_csv):
    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="marketplace_usuarios",
        charset="utf8mb4"
    )
    cursor = conexion.cursor()
    
    procesados = 0
    actualizados = 0
    
    with open(ruta_csv, mode='r', encoding='utf-8', errors='ignore') as archivo:
        lector_csv = csv.reader(archivo)
        next(lector_csv)
        
        query = """
        INSERT INTO usuarios (
            nombre, email, password, rol, estado, 
            cupo_total, cupo_disponible, cupo_usado, 
            veces_cupo_completo, compras_completadas
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            password = VALUES(password),
            rol = VALUES(rol),
            estado = VALUES(estado),
            cupo_total = VALUES(cupo_total),
            cupo_disponible = VALUES(cupo_disponible),
            cupo_usado = VALUES(cupo_usado),
            veces_cupo_completo = VALUES(veces_cupo_completo),
            compras_completadas = VALUES(compras_completadas)
        """
        
        for fila in lector_csv:
            procesados += 1
            cursor.execute(query, fila)
            if cursor.rowcount > 0:
                actualizados += 1
                
    conexion.commit()
    cursor.close()
    conexion.close()
    
    print(f"\n--- RESUMEN ---")
    print(f"Filas leídas del CSV: {procesados}")
    print(f"Filas procesadas/actualizadas: {actualizados}")

if __name__ == "__main__":
    insertar_usuarios_desde_csv("/vagrant/proyecto_redes_1/usuarios_estructuras.csv")

