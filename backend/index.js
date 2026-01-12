// backend/index.js (FINAL FIX)
require('dotenv').config(); // Siempre debe estar al inicio
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // NECESARIO PARA SUBIR FOTOS
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

// 1. Esto permite que http://localhost:4000/uploads/foto.jpg funcione
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(path.join(__dirname, '..', 'src')));

// --- CONFIGURACIÓN MULTER (SUBIDA DE ARCHIVOS) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Asegúrate de crear la carpeta 'uploads' dentro de 'backend'
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
    // Extensiones permitidas
    const allowedExtensions = /jpeg|jpg|png/;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedExtensions.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen en formato .jpg, .jpeg o .png'));
    }
};

// Límite de tamaño y configuración final de multer
//Multer significa que los archivos subidos se manejarán correctamente.

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
});

// ---------------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN (Sin cambios funcionales)
// ---------------------------------------------------------------------

// Ruta /register (O2H1 y O11H6)
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios.' });
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
            if (err.message.includes(email)) {
                message = 'El correo electrónico ya está registrado.';
            } else if (err.message.includes(username)) {
                message = 'El nombre de usuario ya no esta disponible.';
            } else {
                message = 'El nombre de usuario o correo electrónico ya están en uso.';
            }
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
                { expiresIn: '48h' }
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
            .query(`SELECT ImageID, ImageUrl, Description, CreatedAt FROM Images WHERE UserID = @userId ORDER BY CreatedAt DESC;`);

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

// RUTA PROTEGIDA: /api/profile/update - Actualizar Perfil de Usuario
app.put('/api/profile/update', authenticateToken, async (req, res) => {
    const { username, email, currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!username || !email) {
        return res.status(400).json({ success: false, message: 'El nombre de usuario y el email son obligatorios.' });
    }

    try {
        const pool = await poolPromise;

        // Obtener datos actuales del usuario
        const userResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`SELECT Username, Email, PasswordHash FROM Users WHERE UserID = @userId;`);

        if (!userResult.recordset.length) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        const currentUser = userResult.recordset[0];

        // Si se quiere cambiar la contraseña, verificar la contraseña actual
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Debes proporcionar tu contraseña actual para cambiarla.'
                });
            }

            // Verificar que la contraseña actual sea correcta
            const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.PasswordHash);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'La contraseña actual es incorrecta.'
                });
            }

            // Validar longitud de nueva contraseña
            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'La nueva contraseña debe tener al menos 6 caracteres.'
                });
            }

            // Hash de la nueva contraseña
            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Actualizar con nueva contraseña
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('username', sql.NVarChar(100), username)
                .input('email', sql.NVarChar(200), email)
                .input('passwordHash', sql.NVarChar(256), newPasswordHash)
                .query(`
                    UPDATE Users 
                    SET Username = @username, 
                        Email = @email, 
                        PasswordHash = @passwordHash 
                    WHERE UserID = @userId;
                `);

            return res.status(200).json({
                success: true,
                message: 'Perfil y contraseña actualizados correctamente.'
            });

        } else {
            // Solo actualizar username y email (sin cambiar contraseña)
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('username', sql.NVarChar(100), username)
                .input('email', sql.NVarChar(200), email)
                .query(`
                    UPDATE Users 
                    SET Username = @username, 
                        Email = @email 
                    WHERE UserID = @userId;
                `);

            return res.status(200).json({
                success: true,
                message: 'Perfil actualizado correctamente.'
            });
        }

    } catch (err) {
        console.error('Error al actualizar perfil:', err);

        // Manejo de errores de duplicados
        if (err.number === 2627 || err.message.includes('UNIQUE KEY constraint')) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico ya está registrado por otro usuario.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar el perfil.'
        });
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
        const usersCount = await pool.request().query('SELECT COUNT(UserID) AS TotalUsers FROM Users WHERE RoleID = 1');
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
            WHERE U.RoleID = 1
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

// ==============================================================================
// RUTAS DE EDICIÓN Y ELIMINACIÓN (deben ir ANTES de las rutas GET con parámetros)
// ==============================================================================

