async function loadQueue() {
  const res = await fetch("/api/factory/queue");
  const queue = await res.json();
  const root = document.getElementById("queue");
  root.innerHTML = "";

  queue.forEach(t => {
    const div = document.createElement("div");
    div.innerHTML = `
      <b>${t.title}</b> (${t.status})<br>
      <button onclick="approve('${t.id}')">Approve</button>
      <button onclick="reject('${t.id}')">Reject</button>
      <button onclick="defer('${t.id}')">Defer</button>
      <hr>
    `;
    root.appendChild(div);
  });
}

async function approve(id) {
  await fetch(`/api/factory/approve/${id}`, { method: "POST" });
  loadQueue();
  loadPublished();
}

async function reject(id) {
  await fetch(`/api/factory/reject/${id}`, { method: "POST" });
  loadQueue();
}

async function defer(id) {
  await fetch(`/api/factory/defer/${id}`, { method: "POST" });
  loadQueue();
}

async function loadPublished() {
  const res = await fetch("/api/published");
  const pages = await res.json();
  const ul = document.getElementById("published");
  ul.innerHTML = "";
  pages.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${p.url}" target="_blank">${p.title}</a>`;
    ul.appendChild(li);
  });
}

loadQueue();
loadPublished();
