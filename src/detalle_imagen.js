const API_URL = 'http://localhost:4000';
const user = getUserInfo(); // De app.js

// Variables para navegación
let allImages = [];
let currentImageIndex = -1;
let currentImageId = null; // Variable global para la imagen actual

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const imageId = params.get('id');
    const categoryId = params.get('categoryId');

    if (!imageId) {
        await showAlert('ID de imagen no encontrado', 'Error', 'error');
        return;
    }

    currentImageId = imageId; // Establecer la imagen actual

    // Cargar todas las imágenes de la categoría para navegación
    if (categoryId) {
        await loadCategoryImages(categoryId, imageId);
    }

    // Cargar la imagen actual
    await loadImageDetail(imageId);

    // 2. CARGAR COMENTARIOS
    loadComments(imageId);

    // 2.5 CARGAR ESTADO DE LIKES
    if (user.role !== 'guest') {
        loadLikeStatus(imageId);
    } else {
        // Si es guest, solo mostrar conteo sin permitir dar like
        loadLikeCount(imageId);
    }

    // 3. ENVIAR COMENTARIO
    document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (user.role === 'guest') {
            await showAlert('Debes iniciar sesión para comentar', 'Iniciar sesión', 'info');
            return;
        }

        const text = e.target.text.value.trim();

        if (!text) {
            await showAlert('Por favor escribe un comentario', 'Comentario vacío', 'info');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                },
                body: JSON.stringify({ imageId: currentImageId, text })
            });

            const data = await res.json();

            if (res.ok) {
                e.target.reset();
                loadComments(currentImageId);
            } else {
                await showAlert(data.error || 'Error al publicar comentario', 'Error', 'error');
            }
        } catch (error) {
            console.error('Error al enviar comentario:', error);
            await showAlert('Error de conexión. Intenta nuevamente.', 'Error', 'error');
        }
    });

    // Eventos de navegación
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const closeBtn = document.getElementById('close-btn');

    // Botón cerrar
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (categoryId) {
                // Si vino de una categoría, regresar a ella
                const categoryName = getCategoryName(categoryId);
                window.location.href = `category.html?name=${categoryName}&id=${categoryId}`;
            } else {
                // Si no, ir al inicio
                window.location.href = 'index.html';
            }
        });
    }

    if (prevBtn && nextBtn) {
        console.log('Botones de navegación encontrados');
        prevBtn.addEventListener('click', () => {
            console.log('Click en botón anterior');
            navigateToPrevious();
        });
        nextBtn.addEventListener('click', () => {
            console.log('Click en botón siguiente');
            navigateToNext();
        });
    } else {
        console.error('No se encontraron los botones de navegación');
    }

    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            console.log('Tecla flecha izquierda');
            navigateToPrevious();
        }
        if (e.key === 'ArrowRight') {
            console.log('Tecla flecha derecha');
            navigateToNext();
        }
        if (e.key === 'Escape') {
            console.log('Tecla Escape - Cerrar');
            if (categoryId) {
                const categoryName = getCategoryName(categoryId);
                window.location.href = `category.html?name=${categoryName}&id=${categoryId}`;
            } else {
                window.location.href = 'index.html';
            }
        }
    });
});

// Cargar todas las imágenes de la categoría
async function loadCategoryImages(categoryId, currentImageId) {
    try {
        console.log('Cargando imágenes de categoría:', categoryId);
        const res = await fetch(`${API_URL}/api/images/${categoryId}`);
        const data = await res.json();

        console.log('Imágenes recibidas:', data);

        if (res.ok && data && data.length > 0) {
            allImages = data;
            currentImageIndex = allImages.findIndex(img => img.ImageID == currentImageId);
            console.log('Total imágenes:', allImages.length, 'Índice actual:', currentImageIndex);
            updateNavigationButtons();
        } else {
            console.log('No se encontraron imágenes en la categoría');
        }
    } catch (error) {
        console.error('Error al cargar imágenes de la categoría:', error);
    }
}

// Actualizar estado de los botones de navegación
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    if (allImages.length === 0) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        return;
    }

    prevBtn.disabled = currentImageIndex <= 0;
    nextBtn.disabled = currentImageIndex >= allImages.length - 1;

    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
}

// Navegar a la imagen anterior
async function navigateToPrevious() {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        const prevImage = allImages[currentImageIndex];
        currentImageId = prevImage.ImageID; // Actualizar ID actual

        console.log('Navegando a imagen anterior:', prevImage);

        await loadImageDetail(prevImage.ImageID);
        await loadComments(prevImage.ImageID);

        if (user.role !== 'guest') {
            await loadLikeStatus(prevImage.ImageID);
        } else {
            await loadLikeCount(prevImage.ImageID);
        }

        // Actualizar URL sin recargar la página
        const params = new URLSearchParams(window.location.search);
        const categoryId = params.get('categoryId');
        const newUrl = `detalle_imagen.html?id=${prevImage.ImageID}&categoryId=${categoryId}`;
        window.history.pushState({ imageId: prevImage.ImageID }, '', newUrl);

        updateNavigationButtons();
    }
}

