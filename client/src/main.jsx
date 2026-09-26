import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

/* =========================================================
   API
========================================================= */

async function apiFetch(path, options = {}) {
  const user = auth.currentUser;

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

function arrayFromResponse(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(date) {
  if (!date) return "-";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "-";
  }

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   COMMON
========================================================= */

function Loading() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;

  return (
    <div className="error-box">
      {message}
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">∅</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function PageHeader({
  title,
  description,
  action,
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err?.message?.replace("Firebase:", "").trim() ||
          "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">N</div>

        <h1>NexusCampus</h1>
        <p className="login-subtitle">Admin Panel</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && <ErrorBox message={error} />}

          <button
            className="btn btn-primary login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   LAYOUT
========================================================= */

function Layout({ children, user }) {
  const navigate = useNavigate();

  async function logout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">N</div>

          <div>
            <div className="brand-name">NexusCampus</div>
            <div className="brand-subtitle">Admin Panel</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">▦</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/clubs"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">♟</span>
            Clubs
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">▣</span>
            Events
          </NavLink>

          <NavLink
            to="/participation"
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <span className="nav-icon">✓</span>
            Participation
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">
            {(user?.email?.[0] || "A").toUpperCase()}
          </div>

          <div className="user-info">
            <strong>Admin</strong>
            <span>{user?.email || "Administrator"}</span>
          </div>

          <button
            className="logout-button"
            onClick={logout}
            title="Logout"
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [eventsRes, clubsRes, registrationsRes] =
        await Promise.all([
          apiFetch("/events"),
          apiFetch("/clubs"),
          apiFetch("/registrations"),
        ]);

      setEvents(
        arrayFromResponse(eventsRes, ["events", "data"])
      );

      setClubs(
        arrayFromResponse(clubsRes, ["clubs", "data"])
      );

      setRegistrations(
        arrayFromResponse(registrationsRes, [
          "registrations",
          "data",
        ])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const publishedEvents = events.filter(
    (event) => event.status === "published"
  ).length;

  const recentEvents = [...events]
    .sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    })
    .slice(0, 5);

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your campus events and registrations."
      />

      <ErrorBox message={error} />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Events</div>
          <div className="stat-icon blue">▣</div>
          <div className="stat-number">{events.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Total Clubs</div>
          <div className="stat-icon purple">♟</div>
          <div className="stat-number">{clubs.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Registrations</div>
          <div className="stat-icon green">♙</div>
          <div className="stat-number">
            {registrations.length}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Published Events</div>
          <div className="stat-icon orange">✓</div>
          <div className="stat-number">
            {publishedEvents}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Events</h2>
              <p>Latest campus events</p>
            </div>

            <Link to="/events" className="text-link">
              View All
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <EmptyState
              title="No events"
              text="Create your first campus event."
            />
          ) : (
            <div className="recent-events">
              {recentEvents.map((event) => {
                const count = registrations.filter(
                  (registration) =>
                    registration.eventId === event.id
                ).length;

                return (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="recent-event"
                  >
                    <div className="recent-event-icon">
                      ▣
                    </div>

                    <div className="recent-event-info">
                      <strong>{event.title}</strong>
                      <span>
                        {formatDate(event.date)}
                      </span>
                      <small>
                        {count} registered
                      </small>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Clubs</h2>
              <p>Active campus clubs</p>
            </div>

            <Link to="/clubs" className="text-link">
              Manage
            </Link>
          </div>

          {clubs.length === 0 ? (
            <EmptyState
              title="No clubs"
              text="Create a club to get started."
            />
          ) : (
            <div className="club-mini-list">
              {clubs.slice(0, 6).map((club) => (
                <div className="club-mini" key={club.id}>
                  <div className="club-avatar">
                    {(club.name?.[0] || "C").toUpperCase()}
                  </div>

                  <div>
                    <strong>{club.name}</strong>
                    <span>
                      {club.email || "No email"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

/* =========================================================
   CLUBS
========================================================= */

function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    president: "",
    email: "",
  });

  async function loadClubs() {
    try {
      setLoading(true);

      const [clubsRes, eventsRes] = await Promise.all([
        apiFetch("/clubs"),
        apiFetch("/events"),
      ]);

      setClubs(
        arrayFromResponse(clubsRes, ["clubs", "data"])
      );

      setEvents(
        arrayFromResponse(eventsRes, ["events", "data"])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClubs();
  }, []);

  async function createClub(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await apiFetch("/clubs", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setForm({
        name: "",
        description: "",
        president: "",
        email: "",
      });

      setShowForm(false);

      await loadClubs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Clubs"
        description="Manage campus clubs and their events."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            + Add Club
          </button>
        }
      />

      <ErrorBox message={error} />

      {showForm && (
        <div className="panel form-panel">
          <div className="panel-header">
            <div>
              <h2>Create Club</h2>
              <p>Add a new campus club.</p>
            </div>
          </div>

          <form onSubmit={createClub}>
            <div className="form-grid">
              <div className="form-group">
                <label>Club Name *</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>President</label>
                <input
                  value={form.president}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      president: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group full">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Club"}
              </button>
            </div>
          </form>
        </div>
      )}

      {clubs.length === 0 ? (
        <EmptyState
          title="No clubs found"
          text="Create a club to start associating events."
        />
      ) : (
        <div className="club-grid">
          {clubs.map((club) => {
            const clubEvents = events.filter(
              (event) => event.clubId === club.id
            );

            return (
              <div className="club-card" key={club.id}>
                <div className="club-card-top">
                  <div className="club-large-avatar">
                    {(club.name?.[0] || "C").toUpperCase()}
                  </div>

                  <div>
                    <h3>{club.name}</h3>
                    <span>
                      {club.email || "No email"}
                    </span>
                  </div>
                </div>

                <p className="club-description">
                  {club.description ||
                    "No description provided."}
                </p>

                <div className="club-meta">
                  <span>
                    President:{" "}
                    <strong>
                      {club.president || "Not assigned"}
                    </strong>
                  </span>

                  <span>
                    Events: <strong>{clubEvents.length}</strong>
                  </span>
                </div>

                {clubEvents.length > 0 && (
                  <div className="club-events">
                    <strong>Associated Events</strong>

                    {clubEvents.map((event) => (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                      >
                        {event.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* =========================================================
   EVENTS
========================================================= */

function Events() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    try {
      setLoading(true);

      const [eventsRes, clubsRes] = await Promise.all([
        apiFetch("/events"),
        apiFetch("/clubs"),
      ]);

      setEvents(
        arrayFromResponse(eventsRes, ["events", "data"])
      );

      setClubs(
        arrayFromResponse(clubsRes, ["clubs", "data"])
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Events"
        description="Create and manage campus events."
        action={
          <Link
            to="/events/new"
            className="btn btn-primary"
          >
            + Create Event
          </Link>
        }
      />

      <ErrorBox message={error} />

      {events.length === 0 ? (
        <EmptyState
          title="No events"
          text="Create your first campus event."
        />
      ) : (
        <div className="event-grid">
          {events.map((event) => {
            const club =
              clubs.find(
                (item) => item.id === event.clubId
              )?.name ||
              event.clubName ||
              "Independent";

            return (
              <Link
                to={`/events/${event.id}`}
                className="event-card"
                key={event.id}
              >
                <div className="event-card-header">
                  <span
                    className={`status-badge ${
                      event.status === "published"
                        ? "published"
                        : "draft"
                    }`}
                  >
                    {event.status || "draft"}
                  </span>
                </div>

                <h3>{event.title}</h3>

                <p>
                  {event.description ||
                    "No description available."}
                </p>

                <div className="event-info">
                  <span>📅 {formatDate(event.date)}</span>
                  <span>◷ {event.time || "-"}</span>
                  <span>⌖ {event.venue || "-"}</span>
                  <span>♟ {club}</span>
                </div>

                <div className="event-card-footer">
                  <span>
                    Capacity: {event.capacity || "-"}
                  </span>

                  <span>View Details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

/* =========================================================
   CREATE EVENT
========================================================= */

function CreateEvent() {
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    capacity: "",
    slug: "",
    status: "published",
    clubId: "",
  });

  useEffect(() => {
    async function loadClubs() {
      try {
        const response = await apiFetch("/clubs");

        setClubs(
          arrayFromResponse(response, [
            "clubs",
            "data",
          ])
        );
      } catch (err) {
        setError(err.message);
      }
    }

    loadClubs();
  }, []);

  function updateField(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const selectedClub = clubs.find(
        (club) => club.id === form.clubId
      );

      const payload = {
        title: form.title,
        description: form.description,
        date: form.date,
        time: form.time,
        venue: form.venue,
        capacity: Number(form.capacity),
        slug:
          form.slug.trim() ||
          slugify(form.title),
        status: form.status,
        clubId: selectedClub?.id || null,
        clubName: selectedClub?.name || "Independent",
      };

      const response = await apiFetch("/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const eventId =
        response?.id ||
        response?.event?.id ||
        response?.data?.id;

      if (eventId) {
        navigate(`/events/${eventId}`);
      } else {
        navigate("/events");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Create Event"
        description="Create a new campus event."
        action={
          <Link
            to="/events"
            className="btn btn-secondary"
          >
            ← Back
          </Link>
        }
      />

      <ErrorBox message={error} />

      <div className="panel form-panel">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group full">
              <label>Event Title *</label>

              <input
                value={form.title}
                onChange={(e) =>
                  updateField(
                    "title",
                    e.target.value
                  )
                }
                placeholder="NexusCampus Hackathon 2026"
                required
              />
            </div>

            <div className="form-group full">
              <label>Description</label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Describe your event..."
              />
            </div>

            <div className="form-group">
              <label>Date *</label>

              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  updateField(
                    "date",
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Time *</label>

              <input
                type="time"
                value={form.time}
                onChange={(e) =>
                  updateField(
                    "time",
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Venue *</label>

              <input
                value={form.venue}
                onChange={(e) =>
                  updateField(
                    "venue",
                    e.target.value
                  )
                }
                placeholder="Main Auditorium"
                required
              />
            </div>

            <div className="form-group">
              <label>Capacity *</label>

              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  updateField(
                    "capacity",
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Club</label>

              <select
                value={form.clubId}
                onChange={(e) =>
                  updateField(
                    "clubId",
                    e.target.value
                  )
                }
              >
                <option value="">
                  Independent
                </option>

                {clubs.map((club) => (
                  <option
                    key={club.id}
                    value={club.id}
                  >
                    {club.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>

              <select
                value={form.status}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value
                  )
                }
              >
                <option value="published">
                  Published
                </option>

                <option value="draft">
                  Draft
                </option>
              </select>
            </div>

            <div className="form-group full">
              <label>Registration Slug</label>

              <input
                value={form.slug}
                onChange={(e) =>
                  updateField(
                    "slug",
                    e.target.value
                  )
                }
                placeholder="Leave blank to generate automatically"
              />

              <small className="field-help">
                This can be used for the public
                registration URL.
              </small>
            </div>
          </div>

          <div className="form-actions">
            <Link
              to="/events"
              className="btn btn-secondary"
            >
              Cancel
            </Link>

            <button
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* =========================================================
   REGISTRATION FORM CARD
========================================================= */

function RegistrationFormCard({ eventId }) {
  const [form, setForm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);
        setError("");

        let result = null;

        /*
          First:
          GET /events/:eventId/form

          This is the preferred route.
        */
        try {
          result = await apiFetch(
            `/events/${eventId}/form`
          );
        } catch {
          /*
            Fallback:
            GET /forms?eventId=...
          */
          const formsResponse = await apiFetch(
            `/forms?eventId=${encodeURIComponent(
              eventId
            )}`
          );

          const forms = arrayFromResponse(
            formsResponse,
            ["forms", "data"]
          );

          result =
            forms.find(
              (item) =>
                item.eventId === eventId
            ) || null;
        }

        const actualForm =
          result?.form ||
          result?.data ||
          result ||
          null;

        if (
          actualForm &&
          actualForm.eventId &&
          actualForm.eventId !== eventId
        ) {
          setForm(null);
        } else {
          setForm(actualForm);
        }
      } catch (err) {
        console.error(
          "Registration form loading error:",
          err
        );

        setError(err.message);
        setForm(null);
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadForm();
    }
  }, [eventId]);

  if (loading) {
    return (
      <div className="registration-form-card">
        <div className="registration-form-main">
          <div className="registration-form-icon">
            📝
          </div>

          <div>
            <h3>Registration Form</h3>
            <p>
              Loading registration form...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="registration-form-card">
        <div className="registration-form-main">
          <div className="registration-form-icon empty">
            📝
          </div>

          <div className="registration-form-content">
            <span className="registration-form-label">
              REGISTRATION FORM
            </span>

            <h3>
              No registration form found
            </h3>

            <p>
              A registration form has not been
              created for this event yet.
            </p>

            {error && (
              <small className="form-load-error">
                {error}
              </small>
            )}
          </div>
        </div>
      </div>
    );
  }

  /*
    IMPORTANT:
    Use the Vercel/public frontend origin,
    not the backend API origin.
  */
  const slug =
    form.slug ||
    form.formSlug ||
    form.registrationSlug;

  const registrationLink = slug
    ? `${window.location.origin}/register/${slug}`
    : null;

  async function copyLink() {
    if (!registrationLink) return;

    try {
      await navigator.clipboard.writeText(
        registrationLink
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(
        "Copy failed:",
        err
      );
    }
  }

  return (
    <div className="registration-form-card">
      <div className="registration-form-main">
        <div className="registration-form-icon">
          📝
        </div>

        <div className="registration-form-content">
          <span className="registration-form-label">
            REGISTRATION FORM
          </span>

          <h3>
            {form.title ||
              "Event Registration Form"}
          </h3>

          {form.description && (
            <p>{form.description}</p>
          )}

          {registrationLink ? (
            <div className="registration-link-box">
              <span>
                {registrationLink}
              </span>
            </div>
          ) : (
            <p className="form-load-error">
              This form does not have a slug.
            </p>
          )}
        </div>
      </div>

      {registrationLink && (
        <div className="registration-form-actions">
          <button
            className="btn btn-secondary"
            onClick={copyLink}
          >
            {copied
              ? "✓ Copied"
              : "Copy Link"}
          </button>

          <a
            href={registrationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open Registration Form ↗
          </a>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   EVENT DETAIL
========================================================= */

function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const eventResponse = await apiFetch(
        `/events/${eventId}`
      );

      let actualEvent =
        eventResponse?.event ||
        eventResponse?.data ||
        eventResponse;

      /*
        Some backends return an array.
      */
      if (Array.isArray(eventResponse)) {
        actualEvent = eventResponse.find(
          (item) => item.id === eventId
        );
      }

      setEvent(actualEvent);

      /*
        IMPORTANT:
        Event details fetches registrations
        specifically for THIS event.
      */
      const registrationsResponse =
        await apiFetch(
          `/registrations?eventId=${encodeURIComponent(
            eventId
          )}`
        );

      const registrationList =
        arrayFromResponse(
          registrationsResponse,
          ["registrations", "data"]
        );

      setRegistrations(registrationList);
    } catch (err) {
      /*
        Fallback for APIs that do not support
        eventId filtering.
      */
      try {
        const allRegistrationsResponse =
          await apiFetch("/registrations");

        const allRegistrations =
          arrayFromResponse(
            allRegistrationsResponse,
            ["registrations", "data"]
          );

        setRegistrations(
          allRegistrations.filter(
            (registration) =>
              registration.eventId === eventId
          )
        );
      } catch {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  if (loading) return <Loading />;

  if (!event) {
    return (
      <EmptyState
        title="Event not found"
        text="The requested event could not be found."
      />
    );
  }

  return (
    <>
      <PageHeader
        title={event.title}
        description={
          event.description ||
          "Campus event details"
        }
        action={
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/events")}
          >
            ← Back
          </button>
        }
      />

      <ErrorBox message={error} />

      <div className="event-detail-card">
        <div className="event-detail-item">
          <span>Date</span>
          <strong>
            {formatDate(event.date)}
          </strong>
        </div>

        <div className="event-detail-item">
          <span>Time</span>
          <strong>
            {event.time || "-"}
          </strong>
        </div>

        <div className="event-detail-item">
          <span>Venue</span>
          <strong>
            {event.venue || "-"}
          </strong>
        </div>

        <div className="event-detail-item">
          <span>Club</span>
          <strong>
            {event.clubName || "Independent"}
          </strong>
        </div>

        <div className="event-detail-item">
          <span>Capacity</span>
          <strong>
            {event.capacity || "-"}
          </strong>
        </div>

        <div className="event-detail-item">
          <span>Registrations</span>
          <strong>
            {registrations.length}
          </strong>
        </div>
      </div>

      {/* REGISTRATION FORM LINK */}
      <RegistrationFormCard
        eventId={eventId}
      />

      <section className="panel registered-panel">
        <div className="panel-header">
          <div>
            <h2>Registered Students</h2>
            <p>
              Students registered for this event.
            </p>
          </div>

          <Link
            to={`/participation?eventId=${eventId}`}
            className="btn btn-primary"
          >
            Manage Attendance
          </Link>
        </div>

        {registrations.length === 0 ? (
          <EmptyState
            title="No registrations"
            text="No students have registered for this event yet."
          />
        ) : (
          <RegistrationTable
            registrations={registrations}
          />
        )}
      </section>
    </>
  );
}

/* =========================================================
   REGISTRATION TABLE
========================================================= */

function getRegistrationValue(
  registration,
  keys
) {
  for (const key of keys) {
    if (
      registration?.[key] !== undefined &&
      registration?.[key] !== null &&
      registration?.[key] !== ""
    ) {
      return registration[key];
    }

    if (
      registration?.data?.[key] !== undefined &&
      registration?.data?.[key] !== null &&
      registration?.data?.[key] !== ""
    ) {
      return registration.data[key];
    }
  }

  return "-";
}

function RegistrationTable({
  registrations,
  attendance = false,
  onPresent,
  onAbsent,
}) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>NAME</th>
            <th>EMAIL</th>
            <th>PHONE</th>
            <th>COLLEGE</th>
            <th>REGISTERED</th>
            {attendance && (
              <th>ATTENDANCE</th>
            )}
          </tr>
        </thead>

        <tbody>
          {registrations.map(
            (registration, index) => {
              const name =
                getRegistrationValue(
                  registration,
                  ["name", "fullName"]
                );

              const email =
                getRegistrationValue(
                  registration,
                  ["email"]
                );

              const phone =
                getRegistrationValue(
                  registration,
                  ["phone", "mobile"]
                );

              const college =
                getRegistrationValue(
                  registration,
                  ["college"]
                );

              const registered =
                registration.submittedAt ||
                registration.createdAt;

              return (
                <tr
                  key={
                    registration.id ||
                    registration.registrationId ||
                    index
                  }
                >
                  <td>{index + 1}</td>

                  <td>
                    <strong>{name}</strong>
                  </td>

                  <td>{email}</td>

                  <td>{phone}</td>

                  <td>{college}</td>

                  <td>
                    {formatDateTime(
                      registered
                    )}
                  </td>

                  {attendance && (
                    <td>
                      <div className="attendance-actions">
                        <button
                          className={`attendance-btn present ${
                            registration.attendanceStatus ===
                            "present"
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            onPresent(
                              registration
                            )
                          }
                        >
                          ✓ Present
                        </button>

                        <button
                          className={`attendance-btn absent ${
                            registration.attendanceStatus ===
                            "absent"
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            onAbsent(
                              registration
                            )
                          }
                        >
                          ✕ Absent
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   PARTICIPATION
========================================================= */

function Participation() {
  const [events, setEvents] = useState([]);

  const [selectedEventId, setSelectedEventId] =
    useState("");

  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const queryEventId =
    new URLSearchParams(window.location.search).get(
      "eventId"
    );

  async function loadEvents() {
    try {
      const response =
        await apiFetch("/events");

      const eventList =
        arrayFromResponse(response, [
          "events",
          "data",
        ]);

      setEvents(eventList);

      if (queryEventId) {
        setSelectedEventId(queryEventId);
      } else if (eventList.length > 0) {
        setSelectedEventId(eventList[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRegistrations(
    eventId
  ) {
    if (!eventId) {
      setRegistrations([]);
      return;
    }

    try {
      setLoadingRegistrations(true);
      setError("");

      /*
        Participation is based on registrations.
        We fetch only registrations belonging
        to the selected event.
      */
      let response;

      try {
        response = await apiFetch(
          `/registrations?eventId=${encodeURIComponent(
            eventId
          )}`
        );
      } catch {
        response =
          await apiFetch("/registrations");
      }

      let registrationList =
        arrayFromResponse(response, [
          "registrations",
          "data",
        ]);

      /*
        Safety filter.
        This prevents registrations from another
        event appearing on the Participation page.
      */
      registrationList =
        registrationList.filter(
          (registration) =>
            registration.eventId === eventId
        );

      /*
        Some backend implementations return
        participation status with registration.
      */
      setRegistrations(
        registrationList.map(
          (registration) => ({
            ...registration,
            attendanceStatus:
              registration.attendanceStatus ||
              registration.status ||
              "pending",
          })
        )
      );
    } catch (err) {
      setError(err.message);
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadRegistrations(
        selectedEventId
      );
    }
  }, [selectedEventId]);

  async function updateAttendance(
    registration,
    status
  ) {
    const registrationId =
      registration.id ||
      registration.registrationId;

    if (!registrationId) {
      setError(
        "Registration ID is missing."
      );
      return;
    }

    if (!selectedEventId) {
      setError(
        "Event ID is missing."
      );
      return;
    }

    try {
      setError("");
      setMessage("");

      /*
        IMPORTANT:
        eventId is explicitly sent here.
      */
      await apiFetch("/participation", {
        method: "POST",
        body: JSON.stringify({
          registrationId,
          eventId: selectedEventId,
          status,
        }),
      });

      setRegistrations(
        (previous) =>
          previous.map((item) => {
            const itemId =
              item.id ||
              item.registrationId;

            if (itemId === registrationId) {
              return {
                ...item,
                attendanceStatus:
                  status,
              };
            }

            return item;
          })
      );

      setMessage(
        `Attendance marked ${status}.`
      );

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedEvent = events.find(
    (event) =>
      event.id === selectedEventId
  );

  const presentCount =
    registrations.filter(
      (item) =>
        item.attendanceStatus ===
        "present"
    ).length;

  const absentCount =
    registrations.filter(
      (item) =>
        item.attendanceStatus ===
        "absent"
    ).length;

  const pendingCount =
    registrations.length -
    presentCount -
    absentCount;

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader
        title="Participation"
        description="Manage event registrations and attendance."
      />

      <ErrorBox message={error} />

      {message && (
        <div className="success-box">
          ✓ {message}
        </div>
      )}

      <div className="participation-toolbar">
        <div className="event-selector">
          <label>Select Event</label>

          <select
            value={selectedEventId}
            onChange={(e) =>
              setSelectedEventId(
                e.target.value
              )
            }
          >
            <option value="">
              Select an event
            </option>

            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.title}
              </option>
            ))}
          </select>
        </div>

        {selectedEvent && (
          <div className="selected-event-info">
            <strong>
              {selectedEvent.title}
            </strong>

            <span>
              {formatDate(
                selectedEvent.date
              )}
            </span>
          </div>
        )}
      </div>

      <div className="attendance-stats">
        <div className="attendance-stat">
          <span>Total Registered</span>
          <strong>
            {registrations.length}
          </strong>
        </div>

        <div className="attendance-stat present-stat">
          <span>Present</span>
          <strong>{presentCount}</strong>
        </div>

        <div className="attendance-stat absent-stat">
          <span>Absent</span>
          <strong>{absentCount}</strong>
        </div>

        <div className="attendance-stat pending-stat">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Registered Students</h2>
            <p>
              Students are fetched directly from
              the registration collection.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() =>
              loadRegistrations(
                selectedEventId
              )
            }
          >
            Refresh
          </button>
        </div>

        {loadingRegistrations ? (
          <Loading />
        ) : registrations.length === 0 ? (
          <EmptyState
            title="No registrations"
            text="No students have registered for this event."
          />
        ) : (
          <RegistrationTable
            registrations={
              registrations
            }
            attendance
            onPresent={(registration) =>
              updateAttendance(
                registration,
                "present"
              )
            }
            onAbsent={(registration) =>
              updateAttendance(
                registration,
                "absent"
              )
            }
          />
        )}
      </section>
    </>
  );
}

/* =========================================================
   PUBLIC REGISTRATION PAGE
========================================================= */

function PublicRegistration() {
  const { slug } = useParams();

  const [form, setForm] = useState(null);
  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [values, setValues] =
    useState({});

  useEffect(() => {
    async function loadForm() {
      try {
        setLoading(true);

        const response =
          await apiFetch("/forms");

        const forms =
          arrayFromResponse(
            response,
            ["forms", "data"]
          );

        const found = forms.find(
          (item) =>
            item.slug === slug ||
            item.formSlug === slug
        );

        if (!found) {
          throw new Error(
            "Registration form not found."
          );
        }

        setForm(found);

        const initialValues = {};

        (found.fields || []).forEach(
          (field) => {
            initialValues[
              field.fieldId
            ] = field.type === "checkbox"
              ? []
              : "";
          }
        );

        setValues(initialValues);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [slug]);

  function updateValue(
    field,
    value
  ) {
    setValues((previous) => ({
      ...previous,
      [field.fieldId]: value,
    }));
  }

  async function submit(e) {
    e.preventDefault();

    if (!form) return;

    try {
      setSubmitting(true);
      setError("");

      await apiFetch("/registrations", {
        method: "POST",
        body: JSON.stringify({
          eventId: form.eventId,
          formId: form.id,
          data: values,

          /*
            These are also included for
            compatibility with the current
            backend/frontend data model.
          */
          name:
            values.name ||
            values.fullName ||
            "",
          email:
            values.email || "",
          phone:
            values.phone || "",
          college:
            values.college || "",
        }),
      });

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="public-page">
        <Loading />
      </div>
    );
  }

  if (success) {
    return (
      <div className="public-page">
        <div className="success-card">
          <div className="success-icon">
            ✓
          </div>

          <h1>Registration Successful</h1>

          <p>
            Your registration has been
            successfully submitted.
          </p>

          <p>
            A confirmation email will be
            sent if email delivery is
            configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      <div className="public-form-card">
        <div className="public-form-header">
          <div className="public-logo">
            N
          </div>

          <h1>{form?.title}</h1>

          {form?.description && (
            <p>{form.description}</p>
          )}
        </div>

        <ErrorBox message={error} />

        <form
          className="public-form"
          onSubmit={submit}
        >
          {(form?.fields || []).map(
            (field) => {
              const type =
                field.type || "text";

              return (
                <div
                  className="form-group"
                  key={field.fieldId}
                >
                  <label>
                    {field.label}

                    {field.required && (
                      <span className="required">
                        *
                      </span>
                    )}
                  </label>

                  {type ===
                    "textarea" && (
                    <textarea
                      value={
                        values[
                          field.fieldId
                        ] || ""
                      }
                      onChange={(e) =>
                        updateValue(
                          field,
                          e.target.value
                        )
                      }
                      required={
                        field.required
                      }
                    />
                  )}

                  {(type ===
                    "text" ||
                    type ===
                      "email" ||
                    type ===
                      "phone" ||
                    type ===
                      "number" ||
                    type ===
                      "date" ||
                    type ===
                      "time") && (
                    <input
                      type={
                        type ===
                        "phone"
                          ? "tel"
                          : type
                      }
                      value={
                        values[
                          field.fieldId
                        ] || ""
                      }
                      onChange={(e) =>
                        updateValue(
                          field,
                          e.target.value
                        )
                      }
                      required={
                        field.required
                      }
                    />
                  )}

                  {(type ===
                    "dropdown" ||
                    type ===
                      "select") && (
                    <select
                      value={
                        values[
                          field.fieldId
                        ] || ""
                      }
                      onChange={(e) =>
                        updateValue(
                          field,
                          e.target.value
                        )
                      }
                      required={
                        field.required
                      }
                    >
                      <option value="">
                        Select an option
                      </option>

                      {(
                        field.options ||
                        []
                      ).map(
                        (option) => (
                          <option
                            key={
                              typeof option ===
                              "string"
                                ? option
                                : option.value
                            }
                            value={
                              typeof option ===
                              "string"
                                ? option
                                : option.value
                            }
                          >
                            {typeof option ===
                            "string"
                              ? option
                              : option.label}
                          </option>
                        )
                      )}
                    </select>
                  )}

                  {type ===
                    "radio" && (
                    <div className="radio-options">
                      {(
                        field.options ||
                        []
                      ).map(
                        (option) => {
                          const value =
                            typeof option ===
                            "string"
                              ? option
                              : option.value;

                          const label =
                            typeof option ===
                            "string"
                              ? option
                              : option.label;

                          return (
                            <label
                              className="choice-option"
                              key={value}
                            >
                              <input
                                type="radio"
                                name={
                                  field.fieldId
                                }
                                value={value}
                                checked={
                                  values[
                                    field
                                      .fieldId
                                  ] ===
                                  value
                                }
                                onChange={() =>
                                  updateValue(
                                    field,
                                    value
                                  )
                                }
                                required={
                                  field.required
                                }
                              />

                              {label}
                            </label>
                          );
                        }
                      )}
                    </div>
                  )}

                  {type ===
                    "checkbox" && (
                    <div className="checkbox-options">
                      {(
                        field.options ||
                        []
                      ).map(
                        (option) => {
                          const value =
                            typeof option ===
                            "string"
                              ? option
                              : option.value;

                          const selected =
                            values[
                              field.fieldId
                            ] || [];

                          return (
                            <label
                              className="choice-option"
                              key={value}
                            >
                              <input
                                type="checkbox"
                                value={value}
                                checked={selected.includes(
                                  value
                                )}
                                onChange={(e) => {
                                  const next =
                                    e.target
                                      .checked
                                      ? [
                                          ...selected,
                                          value,
                                        ]
                                      : selected.filter(
                                          (
                                            item
                                          ) =>
                                            item !==
                                            value
                                        );

                                  updateValue(
                                    field,
                                    next
                                  );
                                }}
                              />

                              {value}
                            </label>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}

          <button
            className="btn btn-primary public-submit"
            disabled={submitting}
          >
            {submitting
              ? "Submitting..."
              : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

function AdminApp({ user }) {
  return (
    <Layout user={user}>
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard />
          }
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard />
          }
        />

        <Route
          path="/clubs"
          element={<Clubs />}
        />

        <Route
          path="/events"
          element={<Events />}
        />

        <Route
          path="/events/new"
          element={<CreateEvent />}
        />

        <Route
          path="/events/:eventId"
          element={<EventDetail />}
        />

        <Route
          path="/participation"
          element={<Participation />}
        />
      </Routes>
    </Layout>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  if (authLoading) {
    return (
      <div className="fullscreen-loading">
        <div className="spinner" />
        <span>Loading NexusCampus...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/register/:slug"
        element={
          <PublicRegistration />
        }
      />

      <Route
        path="/login"
        element={
          user ? (
            <NavigateToDashboard />
          ) : (
            <Login />
          )
        }
      />

      <Route
        path="*"
        element={
          user ? (
            <AdminApp user={user} />
          ) : (
            <Login />
          )
        }
      />
    </Routes>
  );
}

function NavigateToDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard", {
      replace: true,
    });
  }, [navigate]);

  return <Loading />;
}

/* =========================================================
   ROOT
========================================================= */

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);