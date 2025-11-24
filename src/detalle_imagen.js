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