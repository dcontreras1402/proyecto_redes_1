import csv
import mysql.connector

def insertar_usuarios_desde_csv(ruta_csv):
    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        password="tu_password",
        database="tu_base_de_datos"
    )
    cursor = conexion.cursor()
    
    query = """
        INSERT INTO usuarios (
            id, nombre, email, password, rol, estado, fecha_creacion, 
            cupo_total, cupo_disponible, cupo_usado, 
            veces_cupo_completo, compras_completadas
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            nombre=VALUES(nombre), email=VALUES(email), password=VALUES(password),
            rol=VALUES(rol), estado=VALUES(estado), fecha_creacion=VALUES(fecha_creacion),
            cupo_total=VALUES(cupo_total), cupo_disponible=VALUES(cupo_disponible),
            cupo_usado=VALUES(cupo_usado), veces_cupo_completo=VALUES(veces_cupo_completo),
            compras_completadas=VALUES(compras_completadas)
    """
    
    with open(ruta_csv, mode="r", encoding="utf-8") as archivo:
        lector_csv = csv.reader(archivo)
        next(lector_csv)
        
        datos_a_insertar = []
        for fila in lector_csv:
            datos_a_insertar.append((
                int(fila[0]), fila[1], fila[2], fila[3], fila[4], fila[5], fila[6],
                float(fila[7]), float(fila[8]), float(fila[9]), int(fila[10]), int(fila[11])
            ))
            
        cursor.executemany(query, datos_a_insertar)
        conexion.commit()
        
    cursor.close()
    conexion.close()

if __name__ == "__main__":
    insertar_usuarios_desde_csv("usuarios_estructura.csv")