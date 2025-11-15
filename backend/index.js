require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); // para el cifrado de contraseñas
const { poolPromise, sql } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json()); // para manejar cuerpos JSON (del fetch del frontend)
app.use(express.urlencoded({ extended: true }));

// servir archivos estáticos (HTML, CSS, JS) desde la raíz del proyecto
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '..', 'src')));


// ---------------------------------------------------------------------
// ruta: (/register) - Implementa O2H1 y O11H6
// ---------------------------------------------------------------------
app.post('/register', async (req, res) => {
    // Los datos vienen del fetch del frontend
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    }

    try {
        // O11H6: hashing de contraseña antes de guardarla
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.NVarChar(100), username)
            .input('email', sql.NVarChar(200), email)
            .input('passwordHash', sql.NVarChar(256), passwordHash)
            .query(`
                INSERT INTO Users (Username, Email, PasswordHash, RoleID)
                VALUES (@username, @email, @passwordHash, 1);
            `); // 1 es el RoleID de user por defecto

        res.status(201).json({
            success: true,
            message: '¡Registro exitoso! Ahora puedes iniciar sesión.'
        });

    } catch (err) {
        console.error('Error en el registro:', err);
        let message = 'Error al registrar el usuario.';

        // manejar la violación de la restricción unique (email ya existe)
        if (err.number === 2627 || err.message.includes('UNIQUE KEY constraint')) {
            message = 'El correo electrónico ya está registrado.';
        }

        res.status(400).json({ success: false, message: message });
    }
});

// ---------------------------------------------------------------------
// ruta: (/login)
// ---------------------------------------------------------------------
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Faltan credenciales.' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar(100), username)
            .query(`
                SELECT UserID, PasswordHash 
                FROM Users 
                WHERE Username = @username;
            `);

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }

        // O11H6: comparar el hash almacenado con la contraseña ingresada
        const isMatch = await bcrypt.compare(password, user.PasswordHash);

        if (isMatch) {
            // éxito: redirigir al panel principal
            res.status(200).json({
                success: true,
                message: 'Inicio de sesión exitoso.',
                redirect: 'http://localhost:4000/home.html'
            });
        } else {
            // si la contraseña es incorrecta
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }

    } catch (err) {
        console.error('Error en el inicio de sesión:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// ruta para servir el index.html por defecto
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));