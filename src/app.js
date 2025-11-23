// src/app.js (Script que se ejecuta en index.html)

// Función para simular la decodificación y obtener el rol/nombre
function getUserInfo() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        return { isAuthenticated: false, username: null, role: 'guest' };
    }

    try {
        const payloadBase64 = token.split('.')[1];

        // --- FIX CLAVE ---
        // 1. Reemplaza cualquier carácter no válido para Base64Url
        let base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        // 2. Agrega el padding necesario (caracteres '=')
        while (base64.length % 4) {
            base64 += '=';
        }

        // 3. Decodifica y parsea el payload del token
        const payload = JSON.parse(atob(base64));
        // --- FIN FIX ---

        return {
            isAuthenticated: true,
            username: payload.username || 'Usuario Registrado',
            role: payload.role || 'user' // El rol ahora viene del token
        };
    } catch (e) {
        console.error("Error al decodificar el token:", e);
        // Si el token es inválido, lo eliminamos.
        localStorage.removeItem('jwtToken');
        return { isAuthenticated: false, username: null, role: 'guest' };
    }
}

function renderNavActions() {
    const navActions = document.getElementById('nav-actions');
    const user = getUserInfo(); // Función que devuelve { isAuthenticated, username, role }
    navActions.innerHTML = '';

    if (user.isAuthenticated) {
        let navContent = '';

        // [NUEVO] Si es admin, añade el enlace al Panel Admin
        if (user.role === 'admin') {
            navContent += `<a href="admin_panel.html" class="btn-nav">Admin Panel</a>`;
        }

        // Renderizar Perfil y Cerrar Sesión (para todos los logueados)
        navContent += `
            <a href="perfil.html" class="btn-nav">Perfil (${user.username})</a>
            <a href="#" id="logout-btn" class="btn-nav">Cerrar Sesión</a>
        `;

        navActions.innerHTML = navContent;

        // Asignar el evento de cerrar sesión
        document.getElementById('logout-btn').addEventListener('click', handleLogoutConfirm);

    } else {
        // Renderizar INICIAR SESIÓN / REGISTRO
        navActions.innerHTML = `
            <a href="login_register.html" class="btn-nav">Iniciar Sesión</a>
        `;
    }
}

// 1. Nueva función que maneja la confirmación de la acción
function handleLogoutConfirm(event) {
    event.preventDefault(); // Evita que el <a> haga la acción por defecto

    // Mostrar ventana de confirmación nativa
    const confirmLogout = confirm("¿Estás seguro de que quieres cerrar la sesión?");

    if (confirmLogout) {
        // Si el usuario confirma, procede con el cierre de sesión real
        handleLogout();
    }
}


// 2. Modificación a la función de cierre de sesión (la deja limpia)
function handleLogout() {
    // 1. Limpiar token
    localStorage.removeItem('jwtToken');

    // 2. Redirigir (La página se refrescará y app.js mostrará el estado 'guest')
    window.location.reload();
}
// Inicializar al cargar el DOM
document.addEventListener("DOMContentLoaded", renderNavActions);