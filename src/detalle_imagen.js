const API_URL = 'http://localhost:4000';
const user = getUserInfo(); // De app.js

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const imageId = params.get('id');

    if (!imageId) return alert('ID no encontrado');

    // 1. CARGAR INFO E IMAGEN
    try {
        const res = await fetch(`${API_URL}/api/image-detail/${imageId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        // Renderizar Info
        document.getElementById('det-img').src = data.image.ImageURL;
        document.getElementById('det-title').textContent = data.image.Title;
        document.getElementById('det-desc').textContent = data.image.Description;
        document.getElementById('det-user').textContent = data.image.Username;

        // Renderizar Canciones
        const songsList = document.getElementById('songs-list');
        songsList.innerHTML = '';
        data.songs.forEach(song => {
            const div = document.createElement('div');
            div.className = 'song-item';
            div.innerHTML = `
                <div>
                    <strong>${song.Title}</strong>
                    <br><a href="javascript:void(0)" onclick="abrirModalYoutube('${song.ExternalURL}', '${song.Title.replace(/'/g, "\\'")}')" style="font-size:0.8em; color:#007bff;">▶ Escuchar</a>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:0.9em;">Votos: ${song.Votes}</span><br>
                    ${user.role !== 'guest' ? `<button class="btn-vote" onclick="votar(${imageId}, ${song.SongID})">Votar</button>` : ''}
                </div>
            `;
            songsList.appendChild(div);
        });

    } catch (e) { console.error(e); }

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
            alert('Debes iniciar sesión para comentar');
            return;
        }

        const text = e.target.text.value.trim();
        
        if (!text) {
            alert('Por favor escribe un comentario');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                },
                body: JSON.stringify({ imageId, text })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                e.target.reset();
                loadComments(imageId);
            } else {
                alert(data.error || 'Error al publicar comentario');
            }
        } catch (error) { 
            console.error('Error al enviar comentario:', error);
            alert('Error de conexión. Intenta nuevamente.');
        }
    });
});

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
        
        // Contenido del comentario
        const contentSpan = document.createElement('span');
        contentSpan.className = 'comment-content';
        contentSpan.innerHTML = `<strong>${c.Username}:</strong> ${c.Content}`;
        div.appendChild(contentSpan);
        
        // ==============================================================================
        // O10H5: Mostrar menú de opciones solo si el comentario pertenece al usuario
        // ==============================================================================
        console.log('Comparando user.userId:', user?.userId, 'con c.UserID:', c.UserID);
        if (user && user.userId === c.UserID) {
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
            div.appendChild(menuContainer);
        }
        
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
            alert('El comentario no puede estar vacío');
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
                alert(data.error || 'Error al editar el comentario');
            }
        } catch (error) {
            console.error('Error al editar comentario:', error);
            alert('Error al editar el comentario');
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
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
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
            alert('Comentario eliminado exitosamente');
            loadComments(imageId); // Recargar comentarios
        } else {
            alert(data.error || 'Error al eliminar el comentario');
        }
    } catch (error) {
        console.error('Error al eliminar comentario:', error);
        alert('Error al eliminar el comentario');
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
        alert(data.message || data.error);
        if (res.ok) location.reload();
    } catch (e) { console.error(e); }
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

function extraerIdYoutube(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.abrirModalYoutube = function(url, titulo) {
    const videoId = extraerIdYoutube(url);
    
    if (!videoId) {
        alert('URL de YouTube no válida');
        return;
    }
    
    const modal = document.getElementById('youtube-modal');
    const iframe = document.getElementById('youtube-iframe');
    const modalTitle = document.getElementById('youtube-modal-title');
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    
    iframe.src = embedUrl;
    modalTitle.textContent = titulo;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

window.cerrarModalYoutube = function() {
    const modal = document.getElementById('youtube-modal');
    const iframe = document.getElementById('youtube-iframe');
    
    iframe.src = '';
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.onclick = function(event) {
    const modal = document.getElementById('youtube-modal');
    if (event.target === modal) {
        cerrarModalYoutube();
    }
}

document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('youtube-modal');
    if (modal.style.display === 'block' && event.key === 'Escape') {
        cerrarModalYoutube();
    }
});