// src/app.js (Script que se ejecuta en index.html)

// Función para simular la decodificación y obtener el rol/nombre
function getUserInfo() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        return { isAuthenticated: false, username: null, role: 'guest', userId: null };
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
            role: payload.role || 'user', // El rol ahora viene del token
            userId: payload.userId // Agregamos el userId del payload
        };
    } catch (e) {
        console.error("Error al decodificar el token:", e);
        // Si el token es inválido, lo eliminamos.
        localStorage.removeItem('jwtToken');
        return { isAuthenticated: false, username: null, role: 'guest', userId: null };
    }
}

function renderNavActions() {
    const navActions = document.getElementById('nav-actions');
    if (!navActions) return; // Si no existe el elemento, salir
    
    const user = getUserInfo(); // Función que devuelve { isAuthenticated, username, role }
    navActions.innerHTML = '';

    if (user.isAuthenticated) {
        let navContent = '';

        // [NUEVO] Si es admin, añade el enlace al Panel Admin
        if (user.role === 'admin') {
            navContent += `<a href="admin_panel.html" class="btn-nav">Admin Panel</a>`;
        }

        // Agregar icono de notificaciones
        navContent += `
            <div class="notifications-container">
                <button class="notifications-btn" id="notifications-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <span class="notification-badge" id="notification-badge" style="display: none;">0</span>
                </button>
                <div class="notifications-panel" id="notifications-panel">
                    <div class="notifications-header">
                        <h3>Notificaciones</h3>
                        <button class="mark-all-read" id="mark-all-read">Marcar todas como leídas</button>
                    </div>
                    <div class="notifications-list" id="notifications-list">
                        <p class="loading">Cargando...</p>
                    </div>
                </div>
            </div>
        `;

        // Renderizar Perfil y Cerrar Sesión (para todos los logueados)
        navContent += `
            <a href="perfil.html" class="btn-nav">Perfil (${user.username})</a>
            <a href="#" id="logout-btn" class="btn-nav">Cerrar Sesión</a>
        `;

        navActions.innerHTML = navContent;

        // Asignar el evento de cerrar sesión
        document.getElementById('logout-btn').addEventListener('click', handleLogoutConfirm);

        // Inicializar notificaciones
        initNotifications();

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

    // 2. Redirigir al index.html
    window.location.href = 'index.html';
}
// Inicializar al cargar el DOM
document.addEventListener("DOMContentLoaded", renderNavActions);

// ==============================================================================
// SISTEMA DE NOTIFICACIONES
// ==============================================================================

let notificationsInterval;

function initNotifications() {
    const notifBtn = document.getElementById('notifications-btn');
    const notifPanel = document.getElementById('notifications-panel');
    const markAllRead = document.getElementById('mark-all-read');

    if (!notifBtn) return;

    // Toggle panel de notificaciones
    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('show');
        if (notifPanel.classList.contains('show')) {
            loadNotifications();
        }
    });

    // Cerrar panel al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target)) {
            notifPanel.classList.remove('show');
        }
    });

    // Marcar todas como leídas
    markAllRead.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        markAllAsRead();
    });

    // Cargar conteo inicial
    loadNotificationCount();

    // Actualizar cada 30 segundos
    notificationsInterval = setInterval(loadNotificationCount, 30000);
}

async function loadNotificationCount() {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:4000/api/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const badge = document.getElementById('notification-badge');
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.textContent = data.unreadCount;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (e) {
        console.error('Error al cargar conteo de notificaciones:', e);
    }
}

