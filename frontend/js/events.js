let editingEventId = null;

async function loadEvents() {
  const events = await api.get("/events");
  const tbody = document.getElementById("events-tbody");
  tbody.innerHTML = "";

  document.getElementById("stat-total-events").textContent = events.length;
  document.getElementById("stat-active-events").textContent = events.filter(e => e.status === "active").length;

  events.forEach((ev) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ev.name}</td>
      <td>${ev.date}</td>
      <td>${ev.venue}</td>
      <td><span class="badge ${ev.status}">${ev.status}</span></td>
      <td>${ev.availableSeats}/${ev.totalSeats}</td>
      <td>$${Number(ev.price).toLocaleString("es-CO")}</td>
      <td style="display:flex;gap:6px;padding-top:10px">
        <button class="btn btn-ghost btn-sm" onclick="openEventModal('${ev.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEvent('${ev.id}')">Borrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEventModal(id = null) {
  editingEventId = id;
  const modal = document.getElementById("event-modal");
  const title = document.getElementById("event-modal-title");

  if (id) {
    title.textContent = "Editar Evento";
    api.get(`/events/${id}`).then((ev) => {
      document.getElementById("ev-name").value = ev.name;
      document.getElementById("ev-date").value = ev.date;
      document.getElementById("ev-venue").value = ev.venue;
      document.getElementById("ev-category").value = ev.category;
      document.getElementById("ev-seats").value = ev.totalSeats;
      document.getElementById("ev-price").value = ev.price;
      document.getElementById("ev-status").value = ev.status;
    });
  } else {
    title.textContent = "Nuevo Evento";
    document.getElementById("event-form").reset();
  }

  modal.classList.add("open");
}

function closeEventModal() {
  document.getElementById("event-modal").classList.remove("open");
  editingEventId = null;
}

async function saveEvent() {
  const data = {
    name: document.getElementById("ev-name").value,
    date: document.getElementById("ev-date").value,
    venue: document.getElementById("ev-venue").value,
    category: document.getElementById("ev-category").value,
    totalSeats: document.getElementById("ev-seats").value,
    price: document.getElementById("ev-price").value,
    status: document.getElementById("ev-status").value,
  };

  if (editingEventId) {
    await api.put(`/events/${editingEventId}`, data);
    showToast("Evento actualizado");
  } else {
    await api.post("/events", data);
    showToast("Evento creado");
  }

  closeEventModal();
  loadEvents();
}

async function deleteEvent(id) {
  if (!confirm("¿Eliminar este evento?")) return;
  await api.del(`/events/${id}`);
  showToast("Evento eliminado");
  loadEvents();
}