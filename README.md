# 🎵 Picsound — Conecta recuerdos con sonidos

Picsound es una plataforma web donde los usuarios pueden asociar canciones a sus fotos, dando vida a los recuerdos a través de la música.
Los usuarios registrados podrán subir imágenes, agregar hasta tres canciones, recibir likes, comentarios y votos de otros usuarios.
Los visitantes no registrados solo podrán visualizar la galería en modo lectura.


# Tecnologías utilizadas
| Área                 | Herramienta                        | Descripción                                                          |
| -------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Frontend             | **Vite + JavaScript + HTML + CSS** | Entorno rápido de desarrollo para interfaces web                     |
| Backend              | **Node.js + Express**              | Servidor REST para manejar la lógica y conexión con la base de datos |
| Base de datos        | **SQL Server (MSSQL)**             | Almacena usuarios, imágenes, canciones, comentarios, likes y votos   |
| Conexión BD          | **mssql (librería Node.js)**       | Permite la comunicación entre Node y SQL Server                      |
| Variables de entorno | **dotenv**                         | Manejo seguro de credenciales                                        |
| Seguridad y acceso   | **CORS**                           | Permite la comunicación entre el backend y el frontend               |

# Configurar el frontend
```
npm install
npm run dev
```

# Configurar el backend

```
cd backend
npm install
```

# Crear la base de datos

* Abre SQL Server Management Studio (SSMS).
* Ejecuta el script PicSound.sql que se encuentra dentro de la carpeta sql/.
Esto creará la base de datos PicsoundDB con todas sus tablas y relaciones.

# Configurar variables de entorno
```
DB_USER=       # Usuario SQL Server con permisos sobre PicsoundDB
DB_PASSWORD=                # Contraseña del usuario
DB_SERVER=localhost         # O tu instancia
DB_DATABASE=PicsoundDB
DB_PORT=1433
DB_ENCRYPT=false            # Desactiva SSL (para entorno local)
PORT=4000                   # Puerto del backend
```


# Ejecutar el backend
```
node index.js
```

### Si todo está correcto, deberías ver en consola:
```
✅ Conectado a SQL Server
🚀 Servidor corriendo en http://localhost:4000
```

# Funcionalidades principales
Registro e inicio de sesión de usuarios

Subida de imágenes con enlaces externos

Asociación de hasta 3 canciones por foto

Likes, comentarios y votos por canción

Roles: usuario, administrador y visitante (solo lectura)

Interacción visual dinámica entre frontend y backend


# Autores
Alison Lita - https://github.com/alison2704
Evelin Rocha - https://github.com/EveRocha11
Génesis Vásconez - https://github.com/GenesisDaena
