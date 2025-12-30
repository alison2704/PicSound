# Historia de Usuario 010H17 - Botón de Cerrar Sesión

## Descripción
Como usuario, deseo disponer de un botón de cerrar sesión visible en todas las pestañas, para salir de la aplicación de forma segura en cualquier momento.

## Implementación Realizada

### ✅ Cambios Implementados

#### 1. **index.html**
- ✅ Ya contaba con el botón de cerrar sesión implementado dinámicamente a través de `app.js`
- El botón se renderiza automáticamente en el elemento `#nav-actions` cuando el usuario está autenticado

#### 2. **category.html**
- ✅ Agregado botón de cerrar sesión en el header de navegación
- ✅ El botón se muestra solo cuando el usuario está autenticado
- ✅ Se agregó la lógica en `category.js` para mostrar/ocultar el botón según el estado de autenticación

#### 3. **detalle_imagen.html**
- ✅ Agregado botón de cerrar sesión con estilo fixed en la parte superior derecha
- ✅ El botón se muestra solo cuando el usuario está autenticado
- ✅ Se agregó la lógica en `detalle_imagen.js` para mostrar/ocultar el botón según el estado de autenticación

#### 4. **perfil.html**
- ✅ Ya contaba con botón de cerrar sesión en el header
- ✅ Actualizado para usar la función global `handleLogoutConfirm` de `app.js`
- ✅ Agregado `app.js` como script para reutilizar la lógica centralizada

#### 5. **admin_panel.html**
- ✅ Ya contaba con botón de cerrar sesión en el header
- ✅ Actualizado para usar la función global `handleLogoutConfirm` de `app.js`

### 📋 Función Global de Cerrar Sesión

La función `handleLogoutConfirm` en `app.js` maneja el cierre de sesión de forma centralizada:

```javascript
function handleLogoutConfirm(event) {
    event.preventDefault();
    const confirmLogout = confirm("¿Estás seguro de que quieres cerrar la sesión?");
    if (confirmLogout) {
        handleLogout();
    }
}

function handleLogout() {
    localStorage.removeItem('jwtToken');
    window.location.reload();
}
```

### 🔐 Características de Seguridad

1. **Confirmación antes de cerrar sesión**: Se muestra un mensaje de confirmación nativo del navegador
2. **Limpieza del token JWT**: Se elimina el token del localStorage
3. **Recarga de página**: Se recarga la página para refrescar el estado de la aplicación
4. **Visibilidad condicional**: El botón solo se muestra a usuarios autenticados (no aparece para usuarios invitados)

### 📍 Ubicación de los Botones

| Página | Ubicación del Botón | ID del Elemento |
|--------|---------------------|-----------------|
| index.html | Header navegación (renderizado dinámicamente) | `logout-btn` |
| category.html | Header navegación (derecha) | `logout-category` |
| detalle_imagen.html | Superior derecha (fixed position) | `logout-detalle` |
| perfil.html | Header navegación (derecha) | `logout-perfil` |
| admin_panel.html | Header navegación (derecha) | `logout-admin` |

### 🎯 Flujo de Cierre de Sesión

1. Usuario hace clic en el botón "Cerrar Sesión"
2. Se muestra un cuadro de confirmación: "¿Estás seguro de que quieres cerrar la sesión?"
3. Si el usuario confirma:
   - Se elimina el token JWT del localStorage
   - La página se recarga
   - El usuario vuelve a ver el estado de "invitado" (guest)
   - Se redirige automáticamente a la vista apropiada

### 🧪 Pruebas Sugeridas

Para verificar que la implementación funciona correctamente:

1. **Inicio de sesión y navegación**:
   - Iniciar sesión en la aplicación
   - Navegar a cada una de las páginas (index, categoría, detalle, perfil, admin)
   - Verificar que el botón de cerrar sesión esté visible en todas ellas

2. **Funcionalidad del botón**:
   - Hacer clic en el botón de cerrar sesión
   - Verificar que aparece el mensaje de confirmación
   - Cancelar y verificar que la sesión sigue activa
   - Hacer clic nuevamente y confirmar
   - Verificar que la sesión se cierra y se redirige correctamente

3. **Usuario no autenticado**:
   - Sin iniciar sesión, navegar a las páginas públicas
   - Verificar que el botón de cerrar sesión NO aparece

### 📁 Archivos Modificados

- ✅ `category.html` - Agregado botón en el header
- ✅ `detalle_imagen.html` - Agregado botón fixed
- ✅ `src/category.js` - Lógica para mostrar/ocultar botón
- ✅ `src/detalle_imagen.js` - Lógica para mostrar/ocultar botón
- ✅ `perfil.html` - Actualizado para usar función global
- ✅ `admin_panel.html` - Actualizado para usar función global

### 🎨 Estilos

Los botones utilizan la clase CSS existente `.btn-nav` para mantener consistencia visual en toda la aplicación. El botón en `detalle_imagen.html` tiene estilos inline adicionales para posicionamiento fixed.

## Estado: ✅ COMPLETADO

Todos los requisitos de la historia de usuario han sido implementados exitosamente.
