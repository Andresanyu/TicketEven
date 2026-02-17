// js/users.js
let editingUserId = null;

async function loadUsers() {
  const users = await api.get("/users");
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = "";

  document.getElementById("stat-total-users").textContent = users.length;

  users.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge ${u.role}">${u.role}</span></td>
      <td>${u.city}</td>
      <td>${(u.preferences || []).join(", ") || "—"}</td>
      <td style="display:flex;gap:6px;padding-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="openUserModal('${u.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openUserModal(id = null) {
  editingUserId = id;
  const modal = document.getElementById("user-modal");
  const title = document.getElementById("user-modal-title");

  if (id) {
    title.textContent = "Editar Usuario";
    api.get(`/users/${id}`).then((u) => {
      document.getElementById("u-name").value = u.name;
      document.getElementById("u-email").value = u.email;
      document.getElementById("u-role").value = u.role;
      document.getElementById("u-city").value = u.city;
      document.getElementById("u-prefs").value = (u.preferences || []).join(", ");
    });
  } else {
    title.textContent = "Nuevo Usuario";
    document.getElementById("user-form").reset();
  }

  modal.classList.add("open");
}

function closeUserModal() {
  document.getElementById("user-modal").classList.remove("open");
  editingUserId = null;
}

async function saveUser() {
  const prefsRaw = document.getElementById("u-prefs").value;
  const data = {
    name: document.getElementById("u-name").value,
    email: document.getElementById("u-email").value,
    role: document.getElementById("u-role").value,
    city: document.getElementById("u-city").value,
    preferences: prefsRaw ? prefsRaw.split(",").map((s) => s.trim()) : [],
  };

  if (editingUserId) {
    await api.put(`/users/${editingUserId}`, data);
    showToast("Usuario actualizado");
  } else {
    await api.post("/users", data);
    showToast("Usuario creado");
  }

  closeUserModal();
  loadUsers();
}

async function deleteUser(id) {
  if (!confirm("¿Eliminar este usuario?")) return;
  await api.del(`/users/${id}`);
  showToast("Usuario eliminado");
  loadUsers();
}