// Navegar a la imagen siguiente
async function navigateToNext() {
    if (currentImageIndex < allImages.length - 1) {
        currentImageIndex++;
        const nextImage = allImages[currentImageIndex];
        currentImageId = nextImage.ImageID; // Actualizar ID actual

        console.log('Navegando a imagen siguiente:', nextImage);

        await loadImageDetail(nextImage.ImageID);
        await loadComments(nextImage.ImageID);

        if (user.role !== 'guest') {
            await loadLikeStatus(nextImage.ImageID);
        } else {
            await loadLikeCount(nextImage.ImageID);
        }

        // Actualizar URL sin recargar la página
        const params = new URLSearchParams(window.location.search);
        const categoryId = params.get('categoryId');
        const newUrl = `detalle_imagen.html?id=${nextImage.ImageID}&categoryId=${categoryId}`;
        window.history.pushState({ imageId: nextImage.ImageID }, '', newUrl);

        updateNavigationButtons();
    }
}

// Obtener nombre de categoría por ID
function getCategoryName(categoryId) {
    const categories = {
        '1': 'Paisajes',
        '2': 'Moda',
        '3': 'Viajes',
        '4': 'Urbana',
        '5': 'Minimalista',
        '6': 'Naturaleza'
    };
    return categories[categoryId] || 'Galería';
}

// Cargar detalle de una imagen
async function loadImageDetail(imageId) {
    // Resetear scroll del panel de información al inicio
    const infoSection = document.querySelector('.info-sec');
    if (infoSection) {
        infoSection.scrollTop = 0;
    }

    // 1. CARGAR INFO E IMAGEN
    try {
        const res = await fetch(`${API_URL}/api/image-detail/${imageId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        // Renderizar Info
        document.getElementById('det-img').src = data.image.ImageURL;
        //document.getElementById('det-title').textContent = data.image.Title;
        //document.getElementById('det-desc').textContent = data.image.Description;
        renderImageDescription(data.image, imageId);
        document.getElementById('det-user').textContent = data.image.Username;

        // Renderizar inicial del avatar
        const avatarElement = document.getElementById('user-avatar');
        if (avatarElement && data.image.Username) {
            avatarElement.textContent = data.image.Username.charAt(0).toUpperCase();
        }

        // Renderizar Canciones
        const songsList = document.getElementById('songs-list');
        songsList.innerHTML = '';
        data.songs.forEach(song => {
            const div = document.createElement('div');
            div.className = 'song-item';

            // Contenedor de información de la canción
            const songInfo = document.createElement('div');
            songInfo.className = 'song-info';

            // Título de la canción
            const titleDiv = document.createElement('div');
            titleDiv.innerHTML = `<strong>${song.Title}</strong>`;
            songInfo.appendChild(titleDiv);

            // Botón de escuchar con icono de play
            const listenLink = document.createElement('a');
            listenLink.href = 'javascript:void(0)';
            listenLink.className = 'btn-listen';
            listenLink.onclick = function() { 
                abrirModalYoutube(song.ExternalURL, song.Title, this); 
            };
            listenLink.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M10 8l6 4-6 4z" fill="currentColor"/>
                </svg>
                Escuchar
            `;
            songInfo.appendChild(listenLink);

            // Votos
            const votesDiv = document.createElement('div');
            votesDiv.className = 'song-votes';
            votesDiv.textContent = `${song.Votes} votos`;
            songInfo.appendChild(votesDiv);

            div.appendChild(songInfo);

            // Botón de votar (solo si no es guest)
            if (user.role !== 'guest') {
                const voteBtn = document.createElement('button');
                voteBtn.className = 'btn-vote';
                voteBtn.textContent = 'Votar';
                voteBtn.onclick = () => votar(imageId, song.SongID);
                div.appendChild(voteBtn);
            }

            songsList.appendChild(div);
        });

        console.log('Imagen cargada:', imageId, data.image.Title);

    } catch (e) {
        console.error('Error al cargar imagen:', e);
    }
}

