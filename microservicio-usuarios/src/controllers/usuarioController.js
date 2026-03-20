const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Registro
const registrar = async (req, res) => { // Controlador para registrar un nuevo usuario. Recibe los datos del usuario (nombre, email, password y rol) desde el cuerpo de la solicitud. Verifica si el email ya está registrado, encripta la contraseña utilizando bcrypt, y luego inserta el nuevo usuario en la base de datos. Si el rol es "vendedor", el estado del usuario se establece como "pendiente" hasta que un administrador lo apruebe. Responde con un mensaje adecuado según el resultado del registro.
    const { nombre, email, password, rol } = req.body;
    try {
        // Verificar si el email ya existe
        const [existe] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.status(400).json({ error: 'El email ya está registrado' });

        const hash = await bcrypt.hash(password, 10); // Encripta la contraseña utilizando bcrypt con un salt de 10 rondas. Esto asegura que las contraseñas se almacenen de forma segura en la base de datos, protegiendo contra ataques de fuerza bruta y otros métodos de cracking de contraseñas.
        const estado = rol === 'vendedor' ? 'pendiente' : 'activo';
        const rolFinal = rol || 'comprador';

        const [result] = await db.execute(
            'INSERT INTO usuarios (nombre, email, password, rol, estado) VALUES (?,?,?,?,?)',
            [nombre, email, hash, rolFinal, estado]
        );
        res.status(201).json({
            mensaje: rol === 'vendedor'
                ? 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.'
                : 'Usuario registrado exitosamente',
            id: result.insertId,
            estado
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Login
const login = async (req, res) => { // Controlador para el inicio de sesión de un usuario. Recibe el email y la contraseña desde el cuerpo de la solicitud. Busca el usuario en la base de datos por su email, verifica que exista y que su estado no sea "pendiente" o "rechazado". Luego compara la contraseña proporcionada con la contraseña almacenada utilizando bcrypt. Si la autenticación es exitosa, genera un token JWT que incluye el ID y el rol del usuario, y responde con el token y los datos básicos del usuario.
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]); // Busca el usuario en la base de datos utilizando su email. Si no se encuentra ningún usuario con ese email, responde con un error 404 indicando que el usuario no fue encontrado.
        if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

        const user = rows[0];

        if (user.estado === 'pendiente')
            return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
        if (user.estado === 'rechazado')
            return res.status(403).json({ error: 'Tu cuenta fue rechazada. Contacta al administrador' });

        const valid = await bcrypt.compare(password, user.password); // Compara la contraseña proporcionada con la contraseña almacenada en la base de datos utilizando bcrypt. Si las contraseñas no coinciden, responde con un error 401 indicando que la contraseña es incorrecta.
        if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign( // Genera un token JWT utilizando jsonwebtoken. El token incluye el ID y el rol del usuario en su payload, y se firma con una clave secreta definida en las variables de entorno. El token tiene una expiración de 8 horas, lo que significa que el usuario deberá volver a autenticarse después de ese período para obtener un nuevo token.
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );
        res.json({
            token,
            usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener perfil propio
const obtenerPerfil = async (req, res) => { // Controlador para obtener el perfil del usuario autenticado. Utiliza el ID del usuario que se encuentra en el objeto req.usuario (establecido por el middleware de autenticación) para buscar los datos del usuario en la base de datos. Si el usuario no se encuentra, responde con un error 404. Si se encuentra, responde con los datos básicos del usuario (ID, nombre, email, rol, estado y fecha de registro).
    try {
        const [rows] = await db.execute(
            'SELECT id, nombre, email, rol, estado, fecha_registro FROM usuarios WHERE id = ?',
            [req.usuario.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Listar todos (admin)
const listarUsuarios = async (req, res) => { // Controlador para listar todos los usuarios. Este controlador está destinado a ser utilizado por administradores. Consulta la base de datos para obtener una lista de todos los usuarios, ordenados por fecha de registro en orden descendente. Responde con un array de objetos que contienen los datos básicos de cada usuario (ID, nombre, email, rol, estado y fecha de registro). Si ocurre algún error durante la consulta a la base de datos, responde con un error 500.
    try {
        const [rows] = await db.execute(
            'SELECT id, nombre, email, rol, estado, fecha_registro FROM usuarios ORDER BY fecha_registro DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Aprobar o rechazar vendedor (admin)
const actualizarEstado = async (req, res) => { // Controlador para actualizar el estado de un usuario vendedor. Este controlador está destinado a ser utilizado por administradores para aprobar o rechazar cuentas de vendedores. Recibe el ID del usuario a actualizar desde los parámetros de la ruta y el nuevo estado desde el cuerpo de la solicitud. Verifica que el nuevo estado sea válido (debe ser "activo", "pendiente" o "rechazado"). Si el estado no es válido, responde con un error 400. Luego, actualiza el estado del usuario en la base de datos. Si no se encuentra ningún usuario con el ID proporcionado, responde con un error 404. Si la actualización es exitosa, responde con un mensaje indicando que el estado del usuario ha sido actualizado.
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ['activo', 'pendiente', 'rechazado'];
    if (!estadosValidos.includes(estado))
        return res.status(400).json({ error: 'Estado no válido' });
    try {
        const [result] = await db.execute('UPDATE usuarios SET estado = ? WHERE id = ?', [estado, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ mensaje: `Estado del usuario ${id} actualizado a: ${estado}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar usuario (admin)
const eliminarUsuario = async (req, res) => { // Controlador para eliminar un usuario. Este controlador está destinado a ser utilizado por administradores para eliminar cuentas de usuarios. Recibe el ID del usuario a eliminar desde los parámetros de la ruta. Intenta eliminar el usuario de la base de datos utilizando su ID. Si no se encuentra ningún usuario con el ID proporcionado, responde con un error 404. Si la eliminación es exitosa, responde con un mensaje indicando que el usuario ha sido eliminado correctamente. Si ocurre algún error durante la operación, responde con un error 500.
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ mensaje: `Usuario ${id} eliminado correctamente` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registrar, login, obtenerPerfil, listarUsuarios, actualizarEstado, eliminarUsuario };
