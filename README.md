# NexusCampus — Complete React + Node + Firebase Project

This version covers the planned Steps 1–12:

1. Admin dashboard foundation
2. Event management
3. Dynamic registration form builder
4. Public dynamic registration page
5. Registration API + Firestore
6. Confirmation email through SMTP/Nodemailer
7. Admin registration management + CSV export
8. Dashboard analytics
9. Clubs module
10. Participation module
11. Firebase Email/Password authentication
12. Search, filters, capacity checks, duplicate prevention, responsive UI, status handling and error states

## Stack
- React + Vite
- Node.js + Express
- Firebase Authentication
- Cloud Firestore
- Nodemailer / SMTP

## 1. Firebase
Create/keep your Firebase project and enable:
- Authentication → Email/Password
- Firestore Database

Download the Firebase Admin SDK service-account JSON and place it at:

`server/serviceAccountKey.json`

Never commit that file.

## 2. Client environment
Copy `client/.env.example` to `client/.env` and fill in your Firebase Web App configuration.

For the existing project values, keep:

`VITE_API_URL=http://localhost:5001/api`

## 3. Server environment
Copy `server/.env.example` to `server/.env`.

Set `ADMIN_EMAILS` to the email address(es) allowed to access the admin APIs, separated by commas.

SMTP is optional for local development. If SMTP is not configured, registrations still save successfully and the email status becomes `not_configured`.

For Gmail, use a Google App Password rather than your normal account password.

## 4. Install

Terminal 1:

```bash
cd server
npm install
npm run dev
```

Terminal 2:

```bash
cd client
npm install
npm run dev
```

Client: http://localhost:5173
Server: http://localhost:5001

## 5. Admin account
Create an Email/Password user in Firebase Authentication, then put that email in `server/.env`:

`ADMIN_EMAILS=your-email@gmail.com`

You can also create an account from the login screen, then add the same email to `ADMIN_EMAILS` and restart the server.

## 6. Public registration URL
After creating a registration form, its public URL is:

`http://localhost:5173/register/<form-slug>`

Example:

`http://localhost:5173/register/nexuscampus-hackathon-2026-registration`

## Firestore collections
- events
- forms
- registrations
- clubs
- participation

## Important production notes
- Move SMTP credentials to a secure secret manager in production.
- Add stricter Firestore indexes/rules if direct client access is later introduced.
- Consider a transactional reservation/counter strategy for very high-volume simultaneous registration.
- Add Firebase App Check and stronger role claims for production admin authorization.
