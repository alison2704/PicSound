// src/main.js

// Prueba de conexión entre frontend (Vite) y backend (Express + SQL Server)

console.log("Iniciando prueba de conexión con el backend...");

fetch('http://localhost:4000/api/test-db')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Conexión OK:', data);
    document.body.innerHTML = `
      <h1>Conexión exitosa con la base de datos 🎉</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
  })
  .catch(err => {
    console.error('❌ Error de conexión:', err);
    document.body.innerHTML = `
      <h1 style="color:red;">Error de conexión con el backend 😢</h1>
      <p>${err.message}</p>
    `;
  });