//renderizar descripción de la imagen 
function renderImageDescription(image, imageId) {
    const descP = document.getElementById('det-desc');
    const postMenuContainer = document.getElementById('post-menu-container');

    // Limpiar
    descP.innerHTML = '';
    descP.setAttribute('data-image-id', imageId);
    if (postMenuContainer) {
        postMenuContainer.innerHTML = '';
    }

    // Contenido de la descripción
    const content = document.createElement('span');
    content.textContent = image.Description || 'Sin descripción';
    descP.appendChild(content);

    // Verificar si el usuario es el dueño de la publicación
    console.log('Comparando user.userId:', user?.userId, 'con image.UserID:', image.UserID);

    const isOwner = user && user.userId === image.UserID;
    const isAdmin = user && user.role === 'admin';

    // Mostrar menú si es el dueño
    if (isOwner && postMenuContainer) {
        const menuContainer = document.createElement('div');
        menuContainer.className = 'comment-menu-container';

        const menuBtn = document.createElement('button');
        menuBtn.className = 'comment-menu-btn';
        menuBtn.innerHTML = '⋯';
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            togglePostMenu(imageId);
        };

        const dropdown = document.createElement('div');
        dropdown.className = 'comment-dropdown';
        dropdown.id = `post-dropdown-${imageId}`;
        dropdown.innerHTML = `
            <button class="dropdown-item" data-action="edit">
                Editar publicación
            </button>
            <button class="dropdown-item delete" data-action="delete">
                Eliminar publicación
            </button>
        `;

        // Editar publicación completa
        dropdown.querySelector('[data-action="edit"]').onclick = () => {
            closeAllMenus();
            openEditPostModal(imageId, image);
        };
        
        // Eliminar publicación
        dropdown.querySelector('[data-action="delete"]').onclick = async () => {
            closeAllMenus();
            await deletePost(imageId);
        };

        menuContainer.appendChild(menuBtn);
        menuContainer.appendChild(dropdown);
        postMenuContainer.appendChild(menuContainer);
    }
    
    // Mostrar botón de basurero si es admin pero NO es el dueño
    if (isAdmin && !isOwner && postMenuContainer) {
        const adminDeleteBtn = document.createElement('button');
        adminDeleteBtn.className = 'admin-delete-post-btn';
        adminDeleteBtn.title = 'Eliminar publicación (Admin)';
        adminDeleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `;
        adminDeleteBtn.onclick = async () => {
            await deletePostAsAdmin(imageId, image.UserID);
        };
        postMenuContainer.appendChild(adminDeleteBtn);
    }
}

function togglePostMenu(imageId) {
    const dropdown = document.getElementById(`post-dropdown-${imageId}`);
    const isActive = dropdown.classList.contains('show');

    closeAllMenus();

    if (!isActive) {
        dropdown.classList.add('show');
    }
}

// Función para eliminar publicación
async function deletePost(imageId) {
    const confirmed = await showConfirm(
        '¿Eliminar publicación?',
        'Esta acción eliminará la imagen, comentarios, canciones y likes. No se puede deshacer.',
        'warning'
    );

    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL}/api/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            await showAlert('Publicación eliminada correctamente', 'Éxito', 'success');
            const params = new URLSearchParams(window.location.search);
            const categoryId = params.get('categoryId');
            const categoryName = getCategoryName(categoryId);
            window.location.href = `category.html?id=${categoryId}&name=${categoryName}`;
        } else {
            await showAlert(data.error || 'No se pudo eliminar la publicación', 'Error', 'error');
        }
    } catch (err) {
        console.error(err);
        await showAlert('Error de conexión', 'Error', 'error');
    }
}

// Función para que admin elimine publicación de otro usuario
async function deletePostAsAdmin(imageId, imageOwnerId) {
    const confirmed = await showConfirm(
        '¿Eliminar esta publicación como administrador?',
        'Esta acción eliminará la publicación de este usuario y le enviará una notificación. No se puede deshacer.',
        'warning'
    );

    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL}/api/admin/images/${imageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            await showAlert('Publicación eliminada correctamente. Se ha notificado al usuario.', 'Éxito', 'success');
            const params = new URLSearchParams(window.location.search);
            const categoryId = params.get('categoryId');
            const categoryName = getCategoryName(categoryId);
            window.location.href = `category.html?id=${categoryId}&name=${categoryName}`;
        } else {
            await showAlert(data.error || 'No se pudo eliminar la publicación', 'Error', 'error');
        }
    } catch (err) {
        console.error(err);
        await showAlert('Error de conexión', 'Error', 'error');
    }
}

// Abrir modal para editar publicación (solo descripción)
async function openEditPostModal(imageId, image) {
    const modal = document.getElementById('edit-post-modal');
    const descriptionInput = document.getElementById('edit-description');
    const form = document.getElementById('edit-post-form');

    if (!modal || !descriptionInput || !form) {
        console.error('Elementos del modal no encontrados');
        await showAlert('Error al abrir el modal de edición', 'Error', 'error');
        return;
    }

    // Cargar descripción actual
    descriptionInput.value = image.Description || '';

    // Mostrar modal
    modal.style.display = 'flex';

    // Limpiar event listeners previos (si existen)
    const newFormHandler = async (e) => {
        e.preventDefault();
        await savePostChanges(imageId);
    };

    // Remover event listener anterior si existe
    form.removeEventListener('submit', form._submitHandler);
    // Guardar referencia al nuevo handler
    form._submitHandler = newFormHandler;
    // Agregar el nuevo event listener
    form.addEventListener('submit', newFormHandler);

    // Botón cancelar
    const cancelBtn = document.getElementById('cancel-edit-post');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Botón cerrar (X)
    const closeBtn = document.getElementById('close-edit-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    // Cerrar al hacer clic fuera del modal
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Guardar cambios de la publicación (solo descripción)
async function savePostChanges(imageId) {
    const description = document.getElementById('edit-description').value.trim();

    console.log('Guardando cambios para imagen:', imageId);
    console.log('Descripción:', description);

    if (!description) {
        await showAlert('La descripción no puede estar vacía', 'Campo vacío', 'info');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/images/${imageId}/description`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            },
            body: JSON.stringify({ description })
        });

        console.log('Status de respuesta:', res.status);

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error del servidor (texto):', errorText);
            try {
                const errorData = JSON.parse(errorText);
                console.error('Error del servidor (JSON):', errorData);
                await showAlert(errorData.error || 'Error al actualizar publicación', 'Error', 'error');
            } catch (e) {
                await showAlert('Error al actualizar publicación: ' + errorText, 'Error', 'error');
            }
            return;
        }

        const data = await res.json();
        console.log('Respuesta del servidor:', data);

        await showAlert('Publicación actualizada correctamente', 'Éxito', 'success');
        document.getElementById('edit-post-modal').style.display = 'none';
        
        // Recargar los detalles de la imagen para mostrar los cambios
        console.log('Recargando detalles de la imagen...');
        await loadImageDetail(imageId);
        // También recargar comentarios
        loadComments(imageId);

    } catch (e) {
        console.error('Error en savePostChanges:', e);
        await showAlert('Error de conexión: ' + e.message, 'Error', 'error');
    }
}