// EDITAR PUBLICACIÓN COMPLETA (descripción y canciones)
app.put('/api/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { imageId } = req.params;
        const { description, songs } = req.body;

        console.log('PUT /api/images/:imageId - Datos recibidos:', { imageId, description, songs });

        if (!description || description.trim().length === 0) {
            return res.status(400).json({ error: 'La descripción no puede estar vacía' });
        }

        // Verificar propietario
        const checkOwner = await pool.request()
            .input('iid', sql.Int, imageId)
            .input('uid', sql.Int, req.user.userId)
            .query(`
                SELECT ImageID 
                FROM Images 
                WHERE ImageID = @iid AND UserID = @uid
            `);

        if (checkOwner.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta publicación' });
        }

        // Actualizar descripción
        const updateResult = await pool.request()
            .input('iid', sql.Int, imageId)
            .input('desc', sql.NVarChar, description)
            .query(`
                UPDATE Images
                SET Description = @desc
                WHERE ImageID = @iid
            `);

        console.log('Descripción actualizada. Filas afectadas:', updateResult.rowsAffected);

        // Actualizar canciones si se proporcionaron
        if (songs && Array.isArray(songs) && songs.length > 0) {
            // Obtener canciones actuales asociadas a esta imagen
            const currentSongs = await pool.request()
                .input('iid', sql.Int, imageId)
                .query(`
                    SELECT s.SongID, s.Title, s.ExternalURL, isg.Position
                    FROM Songs s
                    INNER JOIN ImageSongs isg ON s.SongID = isg.SongID
                    WHERE isg.ImageID = @iid
                    ORDER BY isg.Position
                `);

            console.log('Canciones actuales:', currentSongs.recordset.length);

            // Actualizar cada canción
            for (let i = 0; i < Math.min(songs.length, currentSongs.recordset.length); i++) {
                const song = songs[i];
                const currentSong = currentSongs.recordset[i];

                if (song.title && song.url) {
                    const songUpdateResult = await pool.request()
                        .input('sid', sql.Int, currentSong.SongID)
                        .input('title', sql.NVarChar, song.title)
                        .input('url', sql.NVarChar, song.url)
                        .query(`
                            UPDATE Songs
                            SET Title = @title, ExternalURL = @url
                            WHERE SongID = @sid
                        `);
                    console.log(`Canción ${i + 1} actualizada. Filas afectadas:`, songUpdateResult.rowsAffected);
                }
            }
        }

        console.log('Publicación actualizada correctamente');
        res.json({ message: 'Publicación actualizada correctamente' });

    } catch (e) {
        console.error('Error al editar publicación:', e);
        res.status(500).json({ error: e.message });
    }
});

// EDITAR SOLO DESCRIPCIÓN (mantener compatibilidad)
app.put('/api/images/:imageId/description', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { imageId } = req.params;
        const { description } = req.body;

        if (!description || description.trim().length === 0) {
            return res.status(400).json({ error: 'La descripción no puede estar vacía' });
        }

        // Verificar propietario
        const checkOwner = await pool.request()
            .input('iid', sql.Int, imageId)
            .input('uid', sql.Int, req.user.userId)
            .query(`
                SELECT ImageID 
                FROM Images 
                WHERE ImageID = @iid AND UserID = @uid
            `);

        if (checkOwner.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta descripción' });
        }

        // Actualizar descripción
        await pool.request()
            .input('iid', sql.Int, imageId)
            .input('desc', sql.NVarChar, description)
            .query(`
                UPDATE Images
                SET Description = @desc
                WHERE ImageID = @iid
            `);

        res.json({ message: 'Descripción actualizada correctamente' });

    } catch (e) {
        console.error('Error al editar descripción:', e);
        res.status(500).json({ error: e.message });
    }
});

