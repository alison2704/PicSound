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
                    <br><a href="${song.ExternalURL}" target="_blank" style="font-size:0.8em; color:#007bff;">Escuchar</a>
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

async function loadComments(imageId) {
    const list = document.getElementById('comments-list');
    const res = await fetch(`${API_URL}/api/comments/${imageId}`);
    const comments = await res.json();

    list.innerHTML = '';
    comments.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment';
        div.innerHTML = `<strong>${c.Username}:</strong> ${c.Content}`;
        list.appendChild(div);
    });
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