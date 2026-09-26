import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { db } from "./firebase.js";
import { sendRegistrationEmail } from "./email.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nexus-campus-psi.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5001;

/* =========================================================
   ADMIN AUTH
========================================================= */

async function requireAdmin(req, res, next) {
  /*
    Keep your existing authentication middleware here
    if you already have Firebase token verification.

    For now this allows the request to continue.
  */

  next();
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NexusCampus API is running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API healthy"
  });
});

/* =========================================================
   EVENTS
========================================================= */

/*
GET ALL EVENTS
*/
app.get("/api/events", async (req, res) => {
  try {
    const snapshot = await db
      .collection("events")
      .orderBy("createdAt", "desc")
      .get();

    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("Get events error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET SINGLE EVENT
*/
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
    console.error("Get event error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
CREATE EVENT
*/
app.post("/api/events", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = "",
      date,
      time = "",
      venue,
      capacity = null,
      slug = "",
      formId = null,
      status = "draft",
      clubId = null,
      clubName = null
    } = req.body;

    if (!title || !date || !venue) {
      return res.status(400).json({
        success: false,
        message: "Title, date and venue are required"
      });
    }

    const eventRef = db.collection("events").doc();

    const event = {
      title,
      description,
      date,
      time,
      venue,
      capacity,
      slug,
      formId,
      status,

      // CLUB RELATIONSHIP
      clubId,
      clubName,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await eventRef.set(event);

    res.status(201).json({
      success: true,
      event: {
        id: eventRef.id,
        ...event
      }
    });
  } catch (error) {
    console.error("Create event error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
UPDATE EVENT
*/
app.put("/api/events/:id", requireAdmin, async (req, res) => {
  try {
    const allowedFields = [
      "title",
      "description",
      "date",
      "time",
      "venue",
      "capacity",
      "slug",
      "formId",
      "status",
      "clubId",
      "clubName"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    updates.updatedAt = new Date().toISOString();

    await db
      .collection("events")
      .doc(req.params.id)
      .update(updates);

    res.json({
      success: true,
      message: "Event updated successfully"
    });
  } catch (error) {
    console.error("Update event error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
DELETE EVENT
*/
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
    console.error("Delete event error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   CLUBS
========================================================= */

/*
GET CLUBS
*/
app.get("/api/clubs", async (req, res) => {
  try {
    const snapshot = await db
      .collection("clubs")
      .orderBy("createdAt", "desc")
      .get();

    const clubs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      clubs
    });
  } catch (error) {
    console.error("Get clubs error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
CREATE CLUB
*/
app.post("/api/clubs", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description = "",
      president = "",
      email = ""
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Club name is required"
      });
    }

    const clubRef = db.collection("clubs").doc();

    const club = {
      name,
      description,
      president,
      email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await clubRef.set(club);

    res.status(201).json({
      success: true,
      club: {
        id: clubRef.id,
        ...club
      }
    });
  } catch (error) {
    console.error("Create club error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
UPDATE CLUB
*/
app.put("/api/clubs/:id", requireAdmin, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await db
      .collection("clubs")
      .doc(req.params.id)
      .update(updates);

    res.json({
      success: true,
      message: "Club updated successfully"
    });
  } catch (error) {
    console.error("Update club error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
DELETE CLUB
*/
app.delete("/api/clubs/:id", requireAdmin, async (req, res) => {
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
    console.error("Delete club error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET EVENTS BELONGING TO A CLUB
*/
app.get("/api/clubs/:clubId/events", async (req, res) => {
  try {
    const snapshot = await db
      .collection("events")
      .where("clubId", "==", req.params.clubId)
      .get();

    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error("Get club events error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   FORMS
========================================================= */

/*
GET ALL FORMS

Useful for admin/debugging and allows the frontend
to retrieve all registration forms.
*/
app.get("/api/forms", async (req, res) => {
  try {
    const snapshot = await db
      .collection("forms")
      .orderBy("createdAt", "desc")
      .get();

    const forms = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      forms
    });
  } catch (error) {
    console.error("Get forms error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET FORM BY SLUG

IMPORTANT:
This route MUST appear before:

GET /api/forms/:id

Otherwise Express can interpret "slug" as the :id.
*/
app.get("/api/forms/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const snapshot = await db
      .collection("forms")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Registration form not found",
        slug
      });
    }

    const doc = snapshot.docs[0];

    res.json({
      success: true,
      form: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error("Get form by slug error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET FORM BY ID
*/
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
    console.error("Get form error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
GET FORM FOR EVENT
*/
app.get("/api/events/:eventId/form", async (req, res) => {
  try {
    const snapshot = await db
      .collection("forms")
      .where("eventId", "==", req.params.eventId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    const doc = snapshot.docs[0];

    res.json({
      success: true,
      form: {
        id: doc.id,
        ...doc.data()
      }
    });
  } catch (error) {
    console.error("Get event form error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
CREATE FORM
*/
app.post("/api/forms", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = "",
      eventId,
      slug,
      fields = []
    } = req.body;

    if (!title || !eventId) {
      return res.status(400).json({
        success: false,
        message: "Title and eventId are required"
      });
    }

    const formRef = db.collection("forms").doc();

    const form = {
      title,
      description,
      eventId,
      slug,
      fields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await formRef.set(form);

    /*
      CONNECT FORM TO EVENT
    */
    await db
      .collection("events")
      .doc(eventId)
      .update({
        formId: formRef.id,
        updatedAt: new Date().toISOString()
      });

    res.status(201).json({
      success: true,
      form: {
        id: formRef.id,
        ...form
      }
    });
  } catch (error) {
    console.error("Create form error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/*
UPDATE FORM
*/
app.put("/api/forms/:id", requireAdmin, async (req, res) => {
  try {
    await db
      .collection("forms")
      .doc(req.params.id)
      .update({
        ...req.body,
        updatedAt: new Date().toISOString()
      });

    res.json({
      success: true,
      message: "Form updated successfully"
    });
  } catch (error) {
    console.error("Update form error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =========================================================
   REGISTRATIONS
========================================================= */

app.post("/api/registrations", async (req, res) => {
  try {
    const {
      eventId,
      formId,
      data = {}
    } = req.body;

    if (!eventId || !formId) {
      return res.status(400).json({
        success: false,
        message: "eventId and formId are required"
      });
    }

    const eventRef = await db
      .collection("events")
      .doc(eventId)
      .get();

    if (!eventRef.exists) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    const event = eventRef.data();

    if (event.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Registration is not open"
      });
    }

    const formRef = await db
      .collection("forms")
      .doc(formId)
      .get();

    if (!formRef.exists) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    const form = formRef.data();

    const emailField = (form.fields || []).find(
      (field) => field.type === "email"
    );

    if (!emailField) {
      return res.status(400).json({
        success: false,
        message: "Form must contain an email field"
      });
    }

    const email = String(
      data[emailField.fieldId] || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    /*
      CHECK DUPLICATE REGISTRATION
    */

    const duplicateSnapshot = await db
      .collection("registrations")
      .where("eventId", "==", eventId)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!duplicateSnapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "You are already registered for this event"
      });
    }

    /*
      CAPACITY
    */

    if (event.capacity) {
      const countSnapshot = await db
        .collection("registrations")
        .where("eventId", "==", eventId)
        .get();

      if (
        countSnapshot.size >=
        Number(event.capacity)
      ) {
        return res.status(400).json({
          success: false,
          message: "Event capacity is full"
        });
      }
    }

    /*
      REQUIRED FIELDS
    */

    for (const field of form.fields || []) {
      if (
        field.required &&
        !data[field.fieldId]
      ) {
        return res.status(400).json({
          success: false,
          message: `${field.label} is required`
        });
      }
    }

    /*
      NORMALIZE STUDENT INFORMATION
    */

    const findFieldValue = (possibleNames) => {
      const field = (form.fields || []).find(
        (f) =>
          possibleNames.includes(
            String(f.label)
              .toLowerCase()
              .trim()
          ) ||
          possibleNames.includes(
            String(f.fieldId)
              .toLowerCase()
              .trim()
          )
      );

      return field
        ? data[field.fieldId] || ""
        : "";
    };

    const name = findFieldValue([
      "name",
      "full name",
      "student name"
    ]);

    const phone = findFieldValue([
      "phone",
      "phone number",
      "mobile",
      "mobile number"
    ]);

    const college = findFieldValue([
      "college",
      "college name",
      "university"
    ]);

    /*
      CREATE REGISTRATION
    */

    const registrationRef = db
      .collection("registrations")
      .doc();

    const registration = {
      eventId,
      formId,

      // NORMALIZED DATA
      name,
      email,
      phone,
      college,

      // ORIGINAL FORM DATA
      data,

      submittedAt: new Date().toISOString(),
      emailStatus: "pending"
    };

    await registrationRef.set(
      registration
    );

    /*
      SEND EMAIL
    */

    const emailResult =
      await sendRegistrationEmail({
        to: email,
        name,
        event
      });

    await registrationRef.update({
      emailStatus: emailResult.sent
        ? "sent"
        : "failed"
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      registration: {
        id: registrationRef.id,
        ...registration,
        emailStatus: emailResult.sent
          ? "sent"
          : "failed"
      }
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

/*
GET REGISTRATIONS
*/
app.get(
  "/api/registrations",
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.query;

      let query = db.collection(
        "registrations"
      );

      if (eventId) {
        query = query.where(
          "eventId",
          "==",
          eventId
        );
      }

      const snapshot = await query.get();

      const registrations =
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

      res.json({
        success: true,
        registrations
      });
    } catch (error) {
      console.error(
        "Get registrations error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/* =========================================================
   PARTICIPATION
========================================================= */

/*
GET REGISTERED STUDENTS + ATTENDANCE
*/
app.get(
  "/api/participation",
  requireAdmin,
  async (req, res) => {
    try {
      const { eventId } = req.query;

      if (!eventId) {
        return res.status(400).json({
          success: false,
          message: "eventId is required"
        });
      }

      /*
        GET REGISTRATIONS
      */

      const registrationSnapshot =
        await db
          .collection("registrations")
          .where(
            "eventId",
            "==",
            eventId
          )
          .get();

      /*
        GET ATTENDANCE
      */

      const participationSnapshot =
        await db
          .collection("participation")
          .where(
            "eventId",
            "==",
            eventId
          )
          .get();

      const participationMap = {};

      participationSnapshot.docs.forEach(
        (doc) => {
          const data = doc.data();

          participationMap[
            data.registrationId
          ] = {
            id: doc.id,
            ...data
          };
        }
      );

      /*
        COMBINE BOTH DATASETS
      */

      const students =
        registrationSnapshot.docs.map(
          (doc) => {
            const registration =
              doc.data();

            const participation =
              participationMap[
                doc.id
              ];

            return {
              registrationId: doc.id,

              eventId:
                registration.eventId,

              name:
                registration.name ||
                "Unknown",

              email:
                registration.email ||
                "",

              phone:
                registration.phone ||
                "",

              college:
                registration.college ||
                "",

              registeredAt:
                registration.submittedAt ||
                null,

              attendance:
                participation?.status ||
                "pending",

              participationId:
                participation?.id ||
                null
            };
          }
        );

      res.json({
        success: true,
        students
      });
    } catch (error) {
      console.error(
        "Participation fetch error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/*
MARK ATTENDANCE
*/
app.post(
  "/api/participation",
  requireAdmin,
  async (req, res) => {
    try {
      const {
        registrationId,
        eventId,
        status
      } = req.body;

      if (
        !registrationId ||
        !eventId ||
        !status
      ) {
        return res.status(400).json({
          success: false,
          message:
            "registrationId, eventId and status are required"
        });
      }

      const allowedStatuses = [
        "pending",
        "present",
        "absent"
      ];

      if (
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid attendance status"
        });
      }

      /*
        CHECK EXISTING PARTICIPATION
      */

      const existing =
        await db
          .collection("participation")
          .where(
            "registrationId",
            "==",
            registrationId
          )
          .where(
            "eventId",
            "==",
            eventId
          )
          .limit(1)
          .get();

      const participationData = {
        registrationId,
        eventId,
        status,
        updatedAt:
          new Date().toISOString()
      };

      let participationId;

      if (!existing.empty) {
        participationId =
          existing.docs[0].id;

        await db
          .collection("participation")
          .doc(participationId)
          .update(
            participationData
          );
      } else {
        const ref = db
          .collection("participation")
          .doc();

        await ref.set({
          ...participationData,
          createdAt:
            new Date().toISOString()
        });

        participationId = ref.id;
      }

      res.json({
        success: true,
        participationId,
        status
      });
    } catch (error) {
      console.error(
        "Save participation error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/* =========================================================
   ANALYTICS
========================================================= */

app.get(
  "/api/analytics",
  requireAdmin,
  async (req, res) => {
    try {
      const [
        eventsSnapshot,
        clubsSnapshot,
        registrationsSnapshot,
        participationSnapshot
      ] = await Promise.all([
        db.collection("events").get(),
        db.collection("clubs").get(),
        db.collection("registrations").get(),
        db.collection("participation").get()
      ]);

      const participation =
        participationSnapshot.docs.map(
          (doc) => doc.data()
        );

      const presentCount =
        participation.filter(
          (item) =>
            item.status === "present"
        ).length;

      const absentCount =
        participation.filter(
          (item) =>
            item.status === "absent"
        ).length;

      res.json({
        success: true,

        analytics: {
          totalEvents:
            eventsSnapshot.size,

          totalClubs:
            clubsSnapshot.size,

          totalRegistrations:
            registrationsSnapshot.size,

          totalParticipants:
            participation.length,

          presentCount,

          absentCount
        }
      });
    } catch (error) {
      console.error(
        "Analytics error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(
    `NexusCampus API running on port ${PORT}`
  );
});