// ELIMINAR PUBLICACIÓN (solo dueño)
app.delete('/api/images/:id', authenticateToken, async (req, res) => {
    const imageId = parseInt(req.params.id, 10);
    const userId = req.user.userId;

    if (isNaN(imageId)) {
        return res.status(400).json({ error: 'ID de imagen inválido' });
    }

    try {
        const pool = await poolPromise;

        // Verificar existencia y dueño
        const imageResult = await pool.request()
            .input('imageId', sql.Int, imageId)
            .query(`
                SELECT UserID
                FROM Images
                WHERE ImageID = @imageId
            `);

        if (imageResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        if (imageResult.recordset[0].UserID !== userId) {
            return res.status(403).json({ error: 'No autorizado para eliminar esta publicación' });
        }

        // Eliminación en orden correcto
        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Notifications WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Likes WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Comments WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM SongVotes WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM ImageSongs WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Images WHERE ImageID = @imageId');

        res.json({ message: 'Publicación eliminada correctamente' });

    } catch (err) {
        console.error('Error al eliminar publicación:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// ---------------------------------------------------------------------
// RUTA: /api/images/:categoryId (FEED DINÁMICO - O4H8)
// ---------------------------------------------------------------------
app.get('/api/images/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;

    // Validar que el ID sea numérico para evitar inyecciones SQL
    if (isNaN(parseInt(categoryId))) {
        return res.status(400).json({ success: false, message: 'ID de categoría inválido.' });
    }

    try {
        const pool = await poolPromise;
        // CONSULTA FINAL: Obtener imágenes de la categoría especificada con contadores y canciones.
        const imagesResult = await pool.request()
            .input('categoryId', sql.Int, categoryId) // Usamos el ID para filtrar
            .query(`
                SELECT 
                    I.ImageID,
                    I.Description,
                    I.ImageURL,
                    U.Username AS UploaderUsername,
                    
                    -- Contar Likes para cada imagen (usando subconsulta simple)
                    (SELECT COUNT(LikeID) FROM Likes WHERE ImageID = I.ImageID) AS LikesCount,
                    
                    -- Agregar detalles de las canciones y votos (JSON FOR PATH)
                    (
                        SELECT 
                            S.SongID, 
                            S.ExternalURL,
                            ISNULL(V.VoteCount, 0) AS VoteCount
                        FROM ImageSongs ISG
                        JOIN Songs S ON ISG.SongID = S.SongID
                        LEFT JOIN (
                            SELECT SongID, COUNT(SongVoteID) AS VoteCount
                            FROM SongVotes
                            GROUP BY SongID
                        ) AS V ON S.SongID = V.SongID
                        WHERE ISG.ImageID = I.ImageID
                        FOR JSON PATH
                    ) AS SongsData
                FROM Images I
                JOIN Users U ON I.UserID = U.UserID
                WHERE I.CategoryID = @categoryId  -- <<-- FILTRO CRUCIAL
                ORDER BY I.CreatedAt DESC;
            `);

        // Mapear y parsear los resultados
        const images = imagesResult.recordset.map(img => ({
            ImageID: img.ImageID,
            Description: img.Description,
            ImageURL: img.ImageURL,
            UploaderUsername: img.UploaderUsername,
            LikesCount: img.LikesCount,
            Songs: img.SongsData ? JSON.parse(img.SongsData) : []
        }));

        res.json(images);

    } catch (err) {
        console.error(`Error FATAL al obtener feed de categoría ${categoryId}:`, err);
        res.status(500).json({ success: false, message: 'Error interno del servidor al cargar el feed.' });
    }
})

/*desde aqui */
// 3. SUBIR CONTENIDO (CORREGIDO: Usa poolPromise y req.user.userId)
app.post('/api/upload', authenticateToken, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Error de multer
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: 'La imagen es muy grande. El tamaño máximo es 5MB' });
            }
            return res.status(400).json({ message: 'Error al subir la imagen: ' + err.message });
        } else if (err) {
            // Error del filtro de archivo
            return res.status(400).json({ message: err.message });
        }
        next();
    });
}, async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Falta la imagen' });

    // Corrección importante: req.user.userId (porque así lo guardaste en el login)
    const userId = req.user.userId;
    const { description, category, songs } = req.body;
    // URL accesible desde el frontend
    const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

    let songList = [];
    try { songList = JSON.parse(songs); } catch (e) { }

    // Usamos la conexión existente
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // A. Obtener ID Categoría
        const catReq = new sql.Request(transaction);
        const catRes = await catReq.input('cName', sql.NVarChar, category)
            .query('SELECT CategoryID FROM Categories WHERE Name = @cName');

        if (catRes.recordset.length === 0) throw new Error('Categoría inválida: ' + category);
        const categoryId = catRes.recordset[0].CategoryID;

        // B. Insertar Imagen
        const imgReq = new sql.Request(transaction);
        const imgRes = await imgReq
            .input('uid', sql.Int, userId)
            .input('cid', sql.Int, categoryId)
            .input('desc', sql.NVarChar, description)
            .input('url', sql.NVarChar, imageUrl)
            .query('INSERT INTO Images (UserID, CategoryID, Description, ImageURL) OUTPUT INSERTED.ImageID VALUES (@uid, @cid, @desc, @url)');

        const newImageId = imgRes.recordset[0].ImageID;

        // C. Insertar Canciones
        for (let i = 0; i < songList.length; i++) {
            const s = songList[i];
            if (s.title && s.link) {
                // Insertar Canción
                const songReq = new sql.Request(transaction);
                const songRes = await songReq
                    .input('st', sql.NVarChar, s.title)
                    .input('su', sql.NVarChar, s.link)
                    .query('INSERT INTO Songs (Title, ExternalURL) OUTPUT INSERTED.SongID VALUES (@st, @su)');

                const newSongId = songRes.recordset[0].SongID;

                // Vincular
                const linkReq = new sql.Request(transaction);
                await linkReq
                    .input('iid', sql.Int, newImageId)
                    .input('sid', sql.Int, newSongId)
                    .input('pos', sql.TinyInt, i + 1)
                    .query('INSERT INTO ImageSongs (ImageID, SongID, Position) VALUES (@iid, @sid, @pos)');
            }
        }

        await transaction.commit();
        res.json({ message: 'Publicado con éxito' });

    } catch (err) {
        if (transaction._aborted === false) await transaction.rollback(); // Rollback solo si no abortó ya
        console.error("Error upload:", err);
        res.status(500).json({ error: 'Error al guardar en BD: ' + err.message });
    }
});

