// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

setGlobalOptions({ region: "us-central1" });

admin.initializeApp();
const db = admin.firestore();

// Read env vars (v2): set in functions/.env or via secrets
const SENDGRID_KEY = process.env.SENDGRID_KEY;          // secret
const AGENT_EMAIL = process.env.APP_AGENT_EMAIL;        // can be env
const BRAND_NAME  = process.env.APP_BRAND_NAME || "Your Real Estate Team";

// Optional email (won't crash if not configured)
let sg = null;
let EMAIL_ENABLED = !!(SENDGRID_KEY && AGENT_EMAIL);
if (EMAIL_ENABLED) {
  try {
    sg = require("@sendgrid/mail");
    sg.setApiKey(SENDGRID_KEY);
  } catch (e) {
    console.error("SendGrid init failed; disabling email:", e);
    EMAIL_ENABLED = false;
  }
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get("/", (_req, res) => res.status(200).send("ok"));

const AUTO_REPLY =
  "Thanks for reaching out! We got your message and will follow up shortly. If you’d like, share your budget, bedrooms, and timeline so we can tailor suggestions.";

// POST /chat
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId, pageUrl, name, email, phone } = req.body || {};
    if (!message || !sessionId) {
      return res.status(400).json({ error: "message and sessionId are required" });
    }

    const lead = {
      source: "webchat",
      agentEmail: AGENT_EMAIL || null,
      name: name || null,
      email: email || null,
      phone: phone || null,
      message: String(message).slice(0, 4000),
      pageUrl: pageUrl || null,
      sessionId,
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("leads").add(lead);

    if (EMAIL_ENABLED) {
      const subject = `New Website Lead (${BRAND_NAME})`;
      const bodyLines = [
        `New website chat lead`,
        `— Time: ${new Date().toLocaleString()}`,
        `— Page: ${pageUrl || "(unknown)"}`,
        `— Name: ${lead.name || "(not provided)"}`,
        `— Email: ${lead.email || "(not provided)"}`,
        `— Phone: ${lead.phone || "(not provided)"}`,
        ``,
        `Message:`,
        `${lead.message}`,
        ``,
        `Lead ID: ${docRef.id}`,
      ];
      try {
        await sg.send({
          to: AGENT_EMAIL,
          from: { email: "no-reply@yourdomain.com", name: BRAND_NAME }, // must be a verified sender in SendGrid
          subject,
          text: bodyLines.join("\n"),
        });
      } catch (mailErr) {
        console.error("SendGrid send error (continuing without email):", mailErr);
      }
    } else {
      console.warn("EMAIL_DISABLED: missing SENDGRID_KEY or APP_AGENT_EMAIL; skipping email.");
    }

    return res.json({ ok: true, reply: AUTO_REPLY });
  } catch (e) {
    console.error("CHAT ERROR", e);
    return res.status(500).json({ error: "server_error" });
  }
});

exports.api = onRequest({ invoker: "public" }, app);
