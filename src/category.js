// src/category_feed.js

const API_URL = 'http://localhost:4000';
const user = getUserInfo(); // Función disponible desde src/app.js

// Función para obtener parámetros de la URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        name: params.get('name') || 'Categoría Desconocida',
        id: params.get('id') || null
    };
}

// ----------------------------------------------------
// LÓGICA DE PERMISOS (Guest vs. Registered)
// ----------------------------------------------------
function applyPermissions(categoryId) {
    const uploadBtn = document.getElementById('upload-btn');
    const interactionButtons = document.getElementById('interaction-buttons');

    // Si el usuario no está registrado (Guest)
    if (user.role === 'guest') {
        // [CASO 1: GUEST] Solo Lectura - O4H8
        uploadBtn.style.display = 'none';

        // Deshabilitar/Ocultar todos los botones de interacción (Like, Voto, Subir)
        // Nota: Las interacciones de Like/Voto deben ser manejadas al renderizar cada imagen.

        console.log(`Modo GUEST: Acceso solo lectura a categoría ${categoryId}.`);
    } else {
        // [CASO 2: REGISTERED/ADMIN] Interacción
        uploadBtn.style.display = 'block';

        // Implementar lógica del modal para subir
        uploadBtn.addEventListener('click', () => {
            // Lógica para mostrar el modal de subida de contenido
            // (Asegúrate de que la estructura del modal esté en category_feed.html)
            document.getElementById('modal').style.display = 'flex';
        });

        console.log(`Modo ${user.role.toUpperCase()}: Interacción habilitada.`);
    }
}

// ----------------------------------------------------
// Carga de Datos y Inicialización
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
    const params = getUrlParams();

    // 1. Actualizar el título de la página y la cabecera
    document.getElementById('page-title').textContent = params.name;
    document.getElementById('category-title').textContent = params.name.toUpperCase();

    if (!params.id) {
        document.getElementById('gallery').innerHTML = `<p style="text-align: center; color: red; margin-top: 50px;">Error: Categoría no especificada.</p>`;
        return;
    }

    // 2. Aplicar permisos
    applyPermissions(params.id);

    // 3. Cargar la galería
    // Implementaremos el fetch para /images/category_id aquí, similar al código de Galeto

    const gallery = document.getElementById('gallery');
    const token = user.token || null; // Enviamos el token si existe

    try {
        // NOTA: NECESITAS CREAR ESTA RUTA EN EL BACKEND: app.get('/api/images/:categoryId')
        const response = await fetch(`${API_URL}/api/images/${params.id}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '' // Envía el token solo si existe
            }
        });

        const images = await response.json();

        if (images.length === 0) {
            gallery.innerHTML = `<p style="text-align: center; margin-top: 50px;">Aún no hay contenido en la categoría "${params.name}".</p>`;
            return;
        }

        // 4. Renderizar las imágenes (y la interacción dentro de ellas)
        gallery.innerHTML = '';
        images.forEach(image => {
            // Ejemplo de renderizado de imagen con botón de interacción
            const imageHtml = `
                <div class="image-item" data-image-id="${image.ImageID}">
                    <img src="${image.ImageUrl}" alt="${image.Title}">
                    <p>${image.Description || image.Title}</p>
                    <div class="interactions">
                        <span class="like-count"><i class="far fa-heart"></i> ${image.LikesCount || 0}</span>
                        ${user.role !== 'guest' ? `<button class="btn-like" data-id="${image.ImageID}">Like</button>` : ''}
                        <!-- Aquí iría la lógica de botones de Voto/Comentario -->
                    </div>
                </div>
            `;
            gallery.insertAdjacentHTML('beforeend', imageHtml);
        });

    } catch (error) {
        console.error('Error al cargar la galería:', error);
        gallery.innerHTML = `<p style="text-align: center; color: red; margin-top: 50px;">Error de conexión con el feed de la categoría.</p>`;
    }
});