const API_URL = 'http://localhost:4000';
const user = getUserInfo(); // Viene de app.js

document.addEventListener("DOMContentLoaded", async function () {
    // 1. OBTENER PARAMETROS (ID y NOMBRE)
    const params = new URLSearchParams(window.location.search);
    const categoryName = params.get('name') || 'Galería';
    const categoryId = params.get('id'); // IMPORTANTE: Este es el número (ej: 2)

    // Configurar Títulos
    const titleEl = document.getElementById('category-title');
    if (titleEl) titleEl.textContent = categoryName.toUpperCase();
    document.title = `${categoryName} | PicSound`;

    // --- MANEJO DE MODALES ---
    const uploadBtn = document.getElementById('upload-btn');
    const uploadModal = document.getElementById('upload-modal');
    const successModal = document.getElementById('success-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const btnSuccessOk = document.getElementById('btn-success-ok');

    // Mostrar botón de subir solo si es usuario registrado
    if (user && user.role !== 'guest' && uploadBtn) {
        uploadBtn.style.display = 'block';
        uploadBtn.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
        });
    }

    // Mostrar botón de cerrar sesión solo si está autenticado
    const logoutBtn = document.getElementById('logout-category');
    if (user && user.role !== 'guest' && logoutBtn) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', handleLogoutConfirm);
    }

    // Cerrar modal de formulario
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => uploadModal.style.display = 'none');
    }

    // Cerrar modal de éxito y REFRESCAR GALERÍA
    if (btnSuccessOk) {
        btnSuccessOk.addEventListener('click', () => {
            successModal.style.display = 'none';
            // AQUÍ ESTÁ EL TRUCO "TIEMPO REAL":
            // Volvemos a pedir las fotos al servidor sin recargar la página
            loadGallery(categoryId);
        });
    }

    // Cerrar al dar clic fuera
    window.onclick = (e) => {
        if (e.target == uploadModal) uploadModal.style.display = 'none';
        if (e.target == successModal) successModal.style.display = 'none';
    };

    // --- LÓGICA DE SUBIDA (FORMULARIO) ---
    const form = document.getElementById('upload-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validar archivo de imagen
            const fileInput = document.getElementById('file-input');
            const file = fileInput.files[0];

            if (!file) {
                alert('Por favor selecciona una imagen');
                return;
            }

            // Validar extensión
            const allowedExtensions = /(\.(jpg|jpeg|png))$/i;
            if (!allowedExtensions.test(file.name)) {
                alert('Solo se permiten archivos de imagen en formato .jpg, .jpeg o .png');
                fileInput.value = '';
                return;
            }

            // Validar tipo MIME
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                alert('El archivo seleccionado no es una imagen válida');
                fileInput.value = '';
                return;
            }

            // Validar tamaño (máximo 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB en bytes
            if (file.size > maxSize) {
                alert('La imagen es muy grande. El tamaño máximo permitido es 5MB');
                fileInput.value = '';
                return;
            }

            // Preparar datos
            const formData = new FormData();
            formData.append('image', file);
            formData.append('title', form.title.value);
            formData.append('description', form.description.value);
            
            // Validar que tengamos un categoryId válido
            if (!categoryId) {
                alert('Error: No se puede subir imagen sin una categoría válida. Por favor, accede desde una categoría específica.');
                return;
            }
            
            formData.append('category', categoryName); // El backend busca por nombre

            // Recopilar Canciones
            const titles = document.querySelectorAll('.song-title');
            const links = document.querySelectorAll('.song-link');
            const errorBox = document.getElementById('songs-error-msg');
            // Limpiar mensaje previo
            errorBox.style.display = "none";
            errorBox.textContent = "";

            let songsData = [];
            let linksSet = new Set();

            for (let i = 0; i < links.length; i++) {
                const title = titles[i].value.trim();
                const link = links[i].value.trim();

                // Revisar duplicados
                if (linksSet.has(link)) {
                    errorBox.textContent = "No puedes repetir el mismo link en las canciones.";
                    errorBox.style.display = "block";
                    errorBox.style.opacity = "1";

                    // Ocultar mensaje después de 5 segundos
                    setTimeout(() => {
                        errorBox.style.opacity = "0";
                        setTimeout(() => {
                            errorBox.style.display = "none";
                        }, 600); // coincide con transition: 0.6s
                    }, 2000);

                    return; // Detener envío
                }

                linksSet.add(link);
                songsData.push({ title, link });
            }
            formData.append('songs', JSON.stringify(songsData));

            const token = localStorage.getItem('jwtToken');

            try {
                const res = await fetch(`${API_URL}/api/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const data = await res.json();

                if (res.ok) {
                    // ÉXITO: 
                    // 1. Ocultar formulario
                    uploadModal.style.display = 'none';
                    // 2. Limpiar formulario
                    form.reset();
                    // 3. Mostrar Modal Bonito
                    successModal.style.display = 'flex';
                } else {
                    alert('Error: ' + (data.message || data.error));
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión.');
            }
        });
    }

    // CARGAR GALERÍA AL INICIAR
    if (categoryId) {
        loadGallery(categoryId); // Usamos el ID numérico
    } else {
        document.getElementById('gallery').innerHTML = '<p style="text-align:center; color:white;">Error: Falta ID de categoría en la URL.</p>';
    }

    // Recargar galería cuando la página vuelve a estar visible (regresando de detalle)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && categoryId) {
            loadGallery(categoryId);
        }
    });

    // También recargar cuando la ventana vuelve a tener foco
    window.addEventListener('focus', () => {
        if (categoryId) {
            loadGallery(categoryId);
        }
    });
});

// FUNCIÓN PARA CARGAR/RENDERIZAR IMÁGENES
async function loadGallery(id) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '<p style="text-align:center; color:#888;">Cargando...</p>';

    try {
        const res = await fetch(`${API_URL}/api/images/${id}`);

        if (!res.ok) throw new Error("Error al obtener imágenes");

        const images = await res.json();

        if (images.length === 0) {
            gallery.innerHTML = '<p style="text-align:center; color:#aaa; margin-top:50px;">No hay imágenes en esta categoría aún.</p>';
            return;
        }

        gallery.innerHTML = '';

        images.forEach(img => {
            // Validamos que los datos existan para evitar "undefined"
            //const title = img.Title || 'Sin título';
            const username = img.UploaderUsername || img.Username || 'Anónimo'; // A veces SQL devuelve uno u otro
            const likes = img.LikesCount || 0;
            const url = img.ImageURL; // SQL Server respeta mayúsculas

            const card = document.createElement('div');
            card.className = 'gallery-item';
            card.onclick = () => window.location.href = `detalle_imagen.html?id=${img.ImageID}&categoryId=${id}`;

            card.innerHTML = `
                <img src="${url}" alt="Imagen de galería" loading="lazy"
                    onerror="this.src='https://via.placeholder.com/300?text=Error+Img'">

                <div class="gallery-info">
                    <p style="margin:0; font-size:0.9em; color:#ddd;">
                        Por: ${username}
                    </p>

                    <div style="margin-top:10px; font-size:0.85em; display:flex; align-items:center; gap:5px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" style="fill:#ed4956;">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                                    2 5.42 4.42 3 7.5 3c1.74 0
                                    3.41.81 4.5 2.09
                                    C13.09 3.81 14.76 3
                                    16.5 3 19.58 3
                                    22 5.42 22 8.5
                                    c0 3.78-3.4 6.86
                                    -8.55 11.54L12 21.35z"/>
                        </svg>
                        <span>${likes} me gusta</span>
                    </div>
                </div>
            `;

            gallery.appendChild(card);
        });

    } catch (error) {
        console.error("Error gallery:", error);
        gallery.innerHTML = '<p style="text-align:center; color:red;">Error al cargar la galería.</p>';
    }
}