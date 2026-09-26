import { auth } from "./firebase.js";

export async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const token = header.slice(7);
    const decoded = await auth.verifyIdToken(token);
    const allowed = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.length && !allowed.includes((decoded.email || "").toLowerCase())) {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired authentication token." });
  }
}
