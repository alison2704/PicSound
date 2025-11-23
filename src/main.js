const API_URL = 'http://localhost:4000'; // definir la url del backend

const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
//ojoo se deberia añadir el botón para "solo ver"
const loginBtn = document.getElementById('login');
const formRegister = document.querySelector('.form-container.sign-up form');
//usamos el input de email del formulario de registro para la validación
const emailInputRegister = document.querySelector('.form-container.sign-up input[name="email"]');
const passwordInputRegister = document.querySelector('.form-container.sign-up input[name="password"]');

const errorModal = document.getElementById('error-modal');
const modalMessage = document.getElementById('modal-message');
const closeModalButton = document.getElementById('close-modal');

const loginForm = document.querySelector('.form-container.sign-in form');

// control de vistas 
registerBtn.addEventListener('click', () => {
  container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
  container.classList.remove("active");
});

// funcionalidad del modalde error
function showModal(message) {
  modalMessage.textContent = message;
  errorModal.style.display = 'block';
}

closeModalButton.addEventListener('click', () => {
  errorModal.style.display = 'none';
});

// --- validación de email ---
function validarEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@(outlook|gmail|hotmail)\.com$/i;
  if (regex.test(email)) {
    return true;
  } else {
    showModal('Por favor, ingrese un email válido con uno de los siguientes dominios: Outlook, Gmail, Hotmail');
    return false;
  }
}


// ----------------------------------------------------
// manejo completo del registro (envío con fetch)
// ----------------------------------------------------
formRegister.addEventListener('submit', async (event) => {
  event.preventDefault(); // detener el envío por defecto

  const username = document.querySelector('.form-container.sign-up input[name="username"]').value;
  const email = emailInputRegister.value;
  const password = passwordInputRegister.value;

  // validar Email
  if (!validarEmail(email)) {
    return;
  }

  // validar Longitud de Contraseña
  if (password.length < 8) {
    showModal('La contraseña debe tener al menos 8 caracteres. Por favor, ingrese una contraseña más segura.');
    return;
  }

  // enviar al Backend
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (response.ok) { // Status 200-299
      showModal(data.message);
      // redirigir al panel de login
      container.classList.remove("active");
    } else {
      // muestra error de unicidad (email ya existe)
      showModal(data.message || 'Error desconocido en el registro.');
    }
  } catch (error) {
    console.error('Error de red/servidor:', error);
    showModal('Error de conexión con el servidor. Verifique que el backend esté corriendo en puerto 4000.');
  }
});

// ----------------------------------------------------
// manejo completo del login (envío con fetch)
// ----------------------------------------------------
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const loginData = Object.fromEntries(formData.entries());

  // [FIX 3] Validación de campos vacíos en Frontend (C61)
  if (!loginData.username || !loginData.password) {
    showModal('Por favor, ingresa tu usuario y contraseña.');
    return; // Detiene la ejecución, evitando la redirección no deseada
  }

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();

    if (response.ok) {
      // [FIX CLAVE 4] Guardar el token para que app.js sepa que estamos autenticados
      localStorage.setItem('jwtToken', data.token);

      // Redirigir al index.html
      window.location.href = data.redirect;
    } else {
      // Muestra error si credenciales son incorrectas (401)
      showModal(data.message || 'Credenciales inválidas.');
    }
  } catch (error) {
    console.error('Error al intentar iniciar sesión:', error);
    showModal('Error al intentar iniciar sesión. Por favor, intente más tarde.');
  }
});

// Función para simular la decodificación y obtener el rol/nombre
function decodeJWT(token) {
  // ... [Copia la implementación de decodeJWT aquí] ...
  try {
    const base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}