// 4. FEED POR CATEGORÍA
app.get('/api/images/:categoryName', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('cat', sql.NVarChar, req.params.categoryName)
            .query(`
                SELECT i.ImageID, i.Description, i.ImageURL, u.Username,
                       (SELECT COUNT(*) FROM Likes WHERE ImageID = i.ImageID) as LikesCount
                FROM Images i
                JOIN Categories c ON i.CategoryID = c.CategoryID
                JOIN Users u ON i.UserID = u.UserID
                WHERE c.Name = @cat
                ORDER BY i.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. DETALLE IMAGEN
app.get('/api/image-detail/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const imgRes = await pool.request().input('id', sql.Int, req.params.id).query(`
            SELECT i.*, u.Username, c.Name as CategoryName
            FROM Images i
            JOIN Users u ON i.UserID = u.UserID
            JOIN Categories c ON i.CategoryID = c.CategoryID
            WHERE i.ImageID = @id
        `);
        if (imgRes.recordset.length === 0) return res.status(404).json({ message: 'No encontrado' });

        const songsRes = await pool.request().input('id', sql.Int, req.params.id).query(`
            SELECT s.SongID, s.Title, s.ExternalURL, ims.Position,
                   (SELECT COUNT(*) FROM SongVotes sv WHERE sv.SongID = s.SongID AND sv.ImageID = @id) as Votes
            FROM ImageSongs ims
            JOIN Songs s ON ims.SongID = s.SongID
            WHERE ims.ImageID = @id
            ORDER BY ims.Position ASC
        `);
        res.json({ image: imgRes.recordset[0], songs: songsRes.recordset });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==============================================================================
// 6. COMENTARIOS Y VOTOS
// ==============================================================================
// Historia de Usuario O10H5: Eliminar o editar mis propios comentarios
// para corregir errores o información equivocada.
// ==============================================================================

// Obtener comentarios de una imagen (incluye UserID para identificar comentarios propios)
app.get('/api/comments/:imageId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().input('iid', sql.Int, req.params.imageId).query(`
            SELECT c.CommentID, c.Content, c.CreatedAt, c.UserID, u.Username
            FROM Comments c
            JOIN Users u ON c.UserID = u.UserID
            WHERE c.ImageID = @iid ORDER BY c.CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/comments', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { imageId, text } = req.body;
        const userId = req.user.userId;

        await pool.request()
            .input('uid', sql.Int, userId)
            .input('iid', sql.Int, imageId)
            .input('txt', sql.NVarChar, text)
            .query('INSERT INTO Comments (UserID, ImageID, Content) VALUES (@uid, @iid, @txt)');

        // Obtener el dueño de la imagen para crear notificación
        const imageOwner = await pool.request()
            .input('iid', sql.Int, imageId)
            .query('SELECT UserID FROM Images WHERE ImageID = @iid');

        // Crear notificación solo si el comentario no es del mismo dueño
        if (imageOwner.recordset.length > 0 && imageOwner.recordset[0].UserID !== userId) {
            const notifRequest = pool.request()
                .input('receiver', sql.Int, imageOwner.recordset[0].UserID)
                .input('sender', sql.Int, userId)
                .input('imageId', sql.Int, imageId)
                .input('type', sql.NVarChar(20), 'comment')
                .input('commentText', sql.NVarChar(100), text.substring(0, 100));
            
            // Insertar la notificación (permitir duplicados para cada comentario)
            await notifRequest.query(`
                INSERT INTO Notifications (ReceiverID, SenderID, ImageID, Type, CommentText) 
                VALUES (@receiver, @sender, @imageId, @type, @commentText)
            `);
        }

        res.json({ message: 'Comentario guardado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==============================================================================
// EDITAR COMENTARIO PROPIO (O10H5)
// Permite al usuario editar solo sus propios comentarios
// ==============================================================================
app.put('/api/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { commentId } = req.params;
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'El comentario no puede estar vacío' });
        }

        // Verificar que el comentario pertenece al usuario
        const checkOwner = await pool.request()
            .input('cid', sql.Int, commentId)
            .input('uid', sql.Int, req.user.userId)
            .query('SELECT CommentID FROM Comments WHERE CommentID = @cid AND UserID = @uid');

        if (checkOwner.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para editar este comentario' });
        }

        // Actualizar el comentario
        await pool.request()
            .input('cid', sql.Int, commentId)
            .input('txt', sql.NVarChar, text)
            .query('UPDATE Comments SET Content = @txt WHERE CommentID = @cid');

        res.json({ message: 'Comentario actualizado exitosamente' });
    } catch (e) {
        console.error('Error al editar comentario:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// ELIMINAR COMENTARIO PROPIO (O10H5)
// Permite al usuario eliminar solo sus propios comentarios
// ==============================================================================
app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { commentId } = req.params;

        // Verificar que el comentario pertenece al usuario
        const checkOwner = await pool.request()
            .input('cid', sql.Int, commentId)
            .input('uid', sql.Int, req.user.userId)
            .query('SELECT CommentID FROM Comments WHERE CommentID = @cid AND UserID = @uid');

        if (checkOwner.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' });
        }

        // Eliminar el comentario
        await pool.request()
            .input('cid', sql.Int, commentId)
            .query('DELETE FROM Comments WHERE CommentID = @cid');

        res.json({ message: 'Comentario eliminado exitosamente' });
    } catch (e) {
        console.error('Error al eliminar comentario:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------------------------------------------------------------------
// API: Votar por una canción (O17H12 - Solo un voto por imagen)
// ---------------------------------------------------------------------
app.post('/api/vote', authenticateToken, async (req, res) => {
    const { imageId, songId } = req.body;
    const userId = req.user.userId;

    if (!imageId || !songId) {
        return res.status(400).json({ error: 'Faltan parámetros de imagen o canción.' });
    }

    try {
        const pool = await poolPromise;

        // 1. Verificar si el usuario ya tiene un voto registrado en ESTA IMAGEN
        // (No importa por qué canción sea, buscamos el UserID + ImageID)
        const checkVote = await pool.request()
            .input('uid', sql.Int, userId)
            .input('iid', sql.Int, imageId)
            .query('SELECT SongID FROM SongVotes WHERE UserID = @uid AND ImageID = @iid');

        if (checkVote.recordset.length > 0) {
            const currentSongIdVoted = checkVote.recordset[0].SongID;

            // Si ya votó por la MISMA canción, informamos al usuario
            if (currentSongIdVoted === parseInt(songId)) {
                return res.status(400).json({ message: 'Ya has votado por esta canción.' });
            }

            // 2. Si ya votó por OTRA canción de la misma imagen, ACTUALIZAMOS el voto
            // Esto cumple el criterio de "cambiar el voto por otra canción"
            await pool.request()
                .input('uid', sql.Int, userId)
                .input('iid', sql.Int, imageId)
                .input('sid', sql.Int, songId)
                .query(`
                    UPDATE SongVotes 
                    SET SongID = @sid, CreatedAt = SYSUTCDATETIME() 
                    WHERE UserID = @uid AND ImageID = @iid
                `);

            // Obtener el dueño de la imagen para crear notificación al cambiar voto
            const imageOwnerUpdate = await pool.request()
                .input('iid', sql.Int, imageId)
                .query('SELECT UserID FROM Images WHERE ImageID = @iid');

            // Crear notificación solo si el voto no es del mismo dueño
            if (imageOwnerUpdate.recordset.length > 0 && imageOwnerUpdate.recordset[0].UserID !== userId) {
                console.log('[VOTE CHANGE NOTIFICATION] Creando notificación de cambio de voto:', {
                    receiver: imageOwnerUpdate.recordset[0].UserID,
                    sender: userId,
                    imageId: imageId,
                    type: 'vote'
                });
                
                await pool.request()
                    .input('receiver', sql.Int, imageOwnerUpdate.recordset[0].UserID)
                    .input('sender', sql.Int, userId)
                    .input('imageId', sql.Int, imageId)
                    .input('type', sql.NVarChar(20), 'vote')
                    .query(`
                        INSERT INTO Notifications (ReceiverID, SenderID, ImageID, Type) 
                        VALUES (@receiver, @sender, @imageId, @type)
                    `);
                
                console.log('[VOTE CHANGE NOTIFICATION] Notificación creada exitosamente');
            }

            return res.json({ success: true, message: 'Tu voto ha sido cambiado con éxito.' });
        }

        // 3. Si no ha votado nunca en esta imagen, REGISTRAMOS un nuevo voto
        await pool.request()
            .input('uid', sql.Int, userId)
            .input('iid', sql.Int, imageId)
            .input('sid', sql.Int, songId)
            .query('INSERT INTO SongVotes (UserID, ImageID, SongID) VALUES (@uid, @iid, @sid)');

        // Obtener el dueño de la imagen para crear notificación
        const imageOwner = await pool.request()
            .input('iid', sql.Int, imageId)
            .query('SELECT UserID FROM Images WHERE ImageID = @iid');

        // Crear notificación solo si el voto no es del mismo dueño
        if (imageOwner.recordset.length > 0 && imageOwner.recordset[0].UserID !== userId) {
            console.log('[VOTE NOTIFICATION] Creando notificación de voto:', {
                receiver: imageOwner.recordset[0].UserID,
                sender: userId,
                imageId: imageId,
                type: 'vote'
            });
            
            await pool.request()
                .input('receiver', sql.Int, imageOwner.recordset[0].UserID)
                .input('sender', sql.Int, userId)
                .input('imageId', sql.Int, imageId)
                .input('type', sql.NVarChar(20), 'vote')
                .query(`
                    INSERT INTO Notifications (ReceiverID, SenderID, ImageID, Type) 
                    VALUES (@receiver, @sender, @imageId, @type)
                `);
            
            console.log('[VOTE NOTIFICATION] Notificación creada exitosamente');
        }

        res.json({ success: true, message: 'Voto registrado exitosamente.' });

    } catch (e) {
        console.error('Error al procesar el voto:', e);
        res.status(500).json({ error: 'Error interno al procesar el voto.' });
    }
});

// LIKES EN IMÁGENES
app.post('/api/like', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { imageId } = req.body;

        // Verificar si ya dio like
        const checkLike = await pool.request()
            .input('uid', sql.Int, req.user.userId)
            .input('iid', sql.Int, imageId)
            .query('SELECT * FROM Likes WHERE UserID = @uid AND ImageID = @iid');

        if (checkLike.recordset.length > 0) {
            // Si ya existe, quitar like (toggle)
            await pool.request()
                .input('uid', sql.Int, req.user.userId)
                .input('iid', sql.Int, imageId)
                .query('DELETE FROM Likes WHERE UserID = @uid AND ImageID = @iid');
            
            // Eliminar notificación de like si existe
            await pool.request()
                .input('sender', sql.Int, req.user.userId)
                .input('imageId', sql.Int, imageId)
                .input('type', sql.NVarChar(20), 'like')
                .query('DELETE FROM Notifications WHERE SenderID = @sender AND ImageID = @imageId AND Type = @type');
        } else {
            // Si no existe, agregar like
            await pool.request()
                .input('uid', sql.Int, req.user.userId)
                .input('iid', sql.Int, imageId)
                .query('INSERT INTO Likes (UserID, ImageID) VALUES (@uid, @iid)');
            
            // Obtener el dueño de la imagen para crear notificación
            const imageOwner = await pool.request()
                .input('iid', sql.Int, imageId)
                .query('SELECT UserID FROM Images WHERE ImageID = @iid');
            
            // Crear notificación solo si el like no es del mismo dueño
            if (imageOwner.recordset.length > 0 && imageOwner.recordset[0].UserID !== req.user.userId) {
                await pool.request()
                    .input('receiver', sql.Int, imageOwner.recordset[0].UserID)
                    .input('sender', sql.Int, req.user.userId)
                    .input('imageId', sql.Int, imageId)
                    .input('type', sql.NVarChar(20), 'like')
                    .query(`
                        INSERT INTO Notifications (ReceiverID, SenderID, ImageID, Type) 
                        VALUES (@receiver, @sender, @imageId, @type)
                    `);
            }
        }

        // Obtener el conteo actualizado de likes
        const likesCount = await pool.request()
            .input('iid', sql.Int, imageId)
            .query('SELECT COUNT(*) as total FROM Likes WHERE ImageID = @iid');

        // Verificar el nuevo estado del usuario
        const userLike = await pool.request()
            .input('uid', sql.Int, req.user.userId)
            .input('iid', sql.Int, imageId)
            .query('SELECT * FROM Likes WHERE UserID = @uid AND ImageID = @iid');

        res.json({
            message: userLike.recordset.length > 0 ? 'Like agregado' : 'Like removido',
            liked: userLike.recordset.length > 0,
            totalLikes: likesCount.recordset[0].total
        });
    } catch (e) {
        console.error('Error al dar like:', e);
        res.status(500).json({ error: 'Error al procesar el like' });
    }
});

// Obtener estado de like y conteo
app.get('/api/like-status/:imageId', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;

        // Contar likes totales
        const likesCount = await pool.request()
            .input('iid', sql.Int, req.params.imageId)
            .query('SELECT COUNT(*) as total FROM Likes WHERE ImageID = @iid');

        // Verificar si el usuario dio like
        const userLike = await pool.request()
            .input('uid', sql.Int, req.user.userId)
            .input('iid', sql.Int, req.params.imageId)
            .query('SELECT * FROM Likes WHERE UserID = @uid AND ImageID = @iid');

        res.json({
            totalLikes: likesCount.recordset[0].total,
            userLiked: userLike.recordset.length > 0
        });
    } catch (e) {
        console.error('Error al obtener like status:', e);
        res.status(500).json({ error: 'Error al obtener estado del like' });
    }
});

