import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useParams,
  Link
} from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { auth } from "./firebase";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

async function api(path, options = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (current) => { setUser(current); setLoading(false); }), []);
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

const AuthContext = React.createContext({ user: null, loading: true });
function useAuth() { return React.useContext(AuthContext); }

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading NexusCampus...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">N</div>
          <div><h2>NexusCampus</h2><span>Admin Panel</span></div>
        </div>
        <nav className="sidebar-nav">
          <NavLink className="nav-item" to="/"><span>▦</span>Dashboard</NavLink>
          <NavLink className="nav-item" to="/clubs"><span>♟</span>Clubs</NavLink>
          <NavLink className="nav-item" to="/events"><span>◫</span>Events</NavLink>
          <NavLink className="nav-item" to="/participation"><span>✓</span>Participation</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-user">{user?.email}</div>
          <button className="logout-button" onClick={async () => { await signOut(auth); navigate("/login"); }}>Sign out</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (mode === "login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err) { setError(err.message.replace("Firebase: ", "")); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><div className="logo-mark">N</div><div><h1>NexusCampus</h1><p>Campus Event Management</p></div></div>
        <h2>{mode === "login" ? "Admin Login" : "Create Admin Account"}</h2>
        <p className="muted">Use the Firebase Email/Password account configured for your admin.</p>
        <form onSubmit={submit} className="stack-form">
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-button full" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="link-button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Create a new account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/analytics").then(setData).catch(e => setError(e.message)); }, []);
  return <>
    <PageHeader title="Dashboard" subtitle="Overview of your campus events and participation." />
    {error && <div className="error-box">{error}</div>}
    <div className="stats-grid">
      <Stat title="Total Events" value={data?.totals.events ?? "—"} />
      <Stat title="Registrations" value={data?.totals.registrations ?? "—"} />
      <Stat title="Clubs" value={data?.totals.clubs ?? "—"} />
      <Stat title="Participation" value={data?.totals.participation ?? "—"} />
    </div>
    <div className="dashboard-grid">
      <section className="section-card">
        <div className="section-header"><div><h2>Registrations by Event</h2><p>Current registration count against capacity.</p></div></div>
        <SimpleBars rows={data?.byEvent || []} />
      </section>
      <section className="section-card">
        <div className="section-header"><div><h2>Upcoming Events</h2><p>Your next scheduled events.</p></div><Link className="secondary-button" to="/events">View all</Link></div>
        {data?.upcoming?.length ? <div className="upcoming-list">{data.upcoming.map(e => <div className="upcoming-item" key={e.id}><div><strong>{e.title}</strong><span>{e.date} · {e.venue || "Venue TBA"}</span></div><Status value={e.status} /></div>)}</div> : <Empty text="No upcoming events." />}
      </section>
    </div>
  </>;
}