function editImageDescription(imageId, currentText) {
    const desc = document.querySelector(`[data-image-id="${imageId}"]`);
    if (!desc) return;

    const originalHTML = desc.innerHTML;

    desc.innerHTML = `
        <div class="comment-edit-form">
            <textarea class="comment-edit-input">${currentText || ''}</textarea>
            <div class="comment-edit-actions">
                <button class="btn-save-comment">Guardar</button>
                <button class="btn-cancel-comment">Cancelar</button>
            </div>
        </div>
    `;

    const textarea = desc.querySelector('textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    desc.querySelector('.btn-save-comment').onclick = async () => {
        const newText = textarea.value.trim();

        if (!newText) {
            await showAlert('La descripción no puede estar vacía', 'Campo vacío', 'info');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/images/${imageId}/description`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                },
                body: JSON.stringify({ description: newText })
            });

            const data = await res.json();

            if (res.ok) {
                loadImageDetail(imageId);
            } else {
                await showAlert(data.error || 'Error al editar descripción', 'Error', 'error');
            }
        } catch (e) {
            console.error(e);
            await showAlert('Error al editar descripción', 'Error', 'error');
        }
    };

    desc.querySelector('.btn-cancel-comment').onclick = () => {
        desc.innerHTML = originalHTML;
    };
}


// ==============================================================================
// CALCULAR TIEMPO TRANSCURRIDO
// Calcula cuánto tiempo ha pasado desde una fecha
// ==============================================================================
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Hace un momento';

    const now = new Date();
    const commentDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - commentDate) / 1000);

    // Menos de 1 minuto
    if (diffInSeconds < 60) {
        return 'Justo ahora';
    }

    // Menos de 1 hora
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    }

    // Menos de 24 horas
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    }

    // Menos de 7 días
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
    }

    // Menos de 30 días
    if (diffInDays < 30) {
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `Hace ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`;
    }

    // Menos de 365 días
    if (diffInDays < 365) {
        const diffInMonths = Math.floor(diffInDays / 30);
        return `Hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;
    }

    // Más de un año - mostrar fecha exacta
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return commentDate.toLocaleDateString('es-ES', options);
}

// ==============================================================================
// CARGAR Y RENDERIZAR COMENTARIOS (O10H5)
// Muestra todos los comentarios y botón de menú (⋯) solo en comentarios propios
// ==============================================================================
async function loadComments(imageId) {
    const list = document.getElementById('comments-list');
    const res = await fetch(`${API_URL}/api/comments/${imageId}`);
    const comments = await res.json();

    console.log('Usuario actual:', user);
    console.log('Comentarios recibidos:', comments);

    list.innerHTML = '';
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.setAttribute('data-comment-id', c.CommentID);

        // Avatar del usuario
        const avatar = document.createElement('div');
        avatar.className = 'comment-avatar';
        avatar.textContent = c.Username ? c.Username.charAt(0).toUpperCase() : 'U';
        div.appendChild(avatar);

        // Cuerpo del comentario
        const commentBody = document.createElement('div');
        commentBody.className = 'comment-body';

        // Header con nombre de usuario y menú (si aplica)
        const commentHeader = document.createElement('div');
        commentHeader.className = 'comment-header';

        // Contenido del comentario
        const contentDiv = document.createElement('div');
        contentDiv.className = 'comment-content';
        contentDiv.innerHTML = `<strong>${c.Username}</strong> <span>${c.Content}</span>`;

        commentHeader.appendChild(contentDiv);

        // ==============================================================================
        // O10H5: Mostrar menú de opciones solo si el comentario pertenece al usuario
        // ==============================================================================
        console.log('Comparando user.userId:', user?.userId, 'con c.UserID:', c.UserID);
        const isCommentOwner = user && user.userId === c.UserID;
        const isAdmin = user && user.role === 'admin';

        if (isCommentOwner) {
            const menuContainer = document.createElement('div');
            menuContainer.className = 'comment-menu-container';

            // Botón de tres puntos
            const menuBtn = document.createElement('button');
            menuBtn.className = 'comment-menu-btn';
            menuBtn.innerHTML = '⋯';
            menuBtn.onclick = (e) => {
                e.stopPropagation();
                toggleCommentMenu(c.CommentID);
            };

            // Menú desplegable
            const dropdown = document.createElement('div');
            dropdown.className = 'comment-dropdown';
            dropdown.id = `dropdown-${c.CommentID}`;
            dropdown.innerHTML = `
                <button class="dropdown-item" data-action="edit">
                    Editar
                </button>
                <button class="dropdown-item" data-action="delete">
                    Eliminar
                </button>
            `;

            // Event listeners para las opciones del menú
            dropdown.querySelector('[data-action="edit"]').onclick = (e) => {
                e.currentTarget.classList.add('active');
                setTimeout(() => {
                    closeAllMenus();
                    editComment(c.CommentID, c.Content, imageId);
                }, 150);
            };

            dropdown.querySelector('[data-action="delete"]').onclick = (e) => {
                e.currentTarget.classList.add('active');
                setTimeout(() => {
                    closeAllMenus();
                    deleteComment(c.CommentID, imageId);
                }, 150);
            };

            menuContainer.appendChild(menuBtn);
            menuContainer.appendChild(dropdown);
            commentHeader.appendChild(menuContainer);
        } 
        // Mostrar botón de basurero si es admin pero NO es el dueño del comentario
        else if (isAdmin && !isCommentOwner) {
            const adminDeleteBtn = document.createElement('button');
            adminDeleteBtn.className = 'admin-delete-comment-btn';
            adminDeleteBtn.title = 'Eliminar comentario (Admin)';
            adminDeleteBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            `;
            adminDeleteBtn.onclick = async () => {
                await deleteCommentAsAdmin(c.CommentID, c.UserID, imageId);
            };
            commentHeader.appendChild(adminDeleteBtn);
        }

        commentBody.appendChild(commentHeader);

        // Hora del comentario con tiempo transcurrido real
        const timeDiv = document.createElement('div');
        timeDiv.className = 'comment-time';
        timeDiv.textContent = getTimeAgo(c.CreatedAt || c.Timestamp || c.Date);
        commentBody.appendChild(timeDiv);

        div.appendChild(commentBody);
        list.appendChild(div);
    });
}

// ==============================================================================
// MENÚ DESPLEGABLE DE COMENTARIOS (O10H5)
// Controla la apertura/cierre del menú de opciones (⋯)
// ==============================================================================
function toggleCommentMenu(commentId) {
    const dropdown = document.getElementById(`dropdown-${commentId}`);
    const isActive = dropdown.classList.contains('show');

    // Cerrar todos los menús
    closeAllMenus();

    // Si no estaba activo, abrirlo
    if (!isActive) {
        dropdown.classList.add('show');
    }
}

// Función para cerrar todos los menús
function closeAllMenus() {
    document.querySelectorAll('.comment-dropdown').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Cerrar menús al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.comment-menu-container')) {
        closeAllMenus();
    }
});

// ==============================================================================
// EDITAR COMENTARIO (O10H5) - Modo inline como Facebook
// Convierte el comentario en un textarea editable con botones Guardar y Cancelar
// ==============================================================================
function editComment(commentId, currentContent, imageId) {
    const commentDiv = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (!commentDiv) return;

    // Guardar el contenido original
    const originalHTML = commentDiv.innerHTML;

    // Crear el formulario de edición inline
    commentDiv.innerHTML = `
        <div class="comment-edit-form">
            <textarea class="comment-edit-input" id="edit-input-${commentId}">${currentContent}</textarea>
            <div class="comment-edit-actions">
                <button class="btn-save-comment" id="save-${commentId}">Guardar</button>
                <button class="btn-cancel-comment" id="cancel-${commentId}">Cancelar</button>
            </div>
        </div>
    `;

    // Enfocar el textarea
    const textarea = document.getElementById(`edit-input-${commentId}`);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    // Botón Guardar
    document.getElementById(`save-${commentId}`).onclick = async () => {
        const newContent = textarea.value.trim();

        if (!newContent) {
            await showAlert('El comentario no puede estar vacío', 'Campo vacío', 'info');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                },
                body: JSON.stringify({ text: newContent })
            });

            const data = await res.json();

            if (res.ok) {
                loadComments(imageId); // Recargar comentarios
            } else {
                await showAlert(data.error || 'Error al editar el comentario', 'Error', 'error');
            }
        } catch (error) {
            console.error('Error al editar comentario:', error);
            await showAlert('Error al editar el comentario', 'Error', 'error');
        }
    };

    // Botón Cancelar
    document.getElementById(`cancel-${commentId}`).onclick = () => {
        commentDiv.innerHTML = originalHTML;
        // Re-asignar los eventos de los botones
        const editBtn = commentDiv.querySelector('.btn-edit-comment');
        const deleteBtn = commentDiv.querySelector('.btn-delete-comment');
        if (editBtn) editBtn.onclick = () => editComment(commentId, currentContent, imageId);
        if (deleteBtn) deleteBtn.onclick = () => deleteComment(commentId, imageId);
    };
}

// ==============================================================================
// ELIMINAR COMENTARIO (O10H5)
// Solicita confirmación antes de eliminar el comentario del usuario
// ==============================================================================
async function deleteComment(commentId, imageId) {
    const confirmed = await showConfirm(
        '¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.',
        'Eliminar comentario'
    );

    if (!confirmed) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            await showAlert('Comentario eliminado exitosamente', 'Eliminado', 'success');
            loadComments(imageId); // Recargar comentarios
        } else {
            await showAlert(data.error || 'Error al eliminar el comentario', 'Error', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        await showAlert('Error al eliminar el comentario', 'Error', 'error');
    }
}

// Función para que admin elimine comentario de otro usuario
async function deleteCommentAsAdmin(commentId, commentOwnerId, imageId) {
    const confirmed = await showConfirm(
        '¿Eliminar este comentario como administrador?',
        'Esta acción eliminará el comentario de este usuario y le enviará una notificación. No se puede deshacer.',
        'warning'
    );

    if (!confirmed) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/admin/comments/${commentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        const data = await res.json();

        if (res.ok) {
            await showAlert('Comentario eliminado correctamente. Se ha notificado al usuario.', 'Éxito', 'success');
            loadComments(imageId); // Recargar comentarios
        } else {
            await showAlert(data.error || 'Error al eliminar el comentario', 'Error', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar comentario como admin:', error);
        await showAlert('Error al eliminar el comentario', 'Error', 'error');
    }
}

// Función global para el botón onclick
window.votar = async (imageId, songId) => {
    try {
        const res = await fetch(`${API_URL}/api/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            },
            body: JSON.stringify({ imageId, songId })
        });
        const data = await res.json();
        
        if (res.ok) {
            await showAlert(data.message || 'Voto registrado correctamente', 'Éxito', 'success');
            location.reload();
        } else {
            await showAlert(data.error || data.message || 'Error al votar', 'Aviso', 'info');
        }
    } catch (e) { 
        console.error(e);
        await showAlert('Error de conexión al votar', 'Error', 'error');
    }
};

