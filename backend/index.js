// backend/index.js (FINAL FIX)
require('dotenv').config(); // Siempre debe estar al inicio
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('./db');

// FIX 1: LEER LA CLAVE SECRETA Y ASEGURAR QUE NO ES NULA
// Usamos let para permitir la reasignación si no se encuentra en .env
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn("ADVERTENCIA: JWT_SECRET no está definido en .env. Usando clave de fallback.");
    JWT_SECRET = 'CLAVE_EMERGENCIA_FALLBACK';
}

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '..', 'src')));


// ---------------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN (Sin cambios funcionales)
// ---------------------------------------------------------------------

// Ruta /register (O2H1 y O11H6)
app.post('/register', async (req, res) => {
    // ... (Lógica de registro sin cambios) ...
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.NVarChar(100), username)
            .input('email', sql.NVarChar(200), email)
            .input('passwordHash', sql.NVarChar(256), passwordHash)
            .query(`INSERT INTO Users (Username, Email, PasswordHash, RoleID) VALUES (@username, @email, @passwordHash, 1);`);

        res.status(201).json({ success: true, message: '¡Registro exitoso! Ahora puedes iniciar sesión.' });

    } catch (err) {
        console.error('Error en el registro:', err);
        let message = 'Error al registrar el usuario.';
        if (err.number === 2627 || err.message.includes('UNIQUE KEY constraint')) {
            message = 'El correo electrónico ya está registrado.';
        }
        res.status(400).json({ success: false, message: message });
    }
});

// Ruta /login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Faltan credenciales.' });

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar(100), username)
            .query(`SELECT UserID, Username, PasswordHash, RoleID FROM Users WHERE Username = @username;`);

        const user = result.recordset[0];
        if (!user) return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);

        if (isMatch) {
            const roleName = (user.RoleID === 2 ? 'admin' : 'user');
            const token = jwt.sign(
                { userId: user.UserID, username: user.Username, role: roleName },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.status(200).json({ success: true, token: token, redirect: '/index.html' });
        } else {
            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
        }

    } catch (err) {
        console.error('Error en el inicio de sesión:', err);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});


// ---------------------------------------------------------------------
// MIDDLEWARE DE AUTENTICACIÓN (PROTECCIÓN)
// ---------------------------------------------------------------------
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: "Acceso denegado. Token requerido." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT Verification Failed:', err);
            return res.status(403).json({ message: "Token inválido o expirado." });
        }
        req.user = user;
        next();
    });
};


// ---------------------------------------------------------------------
// RUTAS PROTEGIDAS
// ---------------------------------------------------------------------

// RUTA PROTEGIDA: /api/profile/me (O6H3) - Perfil de Usuario
app.get('/api/profile/me', authenticateToken, async (req, res) => {
    // ... (Lógica sin cambios) ...
    try {
        const pool = await poolPromise;
        const userId = req.user.userId;

        const userResult = await pool.request().input('userId', sql.Int, userId)
            .query(`SELECT UserID, Username, Email, CreatedAt FROM Users WHERE UserID = @userId;`);

        const imagesResult = await pool.request().input('userId', sql.Int, userId)
            .query(`SELECT ImageID, Title, ImageUrl, Description, CreatedAt FROM Images WHERE UserID = @userId ORDER BY CreatedAt DESC;`);

        if (!userResult.recordset.length) return res.status(404).json({ message: "Perfil no encontrado." });

        res.json({
            user: userResult.recordset[0],
            images: imagesResult.recordset,
        });

    } catch (err) {
        console.error('Error al obtener perfil:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});


// RUTA PROTEGIDA: /api/admin/dashboard (O12H2 y O15H11) - Dashboard de Admin
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso prohibido. Se requiere rol de administrador.' });
    }

    // FIX 2: Inicializar stats y usersList fuera del try para que sean accesibles en el catch
    let stats = {};
    let usersList = { recordset: [] };

    try {
        const pool = await poolPromise;

        // 2. Obtener estadísticas clave (Contadores simples)
        const usersCount = await pool.request().query('SELECT COUNT(UserID) AS TotalUsers FROM Users');
        stats.totalUsers = usersCount.recordset[0].TotalUsers;

        const imagesCount = await pool.request().query('SELECT COUNT(ImageID) AS TotalImages FROM Images');
        stats.totalImages = imagesCount.recordset[0].TotalImages;

        const likesCount = await pool.request().query('SELECT COUNT(LikeID) AS TotalLikes FROM Likes');
        stats.totalLikes = likesCount.recordset[0].TotalLikes;

        // 3. Obtener listado de usuarios con datos de actividad (CONSULTA OPTIMIZADA)
        usersList = await pool.request().query(`
            SELECT 
                U.UserID,
                U.Username,
                U.Email,
                ISNULL(COUNT(DISTINCT I.ImageID), 0) AS NumFotos,
                ISNULL(COUNT(L.LikeID), 0) AS LikesRecibidos
            FROM Users U
            LEFT JOIN Images I ON U.UserID = I.UserID
            LEFT JOIN Likes L ON I.ImageID = L.ImageID
            
            GROUP BY U.UserID, U.Username, U.Email
            ORDER BY U.UserID DESC;
        `);

        // La ejecución fue exitosa, devolvemos los datos
        res.json({
            success: true,
            stats: stats,
            usersList: usersList.recordset
        });

    } catch (err) {
        // Si hay un error SQL, lo capturamos
        console.error('Error al cargar el Dashboard Admin:', err);
        // Devolvemos 500 (Error de servidor)
        res.status(500).json({ message: 'Error interno al cargar datos del administrador.' });
    }
});


// Ruta para servir el index.html por defecto
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});


module.exports = app;

app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));