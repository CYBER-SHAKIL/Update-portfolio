(() => {
  const cfg = window.SUPABASE_URL && window.SUPABASE_PUBLISHABLE_KEY;
  const $ = (s) => document.querySelector(s);
  const status = (el, msg, bad = false) => { if (el) { el.textContent = msg; el.style.color = bad ? "#ff8e9b" : "var(--cyan)"; } };
  if (!cfg || !window.supabase) {
    status($("#contact-status"), "Database configuration is missing.", true);
    $("#project-grid").innerHTML = '<div class="empty-state">Add your Supabase URL and publishable key in config.js.</div>';
    return;
  }
  const db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  let sessionUser = null, signupMode = false;

  async function loadProjects() {
    const box = $("#project-grid");
    const { data, error } = await db.from("projects").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) { box.innerHTML = '<div class="empty-state">Could not load projects. Check database setup.</div>'; return; }
    if (!data?.length) { box.innerHTML = '<div class="empty-state">Projects are coming soon.</div>'; return; }
    box.innerHTML = data.map((p, i) => `<article class="project-card"><span class="project-index">PROJECT / ${String(i + 1).padStart(2, "0")}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><div class="tags">${(p.tech_stack || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>${p.project_url ? `<a class="project-link" href="${safeUrl(p.project_url)}" target="_blank" rel="noopener noreferrer">View project ↗</a>` : ""}</article>`).join("");
  }
  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function safeUrl(v) { try { const u = new URL(v); return ["http:","https:"].includes(u.protocol) ? esc(u.href) : "#"; } catch { return "#"; } }

  async function countVisit() {
    try {
      const { error } = await db.from("site_visits").insert({});
      if (error) return;
      const { count } = await db.from("site_visits").select("id", { count: "exact", head: true });
      if (count !== null) $("#visitor-count").textContent = count.toLocaleString();
    } catch {}
  }
  $("#contact-form").addEventListener("submit", async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const payload = { name: f.get("name").trim(), email: f.get("email").trim(), subject: f.get("subject").trim(), message: f.get("message").trim() };
    const b = e.currentTarget.querySelector('button[type="submit"]'); b.disabled = true;
    const { error } = await db.from("contact_messages").insert(payload);
    b.disabled = false;
    if (error) status($("#contact-status"), "Message could not be sent. Please try again later.", true);
    else { e.currentTarget.reset(); status($("#contact-status"), "Message sent — thanks for reaching out!"); }
  });

  const dialog = $("#auth-dialog");
  $("#auth-open").addEventListener("click", () => dialog.showModal());
  $("#toggle-auth").addEventListener("click", () => {
    signupMode = !signupMode;
    $("#auth-title").textContent = signupMode ? "Create account." : "Welcome back.";
    $("#auth-subtitle").textContent = signupMode ? "Create an account with email and password." : "Sign in to your account.";
    $("#auth-submit").textContent = signupMode ? "Create account" : "Sign in";
    $("#toggle-auth").textContent = signupMode ? "Already have an account?" : "Create an account";
    $("#auth-form [name=password]").autocomplete = signupMode ? "new-password" : "current-password";
    status($("#auth-status"), "");
  });
  $("#auth-form").addEventListener("submit", async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget), email = f.get("email").trim(), password = f.get("password");
    const b = $("#auth-submit"); b.disabled = true;
    const result = signupMode ? await db.auth.signUp({ email, password, options: { emailRedirectTo: location.origin } }) : await db.auth.signInWithPassword({ email, password });
    b.disabled = false;
    if (result.error) status($("#auth-status"), result.error.message, true);
    else if (signupMode && !result.data.session) status($("#auth-status"), "Account created. Check your email to confirm, then sign in.");
    else { status($("#auth-status"), "Signed in successfully."); await syncAuth(); if (sessionUser) setTimeout(() => dialog.close(), 500); }
  });
  $("#forgot-password").addEventListener("click", async () => {
    const email = $("#auth-form [name=email]").value.trim();
    if (!email) return status($("#auth-status"), "Enter your email address first.", true);
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
    status($("#auth-status"), error ? error.message : "If that account exists, a password reset email has been sent.", !!error);
  });
  document.querySelectorAll("[data-provider]").forEach(btn => btn.addEventListener("click", async () => {
    const { error } = await db.auth.signInWithOAuth({ provider: btn.dataset.provider, options: { redirectTo: location.origin } });
    if (error) status($("#auth-status"), error.message, true);
  }));
  $("#sign-out").addEventListener("click", async () => { await db.auth.signOut(); $("#admin-panel").classList.add("hidden"); $("#auth-open").textContent = "Sign in"; });
  db.auth.onAuthStateChange(() => { setTimeout(syncAuth, 0); });
  async function syncAuth() {
    const { data } = await db.auth.getSession(); sessionUser = data.session?.user || null;
    $("#auth-open").textContent = sessionUser ? "Account" : "Sign in";
    const admin = sessionUser?.app_metadata?.role === "admin";
    $("#admin-panel").classList.toggle("hidden", !admin);
    if (admin) await loadAdmin();
  }

  async function loadAdmin() {
    const [{ count: visits }, { data: projects }, { data: messages, count: msgCount }] = await Promise.all([
      db.from("site_visits").select("id", { count: "exact", head: true }),
      db.from("projects").select("*").order("sort_order"),
      db.from("contact_messages").select("*", { count: "exact" }).order("created_at", { ascending: false })
    ]);
    $("#admin-visitors").textContent = visits ?? "—";
    $("#admin-project-count").textContent = projects?.length ?? "—";
    $("#admin-message-count").textContent = msgCount ?? "—";
    $("#admin-projects").innerHTML = (projects || []).map(p => `<div class="admin-item"><b>${esc(p.title)}</b><p>${esc(p.description)}</p><div class="admin-item-actions"><button class="btn btn-ghost" data-edit="${p.id}">Edit</button><button class="btn btn-ghost" data-delete="${p.id}">Delete</button></div></div>`).join("") || '<p class="muted">No projects yet.</p>';
    $("#admin-messages").innerHTML = (messages || []).map(m => `<div class="admin-item"><b>${esc(m.name)}</b> <span class="muted">· ${esc(m.status)}</span><p>${esc(m.email)}${m.subject ? " · " + esc(m.subject) : ""}</p><p>${esc(m.message)}</p><div class="admin-item-actions"><button class="btn btn-ghost" data-read="${m.id}">Mark read</button><button class="btn btn-ghost" data-archive="${m.id}">Archive</button></div></div>`).join("") || '<p class="muted">Inbox is empty.</p>';
    $("#admin-projects").querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
      const p = projects.find(x => x.id === b.dataset.edit), form = $("#project-form");
      for (const k of ["id","title","description","project_url"]) form.elements[k].value = p[k] || "";
      form.elements.tech_stack.value = (p.tech_stack || []).join(", "); form.elements.featured.checked = p.featured;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $("#admin-projects").querySelectorAll("[data-delete]").forEach(b => b.onclick = async () => {
      if (!confirm("Delete this project?")) return;
      const { error } = await db.from("projects").delete().eq("id", b.dataset.delete);
      if (error) alert("Could not delete project. Confirm your admin role."); else await loadAdmin();
      await loadProjects();
    });
    $("#admin-messages").querySelectorAll("[data-read],[data-archive]").forEach(b => b.onclick = async () => {
      const next = b.hasAttribute("data-read") ? "read" : "archived";
      const { error } = await db.from("contact_messages").update({ status: next }).eq("id", b.dataset.read || b.dataset.archive);
      if (error) alert("Could not update message. Confirm your admin role."); else await loadAdmin();
    });
  }
  $("#project-form").addEventListener("submit", async e => {
    e.preventDefault(); const f = e.currentTarget, fd = new FormData(f);
    const row = { title: fd.get("title").trim(), description: fd.get("description").trim(), tech_stack: fd.get("tech_stack").split(",").map(s => s.trim()).filter(Boolean), project_url: fd.get("project_url").trim() || null, featured: f.elements.featured.checked };
    const id = fd.get("id"); const { error } = id ? await db.from("projects").update(row).eq("id", id) : await db.from("projects").insert(row);
    if (error) alert("Could not save project. Make sure this user has the admin role in Supabase.");
    else { f.reset(); f.elements.id.value = ""; await loadAdmin(); await loadProjects(); }
  });
  $("#cancel-edit").addEventListener("click", () => { $("#project-form").reset(); $("#project-form").elements.id.value = ""; });

  loadProjects(); countVisit(); syncAuth();
})();