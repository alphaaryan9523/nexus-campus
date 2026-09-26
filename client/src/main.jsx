import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createRoot } from "react-dom/client";

import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

import {
  initializeApp,
} from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import "./App.css";

/* =========================================================
   FIREBASE
========================================================= */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

/* =========================================================
   API
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

async function apiFetch(endpoint, options = {}) {
  const user = auth.currentUser;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (user) {
    try {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error("Token error:", error);
    }
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text,
    };
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
}

/* =========================================================
   HELPERS
========================================================= */

function getArray(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function getRegistrationId(registration) {
  return (
    registration.registrationId ||
    registration.id ||
    registration._id
  );
}

function getEventId(registration) {
  return (
    registration.eventId ||
    registration.event?.id ||
    registration.event?.eventId
  );
}

function getStudentValue(
  registration,
  key
) {
  return (
    registration[key] ??
    registration.data?.[key] ??
    registration.formData?.[key] ??
    "-"
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    let date;

    if (
      typeof value === "object" &&
      value?.seconds
    ) {
      date = new Date(
        value.seconds * 1000
      );
    } else if (
      typeof value === "object" &&
      value?._seconds
    ) {
      date = new Date(
        value._seconds * 1000
      );
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "-";
  }
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  try {
    let date;

    if (
      typeof value === "object" &&
      value?.seconds
    ) {
      date = new Date(
        value.seconds * 1000
      );
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "-";
  }
}

function createSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      setError(
        err.code ===
          "auth/invalid-credential"
          ? "Invalid email or password."
          : err.message ||
              "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          N
        </div>

        <h1>NexusCampus</h1>

        <p className="login-subtitle">
          Admin Panel
        </p>

        <form
          onSubmit={handleLogin}
          className="login-form"
        >
          <label>
            Email
          </label>

          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <label>
            Password
          </label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary-button full-width"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   LAYOUT
========================================================= */

function Layout({
  children,
  user,
}) {
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="app-layout">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-icon">
            N
          </div>

          <div>
            <div className="brand-name">
              NexusCampus
            </div>

            <div className="brand-subtitle">
              Admin Panel
            </div>
          </div>

        </div>

        <nav className="sidebar-nav">

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <span>▦</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/clubs"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <span>♟</span>
            Clubs
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <span>◫</span>
            Events
          </NavLink>

          <NavLink
            to="/participation"
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <span>✓</span>
            Participation
          </NavLink>

        </nav>

        <div className="sidebar-user">

          <div className="user-avatar">
            {user?.email
              ? user.email
                  .charAt(0)
                  .toUpperCase()
              : "A"}
          </div>

          <div className="user-info">
            <strong>
              Admin
            </strong>

            <span>
              {user?.email || ""}
            </span>
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
  const [events, setEvents] =
    useState([]);

  const [clubs, setClubs] =
    useState([]);

  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadData = async () => {
    setLoading(true);

    try {
      const [
        eventsResponse,
        clubsResponse,
        registrationsResponse,
      ] = await Promise.all([
        apiFetch("/events"),
        apiFetch("/clubs"),
        apiFetch("/registrations"),
      ]);

      setEvents(
        getArray(eventsResponse, [
          "events",
        ])
      );

      setClubs(
        getArray(clubsResponse, [
          "clubs",
        ])
      );

      setRegistrations(
        getArray(
          registrationsResponse,
          ["registrations"]
        )
      );
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const registrationsByEvent =
    useMemo(() => {
      const result = {};

      registrations.forEach(
        (registration) => {
          const eventId =
            getEventId(registration);

          if (!eventId) return;

          result[eventId] =
            (result[eventId] || 0) + 1;
        }
      );

      return result;
    }, [registrations]);

  return (
    <div className="page">

      <PageHeader
        title="Dashboard"
        subtitle="Overview of your campus events and registrations."
      />

      <div className="stats-grid">

        <StatCard
          title="Total Events"
          value={events.length}
          icon="◫"
        />

        <StatCard
          title="Total Clubs"
          value={clubs.length}
          icon="♟"
        />

        <StatCard
          title="Registrations"
          value={registrations.length}
          icon="♙"
        />

        <StatCard
          title="Published Events"
          value={
            events.filter(
              (event) =>
                event.status ===
                "published"
            ).length
          }
          icon="✓"
        />

      </div>

      <div className="dashboard-grid">

        <div className="content-card">

          <div className="content-card-header">

            <div>
              <h2>
                Recent Events
              </h2>

              <p>
                Latest campus events
              </p>
            </div>

            <Link
              to="/events"
              className="secondary-button"
            >
              View All
            </Link>

          </div>

          {loading ? (
            <div className="empty-state">
              Loading...
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              No events created yet.
            </div>
          ) : (
            <div className="simple-list">

              {events
                .slice(0, 5)
                .map((event) => (
                  <div
                    className="list-row"
                    key={event.id}
                  >

                    <div className="list-icon">
                      ◫
                    </div>

                    <div className="list-main">

                      <strong>
                        {event.title}
                      </strong>

                      <span>
                        {event.date
                          ? formatDate(
                              event.date
                            )
                          : "No date"}
                      </span>

                    </div>

                    <div className="list-count">
                      {registrationsByEvent[
                        event.id
                      ] || 0}{" "}
                      registered
                    </div>

                  </div>
                ))}

            </div>
          )}

        </div>

        <div className="content-card">

          <div className="content-card-header">

            <div>
              <h2>
                Clubs
              </h2>

              <p>
                Active campus clubs
              </p>
            </div>

            <Link
              to="/clubs"
              className="secondary-button"
            >
              Manage
            </Link>

          </div>

          {clubs.length === 0 ? (
            <div className="empty-state">
              No clubs created yet.
            </div>
          ) : (
            <div className="simple-list">

              {clubs
                .slice(0, 5)
                .map((club) => (
                  <div
                    className="list-row"
                    key={club.id}
                  >

                    <div className="club-avatar">
                      {club.name
                        ?.charAt(0)
                        ?.toUpperCase() ||
                        "C"}
                    </div>

                    <div className="list-main">

                      <strong>
                        {club.name}
                      </strong>

                      <span>
                        {club.email ||
                          "No email"}
                      </span>

                    </div>

                  </div>
                ))}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  icon,
}) {
  return (
    <div className="stat-card">

      <div className="stat-top">

        <span>
          {title}
        </span>

        <div className="stat-icon">
          {icon}
        </div>

      </div>

      <strong>
        {value}
      </strong>

    </div>
  );
}

/* =========================================================
   PAGE HEADER
========================================================= */

function PageHeader({
  title,
  subtitle,
  action,
}) {
  return (
    <div className="page-header">

      <div>
        <h1>
          {title}
        </h1>

        <p>
          {subtitle}
        </p>
      </div>

      {action && action}

    </div>
  );
}

/* =========================================================
   CLUBS
========================================================= */

function Clubs() {
  const [clubs, setClubs] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editingClub, setEditingClub] =
    useState(null);

  const loadClubs = async () => {
    try {
      setLoading(true);

      const response =
        await apiFetch("/clubs");

      setClubs(
        getArray(response, ["clubs"])
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const deleteClub = async (club) => {
    const confirmed =
      window.confirm(
        `Delete ${club.name}?`
      );

    if (!confirmed) return;

    try {
      await apiFetch(
        `/clubs/${club.id}`,
        {
          method: "DELETE",
        }
      );

      loadClubs();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="page">

      <PageHeader
        title="Clubs"
        subtitle="Manage campus clubs and their events."
        action={
          <button
            className="primary-button"
            onClick={() => {
              setEditingClub(null);
              setShowForm(true);
            }}
          >
            + Add Club
          </button>
        }
      />

      {showForm && (
        <ClubForm
          club={editingClub}
          onClose={() =>
            setShowForm(false)
          }
          onSaved={() => {
            setShowForm(false);
            loadClubs();
          }}
        />
      )}

      {loading ? (
        <div className="loading-box">
          Loading clubs...
        </div>
      ) : clubs.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">
            ♟
          </div>

          <h2>
            No clubs yet
          </h2>

          <p>
            Create your first campus club.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              setShowForm(true)
            }
          >
            Create Club
          </button>
        </div>
      ) : (
        <div className="club-grid">

          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              onEdit={() => {
                setEditingClub(club);
                setShowForm(true);
              }}
              onDelete={() =>
                deleteClub(club)
              }
            />
          ))}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   CLUB FORM
========================================================= */

function ClubForm({
  club,
  onClose,
  onSaved,
}) {
  const [name, setName] =
    useState(club?.name || "");

  const [description, setDescription] =
    useState(
      club?.description || ""
    );

  const [president, setPresident] =
    useState(
      club?.president || ""
    );

  const [email, setEmail] =
    useState(club?.email || "");

  const [loading, setLoading] =
    useState(false);

  const submit = async (event) => {
    event.preventDefault();

    setLoading(true);

    try {
      const payload = {
        name,
        description,
        president,
        email,
      };

      if (club?.id) {
        await apiFetch(
          `/clubs/${club.id}`,
          {
            method: "PUT",
            body: JSON.stringify(
              payload
            ),
          }
        );
      } else {
        await apiFetch("/clubs", {
          method: "POST",
          body: JSON.stringify(
            payload
          ),
        });
      }

      onSaved();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">

      <div className="modal">

        <div className="modal-header">

          <div>
            <h2>
              {club
                ? "Edit Club"
                : "Create Club"}
            </h2>

            <p>
              Add club information.
            </p>
          </div>

          <button
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <form
          className="form"
          onSubmit={submit}
        >

          <label>
            Club Name
          </label>

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Coding Club"
            required
          />

          <label>
            Description
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="Club description"
            rows="4"
          />

          <label>
            President
          </label>

          <input
            value={president}
            onChange={(e) =>
              setPresident(
                e.target.value
              )
            }
            placeholder="President name"
          />

          <label>
            Club Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="club@college.edu"
          />

          <div className="form-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : club
                ? "Update Club"
                : "Create Club"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

/* =========================================================
   CLUB CARD
========================================================= */

function ClubCard({
  club,
  onEdit,
  onDelete,
}) {
  const [events, setEvents] =
    useState([]);

  useEffect(() => {
    if (!club?.id) return;

    apiFetch(
      `/clubs/${club.id}/events`
    )
      .then((response) => {
        setEvents(
          getArray(response, [
            "events",
          ])
        );
      })
      .catch((error) => {
        console.error(error);
      });
  }, [club?.id]);

  return (
    <div className="club-card">

      <div className="club-card-top">

        <div className="club-large-avatar">
          {club.name
            ?.charAt(0)
            ?.toUpperCase() || "C"}
        </div>

        <div className="club-actions">

          <button
            className="icon-button"
            onClick={onEdit}
            title="Edit"
          >
            ✎
          </button>

          <button
            className="icon-button danger"
            onClick={onDelete}
            title="Delete"
          >
            ×
          </button>

        </div>

      </div>

      <h3>
        {club.name}
      </h3>

      <p className="club-description">
        {club.description ||
          "No description available."}
      </p>

      <div className="club-meta">

        <span>
          President:{" "}
          <strong>
            {club.president ||
              "-"}
          </strong>
        </span>

        <span>
          {club.email || "No email"}
        </span>

      </div>

      <div className="club-events">

        <div className="section-label">
          Events
          <span>
            {events.length}
          </span>
        </div>

        {events.length === 0 ? (
          <span className="muted">
            No events yet.
          </span>
        ) : (
          events
            .slice(0, 3)
            .map((event) => (
              <div
                className="mini-event"
                key={event.id}
              >
                <span>
                  {event.title}
                </span>

                <small>
                  {formatDate(
                    event.date
                  )}
                </small>
              </div>
            ))
        )}

      </div>

    </div>
  );
}

/* =========================================================
   EVENTS
========================================================= */

function Events() {
  const navigate = useNavigate();

  const [events, setEvents] =
    useState([]);

  const [clubs, setClubs] =
    useState([]);

  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        eventsResponse,
        clubsResponse,
        registrationsResponse,
      ] = await Promise.all([
        apiFetch("/events"),
        apiFetch("/clubs"),
        apiFetch("/registrations"),
      ]);

      setEvents(
        getArray(eventsResponse, [
          "events",
        ])
      );

      setClubs(
        getArray(clubsResponse, [
          "clubs",
        ])
      );

      setRegistrations(
        getArray(
          registrationsResponse,
          ["registrations"]
        )
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteEvent = async (event) => {
    const confirmed =
      window.confirm(
        `Delete "${event.title}"?`
      );

    if (!confirmed) return;

    try {
      await apiFetch(
        `/events/${event.id}`,
        {
          method: "DELETE",
        }
      );

      loadData();
    } catch (error) {
      alert(error.message);
    }
  };

  const registrationCount = (
    eventId
  ) =>
    registrations.filter(
      (registration) =>
        getEventId(registration) ===
        eventId
    ).length;

  return (
    <div className="page">

      <PageHeader
        title="Events"
        subtitle="Create and manage campus events."
        action={
          <button
            className="primary-button"
            onClick={() =>
              navigate("/events/new")
            }
          >
            + Create Event
          </button>
        }
      />

      {loading ? (
        <div className="loading-box">
          Loading events...
        </div>
      ) : events.length === 0 ? (
        <div className="empty-card">
          <div className="empty-icon">
            ◫
          </div>

          <h2>
            No events yet
          </h2>

          <p>
            Create your first campus event.
          </p>

          <button
            className="primary-button"
            onClick={() =>
              navigate("/events/new")
            }
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="events-grid">

          {events.map((event) => (
            <div
              className="event-card"
              key={event.id}
            >

              <div className="event-card-top">

                <span
                  className={`event-status ${
                    event.status ||
                    "draft"
                  }`}
                >
                  {event.status ||
                    "draft"}
                </span>

                <button
                  className="icon-button danger"
                  onClick={() =>
                    deleteEvent(event)
                  }
                >
                  ×
                </button>

              </div>

              <h3>
                {event.title}
              </h3>

              <p className="event-description">
                {event.description ||
                  "No description."}
              </p>

              <div className="event-info">

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      event.date
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Time
                  </span>

                  <strong>
                    {event.time ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Venue
                  </span>

                  <strong>
                    {event.venue ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>
                    Club
                  </span>

                  <strong>
                    {event.clubName ||
                      clubs.find(
                        (club) =>
                          club.id ===
                          event.clubId
                      )?.name ||
                      "Independent"}
                  </strong>
                </div>

              </div>

              <div className="event-footer">

                <span>
                  {registrationCount(
                    event.id
                  )}{" "}
                  registrations
                </span>

                <Link
                  className="secondary-button"
                  to={`/events/${event.id}`}
                >
                  View
                </Link>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}

/* =========================================================
   CREATE EVENT
========================================================= */

function CreateEvent() {
  const navigate = useNavigate();

  const [clubs, setClubs] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    capacity: "",
    status: "published",
    clubId: "",
  });

  const loadClubs = async () => {
    try {
      const response =
        await apiFetch("/clubs");

      setClubs(
        getArray(response, [
          "clubs",
        ])
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadClubs();
  }, []);

  const updateField = (
    key,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setLoading(true);

    try {
      const selectedClub =
        clubs.find(
          (club) =>
            club.id === form.clubId
        );

      const slug = createSlug(
        form.title
      );

      const eventPayload = {
        title: form.title,
        description:
          form.description,
        date: form.date,
        time: form.time,
        venue: form.venue,
        capacity: Number(
          form.capacity || 0
        ),
        slug,
        status: form.status,
        clubId:
          selectedClub?.id || null,
        clubName:
          selectedClub?.name ||
          null,
      };

      const response =
        await apiFetch("/events", {
          method: "POST",
          body: JSON.stringify(
            eventPayload
          ),
        });

      const createdEvent =
        response.event ||
        response.data ||
        response;

      /*
       * If the backend returns the event ID,
       * we can create a default registration form.
       */
      const eventId =
        createdEvent.id ||
        createdEvent.eventId;

      if (eventId) {
        try {
          await apiFetch("/forms", {
            method: "POST",
            body: JSON.stringify({
              title: `${form.title} Registration Form`,
              description: `Register for ${form.title}`,
              eventId,
              slug: `${slug}-registration`,
              fields: [
                {
                  fieldId: "name",
                  label: "Full Name",
                  type: "text",
                  required: true,
                },
                {
                  fieldId: "email",
                  label: "Email",
                  type: "email",
                  required: true,
                },
                {
                  fieldId: "phone",
                  label: "Phone",
                  type: "phone",
                  required: true,
                },
                {
                  fieldId: "college",
                  label: "College",
                  type: "text",
                  required: true,
                },
              ],
            }),
          });
        } catch (formError) {
          /*
           * Event is already created.
           * Do not fail the whole event creation
           * because the form endpoint may be optional.
           */
          console.warn(
            "Default form creation failed:",
            formError
          );
        }
      }

      alert(
        "Event created successfully."
      );

      navigate("/events");
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <PageHeader
        title="Create Event"
        subtitle="Create a new campus event."
        action={
          <button
            className="secondary-button"
            onClick={() =>
              navigate("/events")
            }
          >
            ← Back
          </button>
        }
      />

      <div className="form-card">

        <form
          className="form"
          onSubmit={submit}
        >

          <div className="form-grid">

            <div className="form-group full">
              <label>
                Event Title
              </label>

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
              <label>
                Description
              </label>

              <textarea
                rows="5"
                value={form.description}
                onChange={(e) =>
                  updateField(
                    "description",
                    e.target.value
                  )
                }
                placeholder="Describe the event..."
              />
            </div>

            <div className="form-group">
              <label>
                Date
              </label>

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
              <label>
                Time
              </label>

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
              <label>
                Venue
              </label>

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
              <label>
                Capacity
              </label>

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
                placeholder="250"
              />
            </div>

            <div className="form-group">
              <label>
                Club
              </label>

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
                  Independent Event
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

              <small>
                The selected club will be
                associated with this event.
              </small>
            </div>

            <div className="form-group">
              <label>
                Status
              </label>

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

                <option value="closed">
                  Closed
                </option>
              </select>
            </div>

          </div>

          <div className="form-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                navigate("/events")
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Event"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

/* =========================================================
   EVENT DETAILS
========================================================= */

function EventDetails() {
  const { eventId } =
    useParams();

  const [event, setEvent] =
    useState(null);

  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          eventResponse,
          registrationsResponse,
        ] = await Promise.all([
          apiFetch(
            `/events/${eventId}`
          ),
          apiFetch(
            "/registrations"
          ),
        ]);

        setEvent(
          eventResponse.event ||
            eventResponse.data ||
            eventResponse
        );

        const allRegistrations =
          getArray(
            registrationsResponse,
            ["registrations"]
          );

        setRegistrations(
          allRegistrations.filter(
            (registration) =>
              getEventId(
                registration
              ) === eventId
          )
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-box">
          Loading event...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page">
        <div className="empty-card">
          <h2>
            Event not found
          </h2>

          <Link
            to="/events"
            className="primary-button"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      <PageHeader
        title={event.title}
        subtitle={
          event.description ||
          "Event details"
        }
        action={
          <Link
            to="/events"
            className="secondary-button"
          >
            ← Back
          </Link>
        }
      />

      <div className="event-detail-grid">

        <div className="content-card">

          <div className="detail-content">

            <div className="detail-item">
              <span>
                Date
              </span>

              <strong>
                {formatDate(
                  event.date
                )}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Time
              </span>

              <strong>
                {event.time || "-"}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Venue
              </span>

              <strong>
                {event.venue || "-"}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Club
              </span>

              <strong>
                {event.clubName ||
                  "Independent"}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Capacity
              </span>

              <strong>
                {event.capacity || "-"}
              </strong>
            </div>

            <div className="detail-item">
              <span>
                Registrations
              </span>

              <strong>
                {registrations.length}
              </strong>
            </div>

          </div>

        </div>

      </div>

      <div className="content-card">

        <div className="content-card-header">

          <div>
            <h2>
              Registered Students
            </h2>

            <p>
              Students registered for
              this event.
            </p>
          </div>

          <Link
            to="/participation"
            className="primary-button"
          >
            Manage Attendance
          </Link>

        </div>

        <div className="table-wrapper">

          <table className="data-table">

            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>College</th>
                <th>Registered</th>
              </tr>
            </thead>

            <tbody>

              {registrations.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="table-empty"
                  >
                    No registrations yet.
                  </td>
                </tr>
              ) : (
                registrations.map(
                  (
                    registration,
                    index
                  ) => (
                    <tr
                      key={
                        getRegistrationId(
                          registration
                        ) ||
                        index
                      }
                    >
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {getStudentValue(
                            registration,
                            "name"
                          )}
                        </strong>
                      </td>

                      <td>
                        {getStudentValue(
                          registration,
                          "email"
                        )}
                      </td>

                      <td>
                        {getStudentValue(
                          registration,
                          "phone"
                        )}
                      </td>

                      <td>
                        {getStudentValue(
                          registration,
                          "college"
                        )}
                      </td>

                      <td>
                        {formatDateTime(
                          registration.submittedAt ||
                            registration.createdAt
                        )}
                      </td>
                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   PARTICIPATION
========================================================= */

function Participation() {
  const [registrations, setRegistrations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      /*
       * IMPORTANT:
       *
       * Participation is populated from
       * registrations.
       *
       * We do NOT ask the admin to select
       * an event.
       */

      const response =
        await apiFetch(
          "/registrations"
        );

      const list = getArray(
        response,
        ["registrations"]
      );

      setRegistrations(list);
    } catch (err) {
      console.error(
        "Participation error:",
        err
      );

      setError(
        err.message ||
          "Failed to load registrations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const getStatus = (
    registration
  ) => {
    return String(
      registration.participationStatus ||
        registration.attendanceStatus ||
        registration.status ||
        "pending"
    ).toLowerCase();
  };

  const markAttendance = async (
    registration,
    status
  ) => {
    const registrationId =
      getRegistrationId(
        registration
      );

    /*
     * THIS IS THE IMPORTANT PART.
     *
     * eventId is taken directly from
     * the registration document.
     */
    const eventId =
      getEventId(registration);

    if (!registrationId) {
      alert(
        "Registration ID is missing."
      );
      return;
    }

    if (!eventId) {
      console.error(
        "Registration without eventId:",
        registration
      );

      alert(
        "eventId is missing from this registration. Please check the registration document in Firestore."
      );

      return;
    }

    try {
      setSavingId(registrationId);
      setError("");
      setMessage("");

      /*
       * Backend receives:
       *
       * {
       *   registrationId,
       *   eventId,
       *   status
       * }
       */

      await apiFetch(
        "/participation",
        {
          method: "POST",
          body: JSON.stringify({
            registrationId,
            eventId,
            status,
          }),
        }
      );

      /*
       * Immediately update the UI.
       */

      setRegistrations(
        (previous) =>
          previous.map(
            (student) => {
              const id =
                getRegistrationId(
                  student
                );

              if (
                id ===
                registrationId
              ) {
                return {
                  ...student,

                  participationStatus:
                    status,

                  attendanceStatus:
                    status,
                };
              }

              return student;
            }
          )
      );

      const studentName =
        getStudentValue(
          registration,
          "name"
        );

      setMessage(
        `${studentName} marked as ${status}.`
      );
    } catch (err) {
      console.error(
        "Attendance update failed:",
        err
      );

      setError(
        err.message ||
          "Failed to update attendance."
      );
    } finally {
      setSavingId(null);
    }
  };

  const presentCount =
    registrations.filter(
      (student) =>
        getStatus(student) ===
        "present"
    ).length;

  const absentCount =
    registrations.filter(
      (student) =>
        getStatus(student) ===
        "absent"
    ).length;

  const pendingCount =
    registrations.filter(
      (student) =>
        getStatus(student) ===
        "pending"
    ).length;

  return (
    <div className="page">

      <PageHeader
        title="Participation"
        subtitle="Manage attendance directly from registered students."
        action={
          <button
            className="secondary-button"
            onClick={
              loadRegistrations
            }
          >
            ↻ Refresh
          </button>
        }
      />

      {message && (
        <div className="success-message">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="error-message page-error">
          {error}
        </div>
      )}

      <div className="stats-grid">

        <StatCard
          title="Total Registered"
          value={
            registrations.length
          }
          icon="♙"
        />

        <StatCard
          title="Present"
          value={presentCount}
          icon="✓"
        />

        <StatCard
          title="Absent"
          value={absentCount}
          icon="×"
        />

        <StatCard
          title="Pending"
          value={pendingCount}
          icon="○"
        />

      </div>

      <div className="content-card">

        <div className="content-card-header">

          <div>
            <h2>
              Registered Students
            </h2>

            <p>
              These students are
              fetched directly from
              the registration
              collection.
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={
              loadRegistrations
            }
          >
            Refresh
          </button>

        </div>

        {loading ? (
          <div className="empty-state">
            Loading registrations...
          </div>
        ) : registrations.length ===
          0 ? (
          <div className="empty-state">
            No students have
            registered yet.
          </div>
        ) : (
          <div className="table-wrapper">

            <table className="data-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>College</th>
                  <th>Event</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Attendance</th>
                </tr>
              </thead>

              <tbody>

                {registrations.map(
                  (
                    student,
                    index
                  ) => {
                    const registrationId =
                      getRegistrationId(
                        student
                      );

                    const status =
                      getStatus(
                        student
                      );

                    return (
                      <tr
                        key={
                          registrationId ||
                          index
                        }
                      >

                        <td>
                          {index + 1}
                        </td>

                        <td>
                          <strong>
                            {getStudentValue(
                              student,
                              "name"
                            )}
                          </strong>
                        </td>

                        <td>
                          {getStudentValue(
                            student,
                            "email"
                          )}
                        </td>

                        <td>
                          {getStudentValue(
                            student,
                            "phone"
                          )}
                        </td>

                        <td>
                          {getStudentValue(
                            student,
                            "college"
                          )}
                        </td>

                        <td>
                          <span className="event-name-cell">
                            {student.eventName ||
                              student.event?.title ||
                              student.eventTitle ||
                              student.eventId ||
                              "-"}
                          </span>
                        </td>

                        <td>
                          {formatDateTime(
                            student.submittedAt ||
                              student.createdAt ||
                              student.registrationDate
                          )}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${status}`}
                          >
                            {status ===
                            "present"
                              ? "Present"
                              : status ===
                                "absent"
                              ? "Absent"
                              : "Pending"}
                          </span>
                        </td>

                        <td>
                          <div className="attendance-actions">

                            <button
                              className={`attendance-button present-button ${
                                status ===
                                "present"
                                  ? "active"
                                  : ""
                              }`}
                              disabled={
                                savingId ===
                                registrationId
                              }
                              onClick={() =>
                                markAttendance(
                                  student,
                                  "present"
                                )
                              }
                            >
                              ✓ Present
                            </button>

                            <button
                              className={`attendance-button absent-button ${
                                status ===
                                "absent"
                                  ? "active"
                                  : ""
                              }`}
                              disabled={
                                savingId ===
                                registrationId
                              }
                              onClick={() =>
                                markAttendance(
                                  student,
                                  "absent"
                                )
                              }
                            >
                              ✕ Absent
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

/* =========================================================
   PUBLIC REGISTRATION
========================================================= */

function PublicRegistration() {
  const { slug } =
    useParams();

  const [form, setForm] =
    useState(null);

  const [event, setEvent] =
    useState(null);

  const [values, setValues] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const formsResponse =
          await apiFetch("/forms");

        const forms = getArray(
          formsResponse,
          ["forms"]
        );

        const foundForm =
          forms.find(
            (item) =>
              item.slug === slug
          );

        if (!foundForm) {
          throw new Error(
            "Registration form not found."
          );
        }

        setForm(foundForm);

        if (foundForm.eventId) {
          try {
            const eventResponse =
              await apiFetch(
                `/events/${foundForm.eventId}`
              );

            setEvent(
              eventResponse.event ||
                eventResponse.data ||
                eventResponse
            );
          } catch {
            // Event details are optional
          }
        }

        const initialValues = {};

        (
          foundForm.fields || []
        ).forEach((field) => {
          initialValues[
            field.fieldId
          ] =
            field.type ===
            "checkbox"
              ? []
              : "";
        });

        setValues(
          initialValues
        );
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
            "Failed to load registration form."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  const updateValue = (
    field,
    value
  ) => {
    setValues((previous) => ({
      ...previous,
      [field.fieldId]:
        value,
    }));
  };

  const submit = async (
    eventObject
  ) => {
    eventObject.preventDefault();

    if (!form?.eventId) {
      setError(
        "This registration form does not have an eventId."
      );

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await apiFetch(
        "/registrations",
        {
          method: "POST",
          body: JSON.stringify({
            eventId:
              form.eventId,

            formId:
              form.id ||
              form.formId,

            data: values,

            name:
              values.name ||
              values.fullName ||
              "",

            email:
              values.email ||
              "",

            phone:
              values.phone ||
              "",

            college:
              values.college ||
              "",
          }),
        }
      );

      setSuccess(true);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Registration failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-page">
        <div className="public-card">
          Loading registration form...
        </div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="public-page">
        <div className="public-card">
          <h1>
            Registration unavailable
          </h1>

          <p className="error-text">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="public-page">

        <div className="public-card success-card">

          <div className="success-icon">
            ✓
          </div>

          <h1>
            Registration Successful
          </h1>

          <p>
            Your registration has
            been submitted successfully.
          </p>

          <p>
            A confirmation email will
            be sent to your registered
            email address.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="public-page">

      <div className="public-card">

        <div className="public-brand">
          <div className="brand-icon">
            N
          </div>

          <strong>
            NexusCampus
          </strong>
        </div>

        {event && (
          <div className="public-event">

            <h1>
              {event.title}
            </h1>

            <p>
              {event.description}
            </p>

            <div className="public-event-meta">

              <span>
                📅{" "}
                {formatDate(
                  event.date
                )}
              </span>

              <span>
                🕐 {event.time}
              </span>

              <span>
                📍 {event.venue}
              </span>

            </div>

          </div>
        )}

        <div className="public-form-heading">

          <h2>
            {form.title}
          </h2>

          <p>
            {form.description}
          </p>

        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form
          className="form public-form"
          onSubmit={submit}
        >

          {(form.fields || []).map(
            (field) => (
              <PublicField
                key={
                  field.fieldId
                }
                field={field}
                value={
                  values[
                    field.fieldId
                  ]
                }
                onChange={(value) =>
                  updateValue(
                    field,
                    value
                  )
                }
              />
            )
          )}

          <button
            type="submit"
            className="primary-button full-width"
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
   PUBLIC FIELD
========================================================= */

function PublicField({
  field,
  value,
  onChange,
}) {
  const type =
    field.type || "text";

  return (
    <div className="form-group">

      <label>
        {field.label}

        {field.required && (
          <span className="required">
            *
          </span>
        )}
      </label>

      {type === "textarea" ? (
        <textarea
          rows="5"
          value={value || ""}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          required={field.required}
        />
      ) : type ===
        "dropdown" ||
        type === "select" ? (
        <select
          value={value || ""}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          required={field.required}
        >
          <option value="">
            Select...
          </option>

          {(field.options || []).map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            )
          )}
        </select>
      ) : type === "radio" ? (
        <div className="radio-group">

          {(field.options || []).map(
            (option) => (
              <label
                className="radio-option"
                key={option}
              >
                <input
                  type="radio"
                  name={
                    field.fieldId
                  }
                  value={option}
                  checked={
                    value === option
                  }
                  onChange={() =>
                    onChange(
                      option
                    )
                  }
                  required={
                    field.required
                  }
                />

                {option}
              </label>
            )
          )}

        </div>
      ) : type === "checkbox" ? (
        <div className="checkbox-group">

          {(field.options || []).map(
            (option) => {
              const checked =
                Array.isArray(
                  value
                ) &&
                value.includes(
                  option
                );

              return (
                <label
                  className="checkbox-option"
                  key={option}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current =
                        Array.isArray(
                          value
                        )
                          ? value
                          : [];

                      onChange(
                        checked
                          ? current.filter(
                              (
                                item
                              ) =>
                                item !==
                                option
                            )
                          : [
                              ...current,
                              option,
                            ]
                      );
                    }}
                  />

                  {option}
                </label>
              );
            }
          )}

        </div>
      ) : (
        <input
          type={
            type === "phone"
              ? "tel"
              : type
          }
          value={value || ""}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          required={field.required}
        />
      )}

    </div>
  );
}

/* =========================================================
   PROTECTED APP
========================================================= */

function ProtectedApp({
  user,
}) {
  return (
    <Layout user={user}>

      <Routes>

        <Route
          path="/dashboard"
          element={
            <Dashboard />
          }
        />

        <Route
          path="/clubs"
          element={
            <Clubs />
          }
        />

        <Route
          path="/events"
          element={
            <Events />
          }
        />

        <Route
          path="/events/new"
          element={
            <CreateEvent />
          }
        />

        <Route
          path="/events/:eventId"
          element={
            <EventDetails />
          }
        />

        <Route
          path="/participation"
          element={
            <Participation />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </Layout>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [user, setUser] =
    useState(undefined);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(
            currentUser
          );
        }
      );

    return unsubscribe;
  }, []);

  if (user === undefined) {
    return (
      <div className="loading-screen">
        Loading NexusCampus...
      </div>
    );
  }

  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to="/dashboard"
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/register/:slug"
          element={
            <PublicRegistration />
          }
        />

        <Route
          path="/*"
          element={
            user ? (
              <ProtectedApp
                user={user}
              />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

/* =========================================================
   START
========================================================= */

createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);