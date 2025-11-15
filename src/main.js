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

  // loginData contiene { username, password } según tu HTML

  try {
    const response = await fetch(`${API_URL}/login`, { // <--- Usa API_URL aquí
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });

    const data = await response.json();

    if (response.ok) {
      // redirigir al usuario si el inicio de sesión fue exitoso
      window.location.href = data.redirect;
    } else {
      // mostrar modal con mensaje de error (credenciales inválidas)
      showModal(data.message || 'Credenciales inválidas.'); // usa showModal para consolidar
    }
  } catch (error) {
    console.error('Error al intentar iniciar sesión:', error);
    showModal('Error al intentar iniciar sesión. Por favor, intente más tarde.');
  }
});
