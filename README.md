# City Pulse

Discover and organise events happening around your city — tech summits, concerts,
networking mixers, and workshops. Browse by city or category, register with an
instant digital ticket pass, or host your own event in a couple of clicks.

A React (Vite) frontend talks to an Express + MongoDB (Mongoose) backend.

> 📄 **System Architecture & Product Docs**: 
> - 📋 [**Product Requirements Document (PRD)**](./PRD.md) — Product Vision, Personas, Functional & Non-Functional Requirements
> - 📐 [**High-Level Design (HLD)**](./HLD.md) — System Architecture, Component Layers, Data Flow & Sequence Diagrams
> - 🛠️ [**Low-Level Design (LLD)**](./LLD.md) — Database ER Schema, Module Breakdown, API Contracts & Core Algorithms

## Project structure

```
Client/     React 19 + Vite frontend
server/     Express + Mongoose backend API
PRD.md      Product Requirements Document
HLD.md      High-Level Design Document
LLD.md      Low-Level Design Document
render.yaml Render blueprint for deploying the backend
```

## Local development

Requires Node.js 20.19+ (or 22.12+) and a MongoDB connection (Atlas cluster or local `mongod`).

```bash
# from the repo root
npm run install:all      # installs root, Client, and server dependencies

# set up environment files
cp server/.env.example server/.env      # then fill in MONGO_URI etc.
cp Client/.env.example Client/.env.local

npm run dev               # runs client (5173) and server (5000) together
```

Visit `http://localhost:5173`. The client talks to `http://localhost:5000` by
default in development.

### Environment variables

**`server/.env`** (see `server/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string (Atlas or self-hosted). |
| `PORT` | No | Defaults to `5000`. |
| `NODE_ENV` | No | `development` or `production`. |
| `CLIENT_URL` | In production | Comma-separated frontend origins allowed to call the API. |
| `GEMINI_API_KEY` | For the AI Event Assistant | Google Gemini API key. |
| `LLM_PROVIDER` | No | Defaults to `gemini`. |

**`Client/.env.local`** (see `Client/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | In production | Base URL of the deployed backend, e.g. `https://city-pulse-api.onrender.com`. Defaults to `http://localhost:5000` in development; required in production. |

> **Security:** keep production credentials in Render/Vercel environment settings; never put them in client `VITE_*` variables. The application uses database-backed HttpOnly sessions, and password changes require the current password. If a credential was ever committed, rotate it even after removing it from Git history.
> Accounts require MongoDB. Passwords must be at least 12 characters; sessions use a 12-hour HttpOnly cookie. The `Admin` role is assigned in the database and cannot be chosen during signup. Set `CLIENT_URL` to the exact frontend origin (no trailing slash); never add API credentials to `Client/.env*` or `VITE_*` variables.

## Deploying

This app deploys as two independent services: the static frontend on **Vercel**
and the API on **Render**. Deploy the backend first so you have its URL for
the frontend's environment variable.

### 1. Backend — Render

1. Push this repo to GitHub/GitLab.
2. In Render: **New → Blueprint**, point it at the repo. Render will read
   `render.yaml` at the repo root and create a `city-pulse-api` web service
   with root directory `server`, `npm install` as the build command, `npm
   start` as the start command, and `/health` as the health check path. Set
   `MONGO_URI` and `CLIENT_URL` in the Render environment.
3. In the service's **Environment** tab, set:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `CLIENT_URL` — your Vercel frontend URL (add this after step 2 below;
     you can redeploy once you have it)
   - `GEMINI_API_KEY` — if you're using the AI Event Assistant
4. Deploy. Note the resulting URL, e.g. `https://city-pulse-api.onrender.com`.

### 2. Frontend — Vercel

1. In Vercel: **New Project**, import the same repo.
2. Set **Root Directory** to `Client`. Vercel will detect Vite automatically
   and use the `Client/vercel.json` in this repo for SPA routing/rewrites.
3. Add an environment variable: `VITE_API_URL` = your Render URL from above
   (no trailing slash).
4. Deploy. Note the resulting URL, e.g. `https://city-pulse.vercel.app`.
5. Go back to Render and set `CLIENT_URL` to that Vercel URL, then redeploy
   the backend so CORS allows requests from your live frontend.

### Verifying

- `GET https://<your-render-url>/health` should return `{"status":"ok",...}`.
- Opening the Vercel URL should load the app and successfully fetch events
  (check the browser console/network tab if not — it's almost always
  `VITE_API_URL` or `CLIENT_URL` being unset or mismatched).

## Tech stack

- **Frontend:** React 19, React Router, Vite, vanilla CSS (custom design
  system, no UI framework)
- **Backend:** Express 4, Mongoose 9 (MongoDB), bcryptjs, PostgreSQL (`pg`), Redis (`ioredis`)
- **AI feature:** Google Gemini, via `server/controllers/aiController.js`