// Cargar estado de likes (para usuarios autenticados)
async function loadLikeStatus(imageId) {
    try {
        const res = await fetch(`${API_URL}/api/like-status/${imageId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Estado de likes recibido:', data);
            updateLikeUI(data.totalLikes, data.userLiked);

            // Agregar evento al botón solo una vez
            const likeButton = document.getElementById('like-button');
            if (!likeButton.dataset.listenerAdded) {
                likeButton.addEventListener('click', () => toggleLike(imageId));
                likeButton.dataset.listenerAdded = 'true';
            }
        } else {
            console.error('Error al cargar estado:', await res.text());
        }
    } catch (e) {
        console.error('Error al cargar likes:', e);
    }
}

// Cargar solo conteo de likes (para guests)
async function loadLikeCount(imageId) {
    try {
        const res = await fetch(`${API_URL}/api/like-status/${imageId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            updateLikeUI(data.totalLikes, false);
            // Deshabilitar botón para guests
            document.getElementById('like-button').disabled = true;
            document.getElementById('like-button').style.cursor = 'default';
        }
    } catch (e) {
        console.error('Error al cargar likes:', e);
    }
}

// Toggle like (dar/quitar)
async function toggleLike(imageId) {
    try {
        const res = await fetch(`${API_URL}/api/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            },
            body: JSON.stringify({ imageId })
        });

        if (res.ok) {
            const data = await res.json();
            console.log('Toggle response:', data);
            // Actualizar UI directamente con la respuesta
            updateLikeUI(data.totalLikes, data.liked);
        } else {
            console.error('Error en respuesta:', await res.text());
        }
    } catch (e) {
        console.error('Error al dar like:', e);
    }
}

// Actualizar UI de likes
function updateLikeUI(totalLikes, userLiked) {
    const heartIcon = document.getElementById('heart-icon');
    const likesCount = document.getElementById('likes-count');

    console.log('Actualizando UI - Total likes:', totalLikes, 'User liked:', userLiked);

    // Actualizar corazón
    if (userLiked) {
        heartIcon.classList.remove('not-liked');
        heartIcon.classList.add('liked');
    } else {
        heartIcon.classList.remove('liked');
        heartIcon.classList.add('not-liked');
    }

    // Actualizar contador
    const texto = totalLikes === 1 ? 'me gusta' : 'me gusta';
    likesCount.textContent = `${totalLikes} ${texto}`;
    console.log('Contador actualizado a:', likesCount.textContent);
}

// ==============================================================================
// REPRODUCTOR DE AUDIO CON YOUTUBE API (INLINE)
// ==============================================================================

let player;
let currentVideoId = null;
let progressInterval = null;
let currentPlayerContainer = null;

function extraerIdYoutube(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Cargar API de YouTube
function cargarYouTubeAPI() {
    if (window.YT && window.YT.Player) {
        return Promise.resolve();
    }
    
    return new Promise((resolve) => {
        if (!window.onYouTubeIframeAPIReady) {
            window.onYouTubeIframeAPIReady = () => {
                resolve();
            };
            
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            resolve();
        }
    });
}

window.abrirModalYoutube = async function (url, titulo, buttonElement) {
    const videoId = extraerIdYoutube(url);

    if (!videoId) {
        await showAlert('URL de YouTube no válida', 'Error', 'error');
        return;
    }

    currentVideoId = videoId;

    // Cargar API de YouTube
    await cargarYouTubeAPI();

    // Encontrar el contenedor del botón (song-item)
    const songItem = buttonElement.closest('.song-item');
    if (!songItem) return;

    // Si ya hay un reproductor activo, cerrarlo
    if (currentPlayerContainer) {
        cerrarReproductor();
    }

    // Obtener template y clonarlo
    const template = document.getElementById('audio-player-template');
    const playerClone = template.content.cloneNode(true);
    const playerElement = playerClone.querySelector('.audio-player-inline');

    // Guardar el botón original para restaurarlo después
    const originalButton = buttonElement.cloneNode(true);
    originalButton.onclick = () => abrirModalYoutube(url, titulo, originalButton);

    // REEMPLAZAR el botón con el reproductor (no ocultar)
    buttonElement.replaceWith(playerElement);

    // Guardar referencia al contenedor actual y al botón original
    currentPlayerContainer = playerElement;
    currentPlayerContainer._originalButton = originalButton;

    // Configurar event listeners del reproductor
    setupPlayerControls(currentPlayerContainer);

    // Crear o actualizar player
    if (!player) {
        player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            videoId: videoId,
            playerVars: {
                'autoplay': 1,
                'controls': 0,
                'rel': 0
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        player.loadVideoById(videoId);
        player.playVideo();
    }
}

function setupPlayerControls(playerContainer) {
    const playBtn = playerContainer.querySelector('[data-action="play"]');
    const closeBtn = playerContainer.querySelector('[data-action="close"]');
    const progressContainer = playerContainer.querySelector('.audio-progress-container-inline');

    // Botón play/pause
    playBtn.addEventListener('click', () => {
        if (player) {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
        }
    });

    // Botón cerrar
    closeBtn.addEventListener('click', () => {
        cerrarReproductor();
    });

    // Barra de progreso clickeable
    progressContainer.addEventListener('click', (e) => {
        if (!player || !player.getDuration) return;

        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        const duration = player.getDuration();
        const newTime = duration * percentage;

        player.seekTo(newTime, true);
    });
}

function onPlayerReady(event) {
    event.target.playVideo();
    startProgressUpdate();
}

function onPlayerStateChange(event) {
    if (!currentPlayerContainer) return;

    const playBtn = currentPlayerContainer.querySelector('[data-action="play"]');
    const playIcon = playBtn.querySelector('.play-icon');
    const pauseIcon = playBtn.querySelector('.pause-icon');

    if (event.data === YT.PlayerState.PLAYING) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        startProgressUpdate();
    } else if (event.data === YT.PlayerState.PAUSED) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        stopProgressUpdate();
    } else if (event.data === YT.PlayerState.ENDED) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        stopProgressUpdate();
        resetProgress();
    }
}

function startProgressUpdate() {
    stopProgressUpdate();
    progressInterval = setInterval(updateProgress, 100);
}

function stopProgressUpdate() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function updateProgress() {
    if (!player || !player.getDuration || !currentPlayerContainer) return;

    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();

    if (duration > 0) {
        const progress = (currentTime / duration) * 100;
        const progressBar = currentPlayerContainer.querySelector('.audio-progress-bar-inline');
        const currentTimeEl = currentPlayerContainer.querySelector('[data-time="current"]');
        const totalTimeEl = currentPlayerContainer.querySelector('[data-time="total"]');
        
        if (progressBar) progressBar.style.width = progress + '%';
        if (currentTimeEl) currentTimeEl.textContent = formatTime(currentTime);
        if (totalTimeEl) totalTimeEl.textContent = formatTime(duration);
    }
}

function resetProgress() {
    if (!currentPlayerContainer) return;
    
    const progressBar = currentPlayerContainer.querySelector('.audio-progress-bar-inline');
    const currentTimeEl = currentPlayerContainer.querySelector('[data-time="current"]');
    
    if (progressBar) progressBar.style.width = '0%';
    if (currentTimeEl) currentTimeEl.textContent = '0:00';
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function cerrarReproductor() {
    if (!currentPlayerContainer) return;

    // Obtener el botón original guardado
    const originalButton = currentPlayerContainer._originalButton;
    
    // Reemplazar el reproductor con el botón original
    if (originalButton) {
        currentPlayerContainer.replaceWith(originalButton);
    } else {
        currentPlayerContainer.remove();
    }
    
    currentPlayerContainer = null;
    
    if (player) {
        player.pauseVideo();
        stopProgressUpdate();
    }
}

// ===============================================================================
// SISTEMA DE MODALES PERSONALIZADOS
// ===============================================================================

// Función para mostrar modal de confirmación
window.showConfirm = function (message, title = '¿Estás seguro?') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const icon = document.getElementById('custom-modal-icon');
        const titleEl = document.getElementById('custom-modal-title');
        const messageEl = document.getElementById('custom-modal-message');
        const buttonsContainer = document.getElementById('custom-modal-buttons');

        // Configurar icono
        icon.className = 'custom-modal-icon warning';
        icon.innerHTML = '⚠';

        // Configurar contenido
        titleEl.textContent = title;
        messageEl.textContent = message;

        // Crear botones
        buttonsContainer.innerHTML = `
            <button class="custom-modal-btn cancel" id="modal-cancel">Cancelar</button>
            <button class="custom-modal-btn confirm" id="modal-confirm">Confirmar</button>
        `;

        // Event listeners
        document.getElementById('modal-cancel').onclick = () => {
            overlay.classList.remove('active');
            resolve(false);
        };

        document.getElementById('modal-confirm').onclick = () => {
            overlay.classList.remove('active');
            resolve(true);
        };

        // Mostrar modal
        overlay.classList.add('active');
    });
};

// Función para mostrar alertas personalizadas
window.showAlert = function (message, title = 'Información', type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const icon = document.getElementById('custom-modal-icon');
        const titleEl = document.getElementById('custom-modal-title');
        const messageEl = document.getElementById('custom-modal-message');
        const buttonsContainer = document.getElementById('custom-modal-buttons');

        // Configurar icono según el tipo
        if (type === 'success') {
            icon.className = 'custom-modal-icon success';
            icon.innerHTML = '✓';
        } else if (type === 'error') {
            icon.className = 'custom-modal-icon warning';
            icon.innerHTML = '✕';
        } else {
            icon.className = 'custom-modal-icon info';
            icon.innerHTML = 'ℹ';
        }

        // Configurar contenido
        titleEl.textContent = title;
        messageEl.textContent = message;

        // Crear botón
        buttonsContainer.innerHTML = `
            <button class="custom-modal-btn ok" id="modal-ok">Aceptar</button>
        `;

        // Event listener
        document.getElementById('modal-ok').onclick = () => {
            overlay.classList.remove('active');
            resolve(true);
        };

        // Mostrar modal
        overlay.classList.add('active');
    });
};