async function loadNotifications() {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    const listContainer = document.getElementById('notifications-list');
    listContainer.innerHTML = '<p class="loading">Cargando...</p>';

    try {
        const res = await fetch('http://localhost:4000/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const notifications = await res.json();

            if (notifications.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-notifications">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No tienes notificaciones</p>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = '';
            notifications.forEach(notif => {
                const item = createNotificationItem(notif);
                listContainer.appendChild(item);
            });
        }
    } catch (e) {
        console.error('Error al cargar notificaciones:', e);
        listContainer.innerHTML = '<p class="loading">Error al cargar notificaciones</p>';
    }
}

function createNotificationItem(notif) {
    const div = document.createElement('div');
    div.className = `notification-item ${notif.IsRead ? '' : 'unread'}`;
    div.dataset.notificationId = notif.NotificationID;
    div.dataset.isRead = notif.IsRead ? 'true' : 'false';
    
    let iconClass = '';
    let message = '';
    
    if (notif.Type === 'like') {
        iconClass = 'like';
        message = `<strong>${notif.SenderUsername}</strong> le dio me gusta a tu foto`;
    } else if (notif.Type === 'comment') {
        iconClass = 'comment';
        const commentPreview = notif.CommentText ? `: "${notif.CommentText}"` : '';
        message = `<strong>${notif.SenderUsername}</strong> comentó en tu foto${commentPreview}`;
    } else if (notif.Type === 'vote') {
        iconClass = 'vote';
        message = `<strong>${notif.SenderUsername}</strong> votó por una canción en tu foto`;
    } else if (notif.Type === 'admin_delete_post') {
        iconClass = 'admin-delete';
        message = `<strong>${notif.SenderUsername}</strong> ${ 'eliminó tu publicación por contenido inadecuado'}`;
    } else if (notif.Type === 'admin_delete_comment') {
        iconClass = 'admin-delete';
        message = `<strong>${notif.SenderUsername}</strong> ${'eliminó un comentario de tu publicación por contenido inadecuado'}`;
    }

    const timeAgo = getTimeAgo(notif.CreatedAt);

    div.innerHTML = `
        <div class="notification-icon ${iconClass}">
            ${notif.SenderUsername.charAt(0).toUpperCase()}
        </div>
        <div class="notification-content">
            <p class="notification-text">${message}</p>
            <span class="notification-time">${timeAgo}</span>
        </div>
        ${notif.ImageURL ? `<img src="${notif.ImageURL}" class="notification-image" alt="Imagen">` : ''}
        <button class="notification-delete" data-id="${notif.NotificationID}">×</button>
    `;

    // Clic en la notificación - ir a la imagen y marcar como leída
    div.addEventListener('click', (e) => {
        if (e.target.classList.contains('notification-delete')) return;
        
        if (!notif.IsRead) {
            markAsRead([notif.NotificationID]);
        }
        
        // Si la imagen fue eliminada (notificaciones de admin_delete_post), no redirigir
        if (notif.ImageID) {
            window.location.href = `detalle_imagen.html?id=${notif.ImageID}`;
        }
    });

    // Clic en eliminar
    div.querySelector('.notification-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNotification(notif.NotificationID, div);
    });

    return div;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return notifDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

async function markAsRead(notificationIds) {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
        const res = await fetch('http://localhost:4000/api/notifications/mark-read', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notificationIds })
        });

        if (res.ok) {
            // Actualizar la UI de las notificaciones marcadas como leídas
            notificationIds.forEach(id => {
                const notifElement = document.querySelector(`[data-notification-id="${id}"]`);
                if (notifElement) {
                    notifElement.classList.remove('unread');
                    notifElement.dataset.isRead = 'true';
                }
            });
            
            // Actualizar el conteo
            loadNotificationCount();
        }
    } catch (e) {
        console.error('Error al marcar como leída:', e);
    }
}

async function markAllAsRead() {
    const unreadItems = document.querySelectorAll('.notification-item.unread');
    
    if (unreadItems.length === 0) {
        console.log('No hay notificaciones sin leer');
        return;
    }

    const ids = Array.from(unreadItems).map(item => {
        return Number.parseInt(item.dataset.notificationId);
    });

    console.log('Marcando como leídas:', ids);

    if (ids.length > 0) {
        await markAsRead(ids);
    }
}

async function deleteNotification(id, element) {
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    try {
        const res = await fetch(`http://localhost:4000/api/notifications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            element.remove();
            loadNotificationCount();
            
            // Si no quedan notificaciones, mostrar mensaje vacío
            const listContainer = document.getElementById('notifications-list');
            if (listContainer.children.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-notifications">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <p>No tienes notificaciones</p>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error('Error al eliminar notificación:', e);
    }
}