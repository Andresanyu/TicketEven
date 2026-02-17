function navigate(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".sidebar nav a").forEach((a) => a.classList.remove("active"));

  document.getElementById(`page-${pageId}`)?.classList.add("active");
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add("active");

  if (pageId === "events") loadEvents();
  if (pageId === "users") loadUsers();
  if (pageId === "dashboard") loadDashboard();
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

async function loadDashboard() {
  const [events, users] = await Promise.all([
    api.get("/events"),
    api.get("/users"),
  ]);
  document.getElementById("dash-events").textContent = events.length;
  document.getElementById("dash-users").textContent = users.length;
  document.getElementById("dash-active").textContent = events.filter((e) => e.status === "active").length;
}

navigate("dashboard");