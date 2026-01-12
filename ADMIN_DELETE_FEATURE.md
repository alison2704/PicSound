# Funcionalidad de Administrador - Eliminar Contenido de Usuarios

## Descripción
Se ha implementado la capacidad para que los administradores puedan eliminar publicaciones y comentarios de cualquier usuario. Cuando un administrador elimina contenido, el usuario afectado recibe una notificación automática.

## Cambios Implementados

### Backend (index.js)

#### Nuevas Rutas de API

1. **DELETE /api/admin/images/:id**
   - Permite al admin eliminar cualquier publicación
   - Verifica que el usuario tenga rol de 'admin'
   - Elimina la publicación y todo su contenido relacionado (comentarios, likes, canciones, votos)
   - Envía notificación al dueño de la publicación eliminada
   - Tipo de notificación: `admin_delete_post`

2. **DELETE /api/admin/comments/:commentId**
   - Permite al admin eliminar cualquier comentario
   - Verifica que el usuario tenga rol de 'admin'
   - Elimina el comentario
   - Envía notificación al dueño del comentario eliminado
   - Tipo de notificación: `admin_delete_comment`

### Frontend (detalle_imagen.js)

#### Funciones Nuevas

1. **deletePostAsAdmin(imageId, imageOwnerId)**
   - Solicita confirmación antes de eliminar
   - Llama a la ruta `/api/admin/images/:id`
   - Muestra mensaje de éxito y redirige a la galería
   - Informa que se ha notificado al usuario

2. **deleteCommentAsAdmin(commentId, commentOwnerId, imageId)**
   - Solicita confirmación antes de eliminar
   - Llama a la ruta `/api/admin/comments/:commentId`
   - Recarga la lista de comentarios después de eliminar
   - Informa que se ha notificado al usuario

#### Modificaciones a Funciones Existentes

1. **renderImageDescription(image, imageId)**
   - Ahora detecta si el usuario actual es admin
   - Si es admin pero NO es el dueño de la publicación, muestra un botón de basurero rojo
   - El botón de basurero aparece en la parte superior derecha del contenedor de descripción

2. **loadComments(imageId)**
   - Ahora detecta si el usuario actual es admin
   - Para cada comentario que NO sea del admin, muestra un botón de basurero rojo
   - El botón de basurero aparece a la derecha de cada comentario

### Estilos CSS (detalle_imagen.css)

#### Nuevos Estilos

1. **.admin-delete-post-btn**
   - Botón de basurero para eliminar publicaciones
   - Color rojo (#ed4956)
   - Efecto hover con fondo translúcido y escala
   - Ubicación: parte superior derecha de la descripción de la publicación

2. **.admin-delete-comment-btn**
   - Botón de basurero para eliminar comentarios
   - Color rojo (#ed4956)
   - Efecto hover con fondo translúcido y escala
   - Ubicación: lado derecho de cada comentario

### Base de Datos (SQL)

#### Script de Migración: add_admin_notification_types.sql

Este script actualiza la tabla Notifications para soportar los nuevos tipos:
- Elimina la restricción CHECK existente
- Agrega nueva restricción CHECK que incluye:
  - `admin_delete_post`: Cuando el admin elimina una publicación
  - `admin_delete_comment`: Cuando el admin elimina un comentario

**IMPORTANTE:** Ejecutar este script en la base de datos existente para habilitar la funcionalidad.

```sql
-- Ejecutar en SQL Server Management Studio o similar
USE PicsoundDB;
GO
-- Ejecutar el contenido de add_admin_notification_types.sql
```

#### Actualización a PicSound.sql

El script principal ha sido actualizado para:
- Cambiar `ImageID` de `NOT NULL` a `NULL` (para notificaciones de posts eliminados)
- Cambiar tamaño de `Type` de `NVARCHAR(20)` a `NVARCHAR(30)`
- Incluir los nuevos tipos en la restricción CHECK desde el inicio

## Comportamiento Visual

### Para Administradores

1. **En detalle de publicación:**
   - Si NO es el dueño: aparece un icono de basurero 🗑️ rojo en la parte superior derecha
   - Al hacer clic: modal de confirmación advirtiendo que se notificará al usuario
   - Al confirmar: eliminación y redirección a la galería

2. **En comentarios:**
   - Cada comentario que NO sea del admin muestra un icono de basurero 🗑️ rojo a la derecha
   - Al hacer clic: modal de confirmación advirtiendo que se notificará al usuario
   - Al confirmar: comentario eliminado y lista recargada

### Para Usuarios Afectados

1. **Cuando el admin elimina su publicación:**
   - Reciben notificación: "El administrador eliminó una de tus publicaciones"
   - La notificación NO tiene enlace a la imagen (porque ya no existe)

2. **Cuando el admin elimina su comentario:**
   - Reciben notificación: "El administrador eliminó uno de tus comentarios"
   - La notificación incluye enlace a la publicación donde estaba el comentario

## Seguridad

- Todas las rutas de admin verifican el rol mediante `req.user.role === 'admin'`
- Si un usuario regular intenta usar estas rutas, recibe error 403 (Forbidden)
- Las notificaciones solo se envían al dueño del contenido eliminado
- El token JWT debe ser válido y estar presente en todas las peticiones

## Pruebas Recomendadas

1. **Como Admin:**
   - Iniciar sesión con cuenta de administrador
   - Navegar a una publicación de otro usuario
   - Verificar que aparece el botón de basurero
   - Eliminar la publicación y verificar notificación al usuario

2. **Como Usuario Regular:**
   - Crear una publicación y comentarios
   - Que un admin elimine tu contenido
   - Verificar que recibes las notificaciones correspondientes
   - Intentar acceder a `/api/admin/*` directamente (debe fallar)

## Archivos Modificados

```
backend/index.js              - Nuevas rutas de admin
src/detalle_imagen.js         - Lógica UI y funciones de eliminación admin
src/detalle_imagen.css        - Estilos para botones de admin
sql/PicSound.sql             - Tabla Notifications actualizada
sql/add_admin_notification_types.sql - Script de migración
```

## Notas Adicionales

- Los botones de basurero solo aparecen cuando el usuario es admin Y NO es el dueño
- Si el admin es dueño de la publicación/comentario, ve el menú normal de opciones (⋯)
- Las notificaciones de admin tienen tipos específicos para poder personalizarlas en el frontend
- El cambio de `ImageID` a nullable permite notificaciones de posts eliminados