function Stat({ title, value }) { return <div className="stat-card"><span>{title}</span><strong>{value}</strong></div>; }
function Status({ value }) { return <span className={`status ${String(value).toLowerCase()}`}>{value}</span>; }
function Empty({ text }) { return <div className="empty-state">{text}</div>; }
function PageHeader({ title, subtitle, action }) { return <div className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; }
function SimpleBars({ rows }) {
  if (!rows.length) return <Empty text="No event data yet." />;
  const max = Math.max(...rows.map(x => x.registrations), 1);
  return <div className="bar-list">{rows.map(row => <div className="bar-row" key={row.id}><div className="bar-label"><span title={row.name}>{row.name}</span><strong>{row.registrations}{row.capacity ? ` / ${row.capacity}` : ""}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min((row.registrations / max) * 100, 100)}%` }} /></div></div>)}</div>;
}

function Events() {
  const [events, setEvents] = useState([]); const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  async function load() { try { setEvents((await api("/events")).events); } catch (e) { alert(e.message); } }
  useEffect(() => { load(); }, []);
  async function remove(id) { if (!confirm("Delete this event?")) return; setBusy(true); try { await api(`/events/${id}`, { method: "DELETE" }); await load(); } catch (e) { alert(e.message); } finally { setBusy(false); } }
  const filtered = events.filter(e => (e.title + " " + e.venue).toLowerCase().includes(query.toLowerCase()) && (status === "all" || e.status === status));
  return <>
    <PageHeader title="Events" subtitle="Create and manage campus events." action={<Link className="primary-button" to="/events/create">+ Create Event</Link>} />
    <section className="section-card">
      <div className="toolbar"><input className="search-input" placeholder="Search events..." value={query} onChange={e => setQuery(e.target.value)} /><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
      <div className="table-wrapper"><table><thead><tr><th>Event</th><th>Date</th><th>Time</th><th>Venue</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(e => <tr key={e.id}><td><strong>{e.title}</strong><small>{e.description}</small></td><td>{e.date}</td><td>{e.time || "—"}</td><td>{e.venue || "—"}</td><td>{e.capacity || "—"}</td><td><Status value={e.status} /></td><td><div className="action-buttons"><button className="secondary-button" onClick={() => navigate(`/events/${e.id}`)}>View</button><button className="secondary-button" onClick={() => navigate(`/events/${e.id}/edit`)}>Edit</button><button className="danger-button" disabled={busy} onClick={() => remove(e.id)}>Delete</button></div></td></tr>)}</tbody></table></div>
      {!filtered.length && <Empty text="No events match your filters." />}
    </section>
  </>;
}

const initialEvent = { title: "", description: "", date: "", time: "", venue: "", capacity: 100, slug: "", status: "draft" };
function EventForm({ edit = false }) {
  const { id } = useParams(); const navigate = useNavigate(); const [form, setForm] = useState(initialEvent); const [busy, setBusy] = useState(false);
  useEffect(() => { if (edit) api(`/events/${id}`).then(d => setForm(d.event)).catch(e => alert(e.message)); }, [edit, id]);
  function change(e) { const { name, value } = e.target; setForm(f => ({ ...f, [name]: name === "capacity" ? Number(value) : value, ...(name === "title" && !edit ? { slug: value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}) })); }
  async function submit(e) { e.preventDefault(); setBusy(true); try { await api(edit ? `/events/${id}` : "/events", { method: edit ? "PUT" : "POST", body: JSON.stringify(form) }); navigate(edit ? `/events/${id}` : "/events"); } catch (err) { alert(err.message); } finally { setBusy(false); } }
  return <><PageHeader title={edit ? "Edit Event" : "Create Event"} subtitle={edit ? "Update event information." : "Create a new campus event."} />
    <form className="form-card" onSubmit={submit}><div className="form-grid"><Field label="Event Title"><input name="title" value={form.title || ""} onChange={change} required /></Field><Field label="Date"><input type="date" name="date" value={form.date || ""} onChange={change} required /></Field><Field label="Time"><input type="time" name="time" value={form.time || ""} onChange={change} /></Field><Field label="Venue"><input name="venue" value={form.venue || ""} onChange={change} /></Field><Field label="Capacity"><input type="number" min="0" name="capacity" value={form.capacity ?? 0} onChange={change} /></Field><Field label="Status"><select name="status" value={form.status || "draft"} onChange={change}><option value="draft">Draft</option><option value="published">Published</option></select></Field><Field label="Public Slug"><input name="slug" value={form.slug || ""} onChange={change} required /></Field><Field label="Description" full><textarea name="description" value={form.description || ""} onChange={change} /></Field></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => navigate(-1)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving..." : edit ? "Save Changes" : "Create Event"}</button></div></form></>;
}
function Field({ label, children, full }) { return <div className={`form-group ${full ? "full-width" : ""}`}><label>{label}</label>{children}</div>; }

function EventDetails() {
  const { id } = useParams(); const [event, setEvent] = useState(null); const [form, setForm] = useState(null); const navigate = useNavigate();
  async function load() { try { const [e, f] = await Promise.all([api(`/events/${id}`), api(`/events/${id}/form`)]); setEvent(e.event); setForm(f.form); } catch (e) { alert(e.message); } }
  useEffect(() => { load(); }, [id]);
  if (!event) return <div className="loading">Loading event...</div>;
  return <><button className="back-button" onClick={() => navigate("/events")}>← Back to Events</button><div className="page-header"><div><h1>{event.title}</h1><p>{event.description || "No description provided."}</p></div><button className="secondary-button" onClick={() => navigate(`/events/${id}/edit`)}>Edit Event</button></div>
    <div className="details-grid"><section className="details-card"><h2>Event Details</h2><Detail label="Date" value={event.date} /><Detail label="Time" value={event.time || "—"} /><Detail label="Venue" value={event.venue || "—"} /><Detail label="Capacity" value={event.capacity || "Unlimited"} /><Detail label="Status" value={<Status value={event.status} />} /></section>
      <section className="details-card"><h2>Registration Form</h2>{form ? <><div className="form-preview"><h3>{form.title}</h3><p>{form.description}</p><span className="field-count">{form.fields?.length || 0} fields</span></div><div className="detail-actions"><button className="primary-button" onClick={() => navigate(`/events/${id}/form`)}>Edit Registration Form</button><a className="secondary-button" href={`/register/${form.slug}`} target="_blank" rel="noreferrer">Open Public Form</a></div></> : <><Empty text="This event does not have a registration form yet." /><button className="primary-button" onClick={() => navigate(`/events/${id}/form`)}>Create Registration Form</button></>}</section></div>
    <section className="section-card registrations-preview"><div className="section-header"><div><h2>Registrations</h2><p>People registered for this event.</p></div><button className="secondary-button" onClick={() => navigate(`/registrations?eventId=${id}`)}>View Registrations</button></div></section>
  </>;
}
function Detail({ label, value }) { return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>; }

const blankField = () => ({ fieldId: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: "", type: "text", required: false, options: [] });
function FormBuilder() {
  const { id } = useParams(); const navigate = useNavigate(); const [event, setEvent] = useState(null); const [form, setForm] = useState({ title: "", description: "", slug: "", fields: [] }); const [busy, setBusy] = useState(false);
  useEffect(() => { Promise.all([api(`/events/${id}`), api(`/events/${id}/form`)]).then(([e, f]) => { setEvent(e.event); if (f.form) setForm(f.form); else setForm(x => ({ ...x, title: `${e.event.title} Registration Form`, description: `Register for ${e.event.title}`, slug: `${e.event.slug}-registration`, fields: [blankField()] })); }).catch(e => alert(e.message)); }, [id]);
  function updateField(index, patch) { setForm(f => ({ ...f, fields: f.fields.map((x, i) => i === index ? { ...x, ...patch } : x) })); }
  function addField() { setForm(f => ({ ...f, fields: [...f.fields, blankField()] })); }
  function removeField(index) { setForm(f => ({ ...f, fields: f.fields.filter((_, i) => i !== index) })); }
  function addOption(index) { updateField(index, { options: [...(form.fields[index].options || []), `Option ${(form.fields[index].options || []).length + 1}`] }); }
  function updateOption(index, optionIndex, value) { const options = [...(form.fields[index].options || [])]; options[optionIndex] = value; updateField(index, { options }); }
  function removeOption(index, optionIndex) { updateField(index, { options: (form.fields[index].options || []).filter((_, i) => i !== optionIndex) }); }
  async function save(e) { e.preventDefault(); setBusy(true); try { const method = form.id ? "PUT" : "POST"; const path = form.id ? `/forms/${form.id}` : "/forms"; const saved = await api(path, { method, body: JSON.stringify({ ...form, eventId: id }) }); setForm(saved.form); alert("Registration form saved."); } catch (err) { alert(err.message); } finally { setBusy(false); } }
  if (!event) return <div className="loading">Loading form builder...</div>;
  return <><button className="back-button" onClick={() => navigate(`/events/${id}`)}>← Back to Event</button><PageHeader title="Registration Form Builder" subtitle={`Build the registration form for ${event.title}.`} />
    <form onSubmit={save} className="form-card"><div className="form-grid"><Field label="Form Title"><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></Field><Field label="Public Slug"><input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required /></Field><Field label="Description" full><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field></div>
      <div className="builder-heading"><div><h2>Fields</h2><p>Add the information participants must provide.</p></div><button type="button" className="secondary-button" onClick={addField}>+ Add Field</button></div>
      <div className="builder-fields">{form.fields.map((field, index) => <div className="builder-field" key={field.fieldId}><div className="builder-field-header"><div><span className="field-number">{index + 1}</span><strong>Field {index + 1}</strong></div><button type="button" className="danger-button" onClick={() => removeField(index)}>Remove</button></div><div className="form-grid"><Field label="Field Label"><input value={field.label} onChange={e => updateField(index, { label: e.target.value })} placeholder="e.g. Full Name" required /></Field><Field label="Field Type"><select value={field.type} onChange={e => updateField(index, { type: e.target.value, options: ["dropdown", "radio", "checkbox"].includes(e.target.value) ? field.options?.length ? field.options : ["Option 1"] : [] })}><option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option><option value="number">Number</option><option value="date">Date</option><option value="time">Time</option><option value="textarea">Textarea</option><option value="dropdown">Dropdown</option><option value="radio">Radio</option><option value="checkbox">Checkbox</option></select></Field></div><label className="checkbox-row"><input type="checkbox" checked={!!field.required} onChange={e => updateField(index, { required: e.target.checked })} /> Required field</label>{["dropdown", "radio", "checkbox"].includes(field.type) && <div className="options-section"><div className="options-header"><strong>Options</strong><button type="button" className="secondary-button" onClick={() => addOption(index)}>+ Add Option</button></div>{(field.options || []).map((option, oi) => <div className="option-row" key={oi}><input value={option} onChange={e => updateOption(index, oi, e.target.value)} /><button type="button" className="danger-button" onClick={() => removeOption(index, oi)}>×</button></div>)}</div>}</div>)}</div>
      {!form.fields.length && <div className="empty-builder"><div className="empty-builder-icon">+</div><h3>No fields yet</h3><p>Add your first registration field.</p><button type="button" className="primary-button" onClick={addField}>Add First Field</button></div>}
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => navigate(`/events/${id}`)}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving..." : "Save Registration Form"}</button></div>
    </form></>;
}

function PublicRegistration() {
  const { slug } = useParams(); const [data, setData] = useState(null); const [values, setValues] = useState({}); const [busy, setBusy] = useState(false); const [result, setResult] = useState(null); const [error, setError] = useState("");
  useEffect(() => { fetch(`${API}/forms/by-slug/${encodeURIComponent(slug)}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message); return d; }).then(setData).catch(e => setError(e.message)); }, [slug]);
  function setValue(id, value) { setValues(v => ({ ...v, [id]: value })); }
  async function submit(e) { e.preventDefault(); setBusy(true); setError(""); try { const form = data.form; const emailField = form.fields.find(f => f.type === "email"); const nameField = form.fields.find(f => f.fieldId === "name") || form.fields.find(f => /name/i.test(f.label)); const response = await fetch(`${API}/registrations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: data.event.id, formId: form.id, email: values[emailField?.fieldId] || "", name: values[nameField?.fieldId] || "", data: values }) }); const d = await response.json(); if (!response.ok) throw new Error(d.message); setResult(d); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  if (error) return <PublicShell><div className="public-card"><div className="error-box">{error}</div></div></PublicShell>;
  if (!data) return <div className="loading-screen">Loading registration form...</div>;
  if (result) return <PublicShell><div className="success-card"><div className="success-icon">✓</div><h1>Registration Successful</h1><p>You are registered for <strong>{data.event.title}</strong>.</p><p className="muted">Registration ID: {result.registrationId}</p>{result.emailStatus === "sent" && <p>We also sent a confirmation email.</p>}<Link className="primary-button" to={`/register/${slug}`}>Back to Form</Link></div></PublicShell>;
  return <PublicShell><div className="public-card"><div className="public-event"><span className="public-kicker">NexusCampus Event</span><h1>{data.event.title}</h1><p>{data.event.description}</p><div className="public-meta"><span>📅 {data.event.date}</span><span>🕐 {data.event.time || "TBA"}</span><span>📍 {data.event.venue || "TBA"}</span></div></div><form onSubmit={submit} className="public-form"><h2>{data.form.title}</h2><p>{data.form.description}</p>{data.form.fields.map(field => <DynamicField key={field.fieldId} field={field} value={values[field.fieldId]} onChange={value => setValue(field.fieldId, value)} />)}{error && <div className="error-box">{error}</div>}<button className="primary-button full" disabled={busy}>{busy ? "Submitting..." : "Register"}</button></form></div></PublicShell>;
}
function DynamicField({ field, value, onChange }) {
  const label = <label>{field.label}{field.required && <span className="required-mark"> *</span>}</label>;
  if (field.type === "textarea") return <div className="public-field">{label}<textarea value={value || ""} required={field.required} onChange={e => onChange(e.target.value)} /></div>;
  if (field.type === "dropdown") return <div className="public-field">{label}<select value={value || ""} required={field.required} onChange={e => onChange(e.target.value)}><option value="">Select an option</option>{(field.options || []).map(o => <option key={o}>{o}</option>)}</select></div>;
  if (field.type === "radio") return <div className="public-field">{label}<div className="choice-list">{(field.options || []).map(o => <label key={o}><input type="radio" name={field.fieldId} value={o} checked={value === o} required={field.required && !value} onChange={e => onChange(e.target.value)} />{o}</label>)}</div></div>;
  if (field.type === "checkbox") return <div className="public-field">{label}<div className="choice-list">{(field.options || []).map(o => { const arr = Array.isArray(value) ? value : []; return <label key={o}><input type="checkbox" checked={arr.includes(o)} onChange={e => onChange(e.target.checked ? [...arr, o] : arr.filter(x => x !== o))} />{o}</label>; })}</div></div>;
  return <div className="public-field">{label}<input type={field.type === "phone" ? "tel" : field.type} value={value || ""} required={field.required} onChange={e => onChange(e.target.value)} /></div>;
}
function PublicShell({ children }) { return <div className="public-page"><div className="public-topbar"><div className="public-logo"><span>N</span>NexusCampus</div><span>Campus Event Registration</span></div>{children}<div className="public-footer">NexusCampus</div></div>; }

function Registrations() {
  const params = new URLSearchParams(location.search); const eventId = params.get("eventId"); const [rows, setRows] = useState([]); const [events, setEvents] = useState([]); const [filter, setFilter] = useState(eventId || ""); const [query, setQuery] = useState("");
  async function load() { try { setRows((await api(`/registrations${filter ? `?eventId=${filter}` : ""}`)).registrations); setEvents((await api("/events")).events); } catch (e) { alert(e.message); } }
  useEffect(() => { load(); }, [filter]);
  const filtered = rows.filter(r => `${r.name} ${r.email} ${r.data?.college || ""}`.toLowerCase().includes(query.toLowerCase()));
  function csv() { const header = ["Name", "Email", "Event", "Submitted At", "Email Status"]; const lines = filtered.map(r => [r.name, r.email, events.find(e => e.id === r.eventId)?.title || r.eventId, formatDate(r.submittedAt), r.emailStatus]); const content = [header, ...lines].map(row => row.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([content], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "nexuscampus-registrations.csv"; a.click(); URL.revokeObjectURL(a.href); }
  return <><PageHeader title="Registrations" subtitle="View and export participant registrations." action={<button className="secondary-button" onClick={csv}>Export CSV</button>} /><section className="section-card"><div className="toolbar"><input className="search-input" placeholder="Search name, email, college..." value={query} onChange={e => setQuery(e.target.value)} /><select value={filter} onChange={e => setFilter(e.target.value)}><option value="">All events</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></div><div className="table-wrapper"><table><thead><tr><th>Name</th><th>Email</th><th>Event</th><th>Registered</th><th>Email</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td><strong>{r.name || "—"}</strong><small>{r.data?.college || ""}</small></td><td>{r.email}</td><td>{events.find(e => e.id === r.eventId)?.title || r.eventId}</td><td>{formatDate(r.submittedAt)}</td><td><Status value={r.emailStatus || "pending"} /></td></tr>)}</tbody></table></div>{!filtered.length && <Empty text="No registrations found." />}</section></>;
}
function formatDate(value) { if (!value) return "—"; if (value.seconds) return new Date(value.seconds * 1000).toLocaleString(); return new Date(value).toLocaleString(); }

function Clubs() {
  const [clubs, setClubs] = useState([]); const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null); const blank = { name: "", description: "", category: "", coordinator: "", contact: "" }; const [form, setForm] = useState(blank);
  async function load() { try { setClubs((await api("/clubs")).clubs); } catch (e) { alert(e.message); } }
  useEffect(() => { load(); }, []);
  function start(c = null) { setEditing(c); setForm(c || blank); setOpen(true); }
  async function save(e) { e.preventDefault(); try { await api(editing ? `/clubs/${editing.id}` : "/clubs", { method: editing ? "PUT" : "POST", body: JSON.stringify(form) }); setOpen(false); await load(); } catch (e) { alert(e.message); } }
  async function remove(id) { if (!confirm("Delete this club?")) return; try { await api(`/clubs/${id}`, { method: "DELETE" }); await load(); } catch (e) { alert(e.message); } }
  return <><PageHeader title="Clubs" subtitle="Manage campus clubs and student communities." action={<button className="primary-button" onClick={() => start()}>+ Add Club</button>} /><section className="club-grid">{clubs.map(c => <article className="club-card" key={c.id}><div className="club-icon">{c.name.slice(0, 1).toUpperCase()}</div><div className="club-card-body"><h3>{c.name}</h3><span>{c.category || "General"}</span><p>{c.description || "No description."}</p><small>Coordinator: {c.coordinator || "—"}</small></div><div className="card-actions"><button className="secondary-button" onClick={() => start(c)}>Edit</button><button className="danger-button" onClick={() => remove(c.id)}>Delete</button></div></article>)}{!clubs.length && <section className="section-card"><Empty text="No clubs yet. Create the first club." /></section>}</section>{open && <div className="modal-backdrop"><form className="modal-card" onSubmit={save}><div className="section-header"><div><h2>{editing ? "Edit Club" : "Add Club"}</h2><p>Enter club information.</p></div><button type="button" className="icon-button" onClick={() => setOpen(false)}>×</button></div><div className="form-grid"><Field label="Club Name"><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></Field><Field label="Category"><input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></Field><Field label="Coordinator"><input value={form.coordinator} onChange={e => setForm(f => ({ ...f, coordinator: e.target.value }))} /></Field><Field label="Contact"><input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></Field><Field label="Description" full><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button">Save Club</button></div></form></div>}</>;
}

function Participation() {
  const [rows, setRows] = useState([]); const [events, setEvents] = useState([]); const [open, setOpen] = useState(false); const [form, setForm] = useState({ studentName: "", email: "", eventId: "", clubId: "", status: "registered", points: 0 });
  async function load() { try { const [p, e] = await Promise.all([api("/participation"), api("/events")]); setRows(p.participation); setEvents(e.events); } catch (e) { alert(e.message); } }
  useEffect(() => { load(); }, []);
  async function save(e) { e.preventDefault(); try { await api("/participation", { method: "POST", body: JSON.stringify(form) }); setOpen(false); setForm({ studentName: "", email: "", eventId: "", clubId: "", status: "registered", points: 0 }); await load(); } catch (e) { alert(e.message); } }
  return <><PageHeader title="Participation" subtitle="Track attendance, participation status and activity points." action={<button className="primary-button" onClick={() => setOpen(true)}>+ Add Record</button>} /><section className="section-card"><div className="table-wrapper"><table><thead><tr><th>Student</th><th>Email</th><th>Event</th><th>Status</th><th>Points</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><strong>{r.studentName}</strong></td><td>{r.email}</td><td>{events.find(e => e.id === r.eventId)?.title || r.eventId}</td><td><Status value={r.status} /></td><td>{r.points || 0}</td></tr>)}</tbody></table></div>{!rows.length && <Empty text="No participation records yet." />}</section>{open && <div className="modal-backdrop"><form className="modal-card" onSubmit={save}><div className="section-header"><div><h2>Add Participation</h2><p>Create a participation record.</p></div><button type="button" className="icon-button" onClick={() => setOpen(false)}>×</button></div><div className="form-grid"><Field label="Student Name"><input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} required /></Field><Field label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></Field><Field label="Event"><select value={form.eventId} onChange={e => setForm(f => ({ ...f, eventId: e.target.value }))} required><option value="">Select event</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></Field><Field label="Status"><select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option>registered</option><option>attended</option><option>absent</option></select></Field><Field label="Points"><input type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))} /></Field></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button">Save Record</button></div></form></div>}</>;
}

function App() {
  return <AuthProvider><Routes><Route path="/login" element={<Login />} /><Route path="/register/:slug" element={<PublicRegistration />} /><Route path="/*" element={<ProtectedRoute><Layout><Routes><Route index element={<Dashboard />} /><Route path="clubs" element={<Clubs />} /><Route path="events" element={<Events />} /><Route path="events/create" element={<EventForm />} /><Route path="events/:id" element={<EventDetails />} /><Route path="events/:id/edit" element={<EventForm edit />} /><Route path="events/:id/form" element={<FormBuilder />} /><Route path="registrations" element={<Registrations />} /><Route path="participation" element={<Participation />} /></Routes></Layout></ProtectedRoute>} /></Routes></AuthProvider>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<BrowserRouter><App /></BrowserRouter>);