// ==============================================================================
// RUTAS DE ADMINISTRADOR - ELIMINAR CONTENIDO
// ==============================================================================

// Admin: Eliminar publicación de cualquier usuario
app.delete('/api/admin/images/:id', authenticateToken, async (req, res) => {
    const imageId = req.params.id;

    try {
        const pool = await poolPromise;

        // Verificar que el usuario es admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden realizar esta acción.' });
        }

        // Obtener información del dueño de la imagen antes de eliminarla
        const imageResult = await pool.request()
            .input('imageId', sql.Int, imageId)
            .query(`
                SELECT UserID, Description
                FROM Images
                WHERE ImageID = @imageId
            `);

        if (imageResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        const imageOwnerId = imageResult.recordset[0].UserID;

        // Eliminación en orden correcto
        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Notifications WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Likes WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Comments WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM SongVotes WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM ImageSongs WHERE ImageID = @imageId');

        await pool.request()
            .input('imageId', sql.Int, imageId)
            .query('DELETE FROM Images WHERE ImageID = @imageId');

        // Crear notificación para el usuario cuya publicación fue eliminada
        // Usamos ImageID = NULL ya que la imagen ya no existe
        await pool.request()
            .input('receiver', sql.Int, imageOwnerId)
            .input('sender', sql.Int, req.user.userId)
            .input('type', sql.NVarChar(20), 'admin_delete_post')
            .query(`
                INSERT INTO Notifications (ReceiverID, SenderID, ImageID, Type, CommentText) 
                VALUES (@receiver, @sender, NULL, @type, 'admin eliminó tu publicación por contenido inadecuado')
            `);

        res.json({ message: 'Publicación eliminada correctamente por el administrador' });

    } catch (err) {
        console.error('Error al eliminar publicación como admin:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Admin: Eliminar comentario de cualquier usuario
app.delete('/api/admin/comments/:commentId', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const { commentId } = req.params;

        // Verificar que el usuario es admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden realizar esta acción.' });
        }

        // Obtener información del comentario antes de eliminarlo
        const commentResult = await pool.request()
            .input('cid', sql.Int, commentId)
            .query(`
                SELECT c.UserID, c.ImageID, i.Description as ImageDescription
                FROM Comments c
                LEFT JOIN Images i ON c.ImageID = i.ImageID
                WHERE c.CommentID = @cid
            `);

        if (commentResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado' });
        }

        const commentOwnerId = commentResult.recordset[0].UserID;
        const imageId = commentResult.recordset[0].ImageID;

        // Eliminar el comentario
        await pool.request()
            .input('cid', sql.Int, commentId)
            .query('DELETE FROM Comments WHERE CommentID = @cid');

        // Crear notificación para el usuario cuyo comentario fue eliminado
        await pool.request()
            .input('receiver', sql.Int, commentOwnerId)
            .input('sender', sql.Int, req.user.userId)
            .input('imageId', sql.Int, imageId)
            .input('type', sql.NVarChar(20), 'admin_delete_comment')
            .query(`
                INSERT INTO Notifications (ReceiverID, SenderID, ImageID, Type, CommentText) 
                VALUES (@receiver, @sender, @imageId, @type, 'admin eliminó un comentario de tu publicación por contenido inadecuado')
            `);

        res.json({ message: 'Comentario eliminado correctamente por el administrador' });
    } catch (e) {
        console.error('Error al eliminar comentario como admin:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// RUTAS DE NOTIFICACIONES
// ==============================================================================

// Obtener notificaciones del usuario
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT 
                    N.NotificationID,
                    N.Type,
                    N.CommentText,
                    N.IsRead,
                    N.CreatedAt,
                    N.ImageID,
                    U.Username AS SenderUsername,
                    I.ImageURL
                FROM Notifications N
                JOIN Users U ON N.SenderID = U.UserID
                LEFT JOIN Images I ON N.ImageID = I.ImageID
                WHERE N.ReceiverID = @userId
                ORDER BY N.CreatedAt DESC
            `);
        
        res.json(result.recordset);
    } catch (e) {
        console.error('Error al obtener notificaciones:', e);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// Obtener conteo de notificaciones no leídas
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query(`
                SELECT COUNT(*) AS unreadCount 
                FROM Notifications 
                WHERE ReceiverID = @userId AND IsRead = 0
            `);
        
        res.json({ unreadCount: result.recordset[0].unreadCount });
    } catch (e) {
        console.error('Error al obtener conteo de notificaciones:', e);
        res.status(500).json({ error: 'Error al obtener conteo' });
    }
});

// Marcar notificaciones como leídas
app.put('/api/notifications/mark-read', authenticateToken, async (req, res) => {
    console.log('[MARK-READ] Recibida petición PUT /api/notifications/mark-read');
    console.log('[MARK-READ] Body:', req.body);
    console.log('[MARK-READ] User:', req.user);
    
    try {
        const pool = await poolPromise;
        const { notificationIds } = req.body;

        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            console.log('[MARK-READ] Error: Array de IDs inválido');
            return res.status(400).json({ error: 'Se requiere un array de IDs de notificaciones' });
        }

        // Crear una tabla temporal con los IDs
        const request = pool.request();
        request.input('userId', sql.Int, req.user.userId);
        
        // Crear parámetros para cada ID
        const idParams = notificationIds.map((id, index) => {
            request.input(`id${index}`, sql.Int, id);
            return `@id${index}`;
        }).join(',');

        console.log('[MARK-READ] Ejecutando UPDATE para IDs:', notificationIds);

        // Marcar como leídas solo las notificaciones del usuario
        const result = await request.query(`
            UPDATE Notifications 
            SET IsRead = 1 
            WHERE ReceiverID = @userId AND NotificationID IN (${idParams})
        `);
        
        console.log('[MARK-READ] Filas afectadas:', result.rowsAffected);
        res.json({ message: 'Notificaciones marcadas como leídas', updated: result.rowsAffected[0] });
    } catch (e) {
        console.error('[MARK-READ] Error al marcar notificaciones:', e);
        res.status(500).json({ error: 'Error al marcar notificaciones' });
    }
});

// Eliminar una notificación
app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const notificationId = req.params.id;

        await pool.request()
            .input('notifId', sql.Int, notificationId)
            .input('userId', sql.Int, req.user.userId)
            .query(`
                DELETE FROM Notifications 
                WHERE NotificationID = @notifId AND ReceiverID = @userId
            `);
        
        res.json({ message: 'Notificación eliminada' });
    } catch (e) {
        console.error('Error al eliminar notificación:', e);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});


module.exports = app;
app.listen(PORT, () => console.log(`Backend corriendo en http://localhost:${PORT}`));