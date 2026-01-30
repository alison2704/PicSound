# Documentación de Galeto - Plataforma Multimedia

## Índice
- [Funcionalidad de Administrador](./ADMIN_DELETE_FEATURE.md)
- [Sprints de Desarrollo](#sprints-de-desarrollo)
- [Arquitectura del Sistema](#arquitectura-del-sistema)

## Sprints de Desarrollo

### Sprint 1: Autenticación y Registro
**Objetivos:**
- Implementar sistema de registro con validación de email
- Crear sistema de login con JWT
- Validar dominios permitidos (@gmail, @hotmail, @outlook)
- Implementar validación de contraseñas (mínimo 8 caracteres)

**Entregables:**
- [x] Página de login/registro
- [x] Validación de email en frontend
- [x] API de autenticación en backend
- [x] Generación y almacenamiento de tokens JWT

### Sprint 2: Galería y Publicaciones
**Objetivos:**
- Crear sistema de subida de imágenes
- Implementar galería pública
- Asociar canciones a imágenes (máximo 3)
- Sistema de categorías

**Entregables:**
- [x] Upload de imágenes con Multer
- [x] Vista de galería con categorías
- [x] Asociación de canciones a publicaciones
- [x] Vista de detalle de imagen

### Sprint 3: Interacciones Sociales
**Objetivos:**
- Sistema de likes
- Sistema de comentarios
- Sistema de votación para canciones
- Notificaciones en tiempo real

**Entregables:**
- [x] Likes a publicaciones
- [x] Comentarios en publicaciones
- [x] Votación de canciones (máximo 3 por imagen)
- [x] Panel de notificaciones

### Sprint 4: Panel de Administración
**Objetivos:**
- Crear panel de administrador
- Implementar eliminación de contenido
- Sistema de notificaciones para acciones administrativas
- Control de roles y permisos

**Entregables:**
- [x] Panel de administrador
- [x] Eliminación de publicaciones por admin
- [x] Eliminación de comentarios por admin
- [x] Notificaciones automáticas a usuarios afectados

### Sprint 5: Optimización y Testing
**Objetivos:**
- Configurar herramientas de calidad de código
- Implementar testing unitario
- Crear pipeline de CI/CD
- Optimizar build de producción

**Entregables:**
- [x] Configuración de ESLint y Prettier
- [x] Tests unitarios con Jest
- [x] Pipeline de CI con GitHub Actions
- [x] Build optimizado con Webpack

## Arquitectura del Sistema

### Stack Tecnológico

#### Frontend
- **Framework:** JavaScript Vanilla
- **Estilos:** CSS3
- **Fuentes:** Google Fonts (Poppins, Merriweather)
- **Build:** Webpack 5
- **Dev Server:** Vite

#### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Puerto:** 4000
- **Autenticación:** JWT (jsonwebtoken)
- **Upload:** Multer
- **Seguridad:** bcrypt, CORS

#### Base de Datos
- **Motor:** Microsoft SQL Server (MSSQL)
- **ORM/Driver:** mssql
- **Base de Datos:** PicsoundDB

### Estructura de Carpetas

```
Galeto/
├── src/                    # Código fuente frontend
│   ├── app.js             # Script principal
│   ├── main.js            # Login/registro
│   ├── category.js        # Categorías
│   ├── detalle_imagen.js  # Detalle de publicación
│   ├── slider.js          # Carrusel
│   └── *.css              # Estilos
├── backend/               # Backend Node.js
│   ├── index.js          # Servidor Express
│   ├── db.js             # Configuración BD
│   └── uploads/          # Archivos subidos
├── tests/                # Tests unitarios
│   ├── validarEmail.test.js
│   └── jwtToken.test.js
├── docs/                 # Documentación
├── sql/                  # Scripts SQL
│   └── PicSound.sql
├── .github/
│   └── workflows/
│       └── ci.yml        # Pipeline CI/CD
└── dist/                 # Build de producción

```

### Flujo de Autenticación

1. Usuario ingresa credenciales en `/login_register.html`
2. Frontend valida email (dominios permitidos)
3. Se envía POST a `/api/login` o `/api/register`
4. Backend valida con bcrypt y genera JWT
5. Token se almacena en localStorage
6. Cada request incluye token en headers
7. Backend verifica token en rutas protegidas

### Características de Seguridad

- **Contraseñas:** Hash con bcrypt (10 rounds)
- **Tokens:** JWT con expiración
- **CORS:** Configurado para puerto específico
- **Validación:** Email y contraseña en frontend y backend
- **Roles:** Sistema de roles (user, admin)
- **SQL Injection:** Prevención con queries parametrizadas

### API Endpoints

#### Autenticación
- POST `/api/register` - Registro de usuario
- POST `/api/login` - Login de usuario

#### Publicaciones
- GET `/api/images` - Listar todas las imágenes
- GET `/api/images/:id` - Obtener imagen específica
- POST `/api/upload` - Subir nueva imagen
- DELETE `/api/images/:id` - Eliminar imagen propia
- DELETE `/api/admin/images/:id` - Admin elimina imagen

#### Comentarios
- GET `/api/images/:id/comments` - Listar comentarios
- POST `/api/comments` - Crear comentario
- DELETE `/api/admin/comments/:id` - Admin elimina comentario

#### Interacciones
- POST `/api/likes` - Dar like
- DELETE `/api/likes/:imageId` - Quitar like
- POST `/api/votes` - Votar canción

#### Notificaciones
- GET `/api/notifications` - Obtener notificaciones
- PUT `/api/notifications/read` - Marcar como leídas

## Testing

### Pruebas Implementadas

1. **validarEmail.test.js**
   - Validación de dominios permitidos
   - Rechazo de dominios no permitidos
   - Case-insensitive
   - Formato de email válido

2. **jwtToken.test.js**
   - Almacenamiento en localStorage
   - Recuperación de token
   - Eliminación en logout
   - Persistencia entre sesiones
   - Validación de estructura

### Ejecutar Tests

```bash
npm test                # Ejecutar todos los tests
npm run test:watch     # Modo watch
npm run test:coverage  # Con reporte de cobertura
```

## Pipeline CI/CD

El pipeline se ejecuta automáticamente en push/PR a `main` o `develop`:

1. **Lint** (🔍): ESLint valida código
2. **Format** (💅): Prettier verifica formateo
3. **Test** (🧪): Jest ejecuta tests + coverage
4. **Build** (🏗️): Webpack genera build optimizado

Cada job depende del anterior (needs) y usa Node.js 18.

## Mantenimiento

### Comandos Útiles

```bash
npm run lint          # Verificar código
npm run lint:fix      # Corregir automáticamente
npm run format        # Formatear código
npm run format:check  # Verificar formateo
npm run build         # Build de producción
npm run dev           # Servidor de desarrollo
```

### Actualizaciones

Para actualizar dependencias:
```bash
npm outdated          # Ver actualizaciones disponibles
npm update            # Actualizar dependencias
```

## Contribución

1. Crear branch desde `develop`
2. Hacer cambios y commits
3. Asegurar que pase el pipeline (lint, format, test, build)
4. Crear PR hacia `develop`
5. Code review y merge

---

**Última actualización:** Sprint 5 - Enero 2026
