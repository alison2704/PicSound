require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { poolPromise } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar conexión
app.get('/api/test-db', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT TOP 5 UserID, Username, Email FROM Users');
        res.json({ ok: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Backend corriendo en http://localhost:${port}`));
