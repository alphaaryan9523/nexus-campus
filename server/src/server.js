import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db, admin } from "./firebase.js";
import { requireAdmin } from "./middleware.js";
import { sendRegistrationEmail } from "./email.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 5001);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));

const timestamp = () => admin.firestore.FieldValue.serverTimestamp();


// ============================================================
// BASIC
// ============================================================

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "NexusCampus API is running"
  });
});

app.get("/api/health", (_, res) => {
  res.json({
    success: true,
    message: "OK"
  });
});


// ============================================================
// EVENTS
// ============================================================

app.get("/api/events", async (req, res) => {
  try {
    const snap = await db
      .collection("events")
      .orderBy("date", "asc")
      .get();

    const events = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.get("/api/events/:id", async (req, res) => {
  try {
    const doc = await db
      .collection("events")
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.json({
      success: true,
      event: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.post("/api/events", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = "",
      date,
      time = "",
      venue = "",
      capacity = 0,
      slug,
      status = "draft"
    } = req.body;

    if (!title || !date || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title, date and slug are required."
      });
    }

    const ref = db.collection("events").doc();

    const data = {
      title,
      description,
      date,
      time,
      venue,
      capacity: Number(capacity) || 0,
      slug,
      status,
      createdAt: timestamp(),
      updatedAt: timestamp()
    };

    await ref.set(data);

    const saved = await ref.get();

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event: {
        id: ref.id,
        ...saved.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.put("/api/events/:id", requireAdmin, async (req, res) => {
  try {
    const ref = db.collection("events").doc(req.params.id);

    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const allowed = [
      "title",
      "description",
      "date",
      "time",
      "venue",
      "capacity",
      "slug",
      "status"
    ];

    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] =
          key === "capacity"
            ? Number(req.body[key]) || 0
            : req.body[key];
      }
    }

    update.updatedAt = timestamp();

    await ref.update(update);

    const saved = await ref.get();

    res.json({
      success: true,
      message: "Event updated successfully",
      event: {
        id: ref.id,
        ...saved.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.delete("/api/events/:id", requireAdmin, async (req, res) => {
  try {
    await db
      .collection("events")
      .doc(req.params.id)
      .delete();

    res.json({
      success: true,
      message: "Event deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// FORMS
// ============================================================

app.get("/api/forms/:id", async (req, res) => {
  try {
    const doc = await db
      .collection("forms")
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    res.json({
      success: true,
      form: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.get("/api/events/:eventId/form", async (req, res) => {
  try {
    const eventRef = db
      .collection("events")
      .doc(req.params.eventId);

    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const event = {
      id: eventDoc.id,
      ...eventDoc.data()
    };

    if (!event.formId) {
      return res.json({
        success: true,
        form: null
      });
    }

    const formDoc = await db
      .collection("forms")
      .doc(event.formId)
      .get();

    if (!formDoc.exists) {
      return res.json({
        success: true,
        form: null
      });
    }

    res.json({
      success: true,
      form: {
        id: formDoc.id,
        ...formDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.get("/api/forms/by-slug/:slug", async (req, res) => {
  try {
    const snap = await db
      .collection("forms")
      .where("slug", "==", req.params.slug)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({
        success: false,
        message: "Registration form not found"
      });
    }

    const doc = snap.docs[0];

    const form = {
      id: doc.id,
      ...doc.data()
    };

    const eventDoc = await db
      .collection("events")
      .doc(form.eventId)
      .get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    res.json({
      success: true,
      form,
      event: {
        id: eventDoc.id,
        ...eventDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.post("/api/forms", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = "",
      eventId,
      slug,
      fields = []
    } = req.body;

    if (!title || !eventId || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title, eventId and slug are required."
      });
    }

    const eventRef = db
      .collection("events")
      .doc(eventId);

    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const ref = db
      .collection("forms")
      .doc();

    await ref.set({
      title,
      description,
      eventId,
      slug,
      fields,
      createdAt: timestamp(),
      updatedAt: timestamp()
    });

    await eventRef.update({
      formId: ref.id,
      updatedAt: timestamp()
    });

    const saved = await ref.get();

    res.status(201).json({
      success: true,
      message: "Registration form created successfully",
      form: {
        id: ref.id,
        ...saved.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.put("/api/forms/:id", requireAdmin, async (req, res) => {
  try {
    const ref = db
      .collection("forms")
      .doc(req.params.id);

    const existing = await ref.get();

    if (!existing.exists) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    const update = {};

    ["title", "description", "slug", "fields"].forEach(
      (key) => {
        if (req.body[key] !== undefined) {
          update[key] = req.body[key];
        }
      }
    );

    update.updatedAt = timestamp();

    await ref.update(update);

    const saved = await ref.get();

    res.json({
      success: true,
      message: "Registration form updated successfully",
      form: {
        id: ref.id,
        ...saved.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ============================================================
// REGISTRATIONS
// ============================================================

app.post("/api/registrations", async (req, res) => {
  try {
    const {
      eventId,
      formId,
      data = {}
    } = req.body;

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    if (!eventId || !formId) {
      return res.status(400).json({
        success: false,
        message: "eventId and formId are required."
      });
    }

    // --------------------------------------------------------
    // LOAD EVENT + FORM
    // --------------------------------------------------------

    const eventRef = db
      .collection("events")
      .doc(eventId);

    const formRef = db
      .collection("forms")
      .doc(formId);

    const [eventDoc, formDoc] = await Promise.all([
      eventRef.get(),
      formRef.get()
    ]);

    if (!eventDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    if (!formDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    const event = {
      id: eventDoc.id,
      ...eventDoc.data()
    };

    const form = {
      id: formDoc.id,
      ...formDoc.data()
    };

    // --------------------------------------------------------
    // CHECK EVENT STATUS
    // --------------------------------------------------------

    if (event.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Registration is not open for this event."
      });
    }

    // --------------------------------------------------------
    // FIND EMAIL FIELD
    // --------------------------------------------------------

    const emailField = (form.fields || []).find(
      (field) => field.type === "email"
    );

    if (!emailField) {
      return res.status(400).json({
        success: false,
        message:
          "This registration form does not contain an email field."
      });
    }

    // --------------------------------------------------------
    // GET EMAIL FROM THAT FIELD
    // --------------------------------------------------------

    const email = String(
      data[emailField.fieldId] || ""
    )
      .trim()
      .toLowerCase();

    // --------------------------------------------------------
    // EMAIL REQUIRED
    // --------------------------------------------------------

    if (!email) {
      return res.status(400).json({
        success: false,
        message: `${emailField.label || "Email"} is required.`
      });
    }

    // --------------------------------------------------------
    // EMAIL FORMAT VALIDATION
    // --------------------------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    // --------------------------------------------------------
    // FIND NAME FIELD
    // --------------------------------------------------------

    const nameField = (form.fields || []).find(
      (field) =>
        field.type === "text" &&
        (
          field.fieldId === "name" ||
          String(field.label || "")
            .toLowerCase()
            .includes("name")
        )
    );

    const name = nameField
      ? String(
          data[nameField.fieldId] || ""
        ).trim()
      : "";

    // --------------------------------------------------------
    // DUPLICATE REGISTRATION CHECK
    // --------------------------------------------------------

    const registrationsRef =
      db.collection("registrations");

    const existing = await registrationsRef
      .where("eventId", "==", eventId)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered for the event."
      });
    }

    // --------------------------------------------------------
    // CAPACITY CHECK
    // --------------------------------------------------------

    if (Number(event.capacity) > 0) {
      const countSnap = await registrationsRef
        .where("eventId", "==", eventId)
        .get();

      if (
        countSnap.size >=
        Number(event.capacity)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This event has reached its registration capacity."
        });
      }
    }

    // --------------------------------------------------------
    // VALIDATE REQUIRED FORM FIELDS
    // --------------------------------------------------------

    for (const field of form.fields || []) {
      if (
        field.required &&
        (
          data[field.fieldId] === undefined ||
          String(data[field.fieldId]).trim() === ""
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `${field.label} is required.`
        });
      }
    }

    // --------------------------------------------------------
    // SAVE REGISTRATION
    // --------------------------------------------------------

    const ref =
      registrationsRef.doc();

    await ref.set({
      eventId,
      formId,

      // Automatically detected from
      // the field with type === "email"
      email,

      // Automatically detected name
      name,

      // Complete submitted form data
      data,

      submittedAt: timestamp(),

      emailStatus: "pending"
    });

    // --------------------------------------------------------
    // SEND EMAIL THROUGH RESEND
    // --------------------------------------------------------

    let emailStatus = "failed";

    try {
      const result =
        await sendRegistrationEmail({
          to: email,
          name,
          event
        });

      emailStatus = result.sent
        ? "sent"
        : "not_configured";

    } catch (mailError) {
      console.error(
        "Email error:",
        mailError.message
      );
    }

    // --------------------------------------------------------
    // UPDATE EMAIL STATUS
    // --------------------------------------------------------

    await ref.update({
      emailStatus
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    res.status(201).json({
      success: true,
      message: "Registration successful",
      registrationId: ref.id,
      emailStatus
    });

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


app.get(
  "/api/registrations",
  requireAdmin,
  async (req, res) => {
    try {
      const eventId =
        req.query.eventId;

      let query =
        db.collection("registrations");

      if (eventId) {
        query = query.where(
          "eventId",
          "==",
          eventId
        );
      }

      const snap =
        await query.get();

      const registrations =
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

      registrations.sort(
        (a, b) =>
          String(
            b.submittedAt?.toDate?.() ||
            b.submittedAt ||
            ""
          ).localeCompare(
            String(
              a.submittedAt?.toDate?.() ||
              a.submittedAt ||
              ""
            )
          )
      );

      res.json({
        success: true,
        registrations
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


// ============================================================
// CLUBS
// ============================================================

app.get(
  "/api/clubs",
  requireAdmin,
  async (_, res) => {
    try {
      const snap = await db
        .collection("clubs")
        .orderBy("name", "asc")
        .get();

      res.json({
        success: true,
        clubs: snap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data()
          })
        )
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


app.post(
  "/api/clubs",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        description = "",
        category = "",
        coordinator = "",
        contact = ""
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Club name is required."
        });
      }

      const ref =
        db.collection("clubs").doc();

      await ref.set({
        name,
        description,
        category,
        coordinator,
        contact,
        memberCount: 0,
        createdAt: timestamp(),
        updatedAt: timestamp()
      });

      const saved =
        await ref.get();

      res.status(201).json({
        success: true,
        club: {
          id: ref.id,
          ...saved.data()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


app.put(
  "/api/clubs/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const ref =
        db.collection("clubs")
          .doc(req.params.id);

      if (!(await ref.get()).exists) {
        return res.status(404).json({
          success: false,
          message: "Club not found"
        });
      }

      await ref.update({
        ...req.body,
        updatedAt: timestamp()
      });

      const saved =
        await ref.get();

      res.json({
        success: true,
        club: {
          id: ref.id,
          ...saved.data()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


app.delete(
  "/api/clubs/:id",
  requireAdmin,
  async (req, res) => {
    try {
      await db
        .collection("clubs")
        .doc(req.params.id)
        .delete();

      res.json({
        success: true,
        message: "Club deleted successfully"
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


// ============================================================
// PARTICIPATION
// ============================================================

app.get(
  "/api/participation",
  requireAdmin,
  async (_, res) => {
    try {
      const snap =
        await db
          .collection("participation")
          .get();

      res.json({
        success: true,
        participation:
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }))
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


app.post(
  "/api/participation",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        studentName,
        email,
        eventId,
        clubId = "",
        status = "registered",
        points = 0
      } = req.body;

      if (
        !studentName ||
        !email ||
        !eventId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "studentName, email and eventId are required."
        });
      }

      const ref =
        db.collection("participation")
          .doc();

      await ref.set({
        studentName,
        email,
        eventId,
        clubId,
        status,
        points: Number(points) || 0,
        createdAt: timestamp(),
        updatedAt: timestamp()
      });

      const saved =
        await ref.get();

      res.status(201).json({
        success: true,
        participation: {
          id: ref.id,
          ...saved.data()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


app.put(
  "/api/participation/:id",
  requireAdmin,
  async (req, res) => {
    try {
      const ref =
        db.collection("participation")
          .doc(req.params.id);

      if (!(await ref.get()).exists) {
        return res.status(404).json({
          success: false,
          message:
            "Participation record not found"
        });
      }

      const update = {
        ...req.body,
        updatedAt: timestamp()
      };

      if (
        req.body.points !== undefined
      ) {
        update.points =
          Number(req.body.points) || 0;
      }

      await ref.update(update);

      const saved =
        await ref.get();

      res.json({
        success: true,
        participation: {
          id: ref.id,
          ...saved.data()
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


// ============================================================
// ANALYTICS
// ============================================================

app.get(
  "/api/analytics",
  requireAdmin,
  async (_, res) => {
    try {
      const [
        eventsSnap,
        regsSnap,
        clubsSnap,
        participationSnap
      ] = await Promise.all([
        db.collection("events").get(),
        db.collection("registrations").get(),
        db.collection("clubs").get(),
        db.collection("participation").get()
      ]);

      const events =
        eventsSnap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data()
          })
        );

      const registrations =
        regsSnap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data()
          })
        );

      const clubs =
        clubsSnap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data()
          })
        );

      const participation =
        participationSnap.docs.map(
          (d) => ({
            id: d.id,
            ...d.data()
          })
        );

      const byEvent =
        events.map((event) => ({
          id: event.id,
          name: event.title,

          registrations:
            registrations.filter(
              (r) =>
                r.eventId === event.id
            ).length,

          capacity:
            Number(event.capacity) || 0
        }));

      const upcoming =
        [...events]
          .filter(
            (e) =>
              e.date >=
              new Date()
                .toISOString()
                .slice(0, 10)
          )
          .sort(
            (a, b) =>
              String(a.date)
                .localeCompare(
                  String(b.date)
                )
          )
          .slice(0, 5);

      res.json({
        success: true,

        totals: {
          events: events.length,
          registrations:
            registrations.length,
          clubs: clubs.length,
          participation:
            participation.length
        },

        byEvent,

        upcoming
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (err, _req, res, _next) => {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
);


// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  () => {
    console.log(
      `NexusCampus server running on http://localhost:${PORT}`
    );
  }
);