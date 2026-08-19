# High-Level Design (HLD) — City Pulse

This document presents the **High-Level Design (HLD)** specifications for **City Pulse**, detailing the system architecture, component breakdown, data workflows, and non-functional requirements.

---

## 1. Executive Summary & System Overview

**City Pulse** is a dual-tier web application built to streamline local event discovery, ticket reservation, and host event management. Users can explore city-specific tech summits, concerts, networking mixers, and workshops; register for events to receive instant digital ticket passes; and host events complete with attendee roster tracking and AI-driven event creation.

---

## 2. System Architecture Diagram

```mermaid
graph TD
    subgraph Client_Layer ["Client Tier (Frontend - Vercel / Vite)"]
        UI["React 19 SPA (React Router v7)"]
        State["Client State (User, Filters, Modals)"]
        UI --> State
    end

    subgraph Security_Layer ["Security & Routing Layer"]
        CORS["CORS Middleware"]
        Helmet["Helmet Security Headers"]
        RateLimiter["Express Rate Limiter"]
    end

    subgraph Server_Layer ["Application API Tier (Backend - Render / Express)"]
        App["Express.js Server (Port 5000)"]
        AuthRouter["Auth Router (/api/auth)"]
        EventRouter["Event Router (/api/events)"]
        TagRouter["Tag Router (/api/tags)"]
        AIRouter["AI Router (/api/ai)"]
        
        App --> CORS
        App --> Helmet
        App --> RateLimiter
        
        App --> AuthRouter
        App --> EventRouter
        App --> TagRouter
        App --> AIRouter
    end

    subgraph External_Services ["External Services"]
        Gemini["Google Gemini AI API"]
    end

    subgraph Data_Layer ["Persistence Tier (Database)"]
        Mongoose["Mongoose ORM Layer"]
        MongoDB[("MongoDB Atlas / Local MongoDB")]
        FallbackStore[("In-Memory Datastore Fallback")]
        
        Mongoose --> MongoDB
        Mongoose -.->|Connection Failure Fallback| FallbackStore
    end

    UI <-->|HTTP REST / JSON| App
    AIRouter <-->|HTTPS SDK| Gemini
    AuthRouter --> Mongoose
    EventRouter --> Mongoose
    TagRouter --> Mongoose
```

---

## 3. Core System Components

| Component | Technology | Primary Responsibility |
|---|---|---|
| **Frontend App** | React 19, Vite, React Router v7 | Renders interactive single-page UI, handles route navigation, client state, modal overlays, and visual effects (GSAP, OGL, CSS custom design system). |
| **API Server** | Node.js, Express.js 4 | Implements RESTful endpoints, request validation, business logic, authentication handling, and rate limiting. |
| **Database Tier** | MongoDB, Mongoose 9 | Stores persistent user credentials, profile attributes, event listings, tags, and attendee registrations. |
| **AI Integration** | Google Gemini API (`@google/genai`) | Generates structured event agendas, titles, descriptions, and schedule suggestions dynamically based on user prompts. |
| **Resilience Layer** | Dual Storage Strategy | Gracefully handles MongoDB connection availability with automatic retry and local/in-memory fallback data models. |

---

## 4. High-Level Data Flow & Primary User Workflows

```mermaid
sequenceDiagram
    autonumber
    actor User as End User
    participant FE as React Frontend
    participant API as Express API Server
    participant DB as MongoDB Database
    participant AI as Google Gemini API

    %% Event Explorer Flow
    Note over User, DB: 1. Event Discovery & Filtering
    User->>FE: Select City / Category / Search Query
    FE->>API: GET /api/events?city=San+Francisco&category=Tech
    API->>DB: Query EventCollection (indexed by city, category)
    DB-->>API: Return Matching Event Documents
    API-->>FE: HTTP 200 { success: true, data: [events] }
    FE-->>User: Render Event Grid & Dynamic Badges

    %% Event Registration Flow
    Note over User, DB: 2. Ticket Pass Registration
    User->>FE: Click "Register for Event"
    FE->>API: POST /api/events/:id/register
    API->>DB: Check Duplicate Registration & Available Seats
    API->>DB: Create Registration Record & Update Ticket Counter
    DB-->>API: Confirm Registration Document Saved
    API-->>FE: HTTP 201 { success: true, registration: { ticketCode, qrPayload } }
    FE-->>User: Render TicketPassModal with QR Code & Ticket Code

    %% AI Assistant Flow
    Note over User, AI: 3. AI Event Schedule Assistance
    User->>FE: Input Topic in AI Assistant Modal ("AI & Robotics Workshop")
    FE->>API: POST /api/ai/generate-schedule { topic: "AI & Robotics" }
    API->>AI: Send Prompt to Gemini Model
    AI-->>API: Return Structured Schedule & Titles
    API-->>FE: HTTP 200 { success: true, schedule: [...] }
    FE-->>User: Populate Create Event Form with AI Agenda
```

---

## 5. Non-Functional Requirements (NFRs)

- **Security & Integrity**:
  - Passwords hashed using `bcryptjs` (salt factor 10).
  - Production Security HTTP headers via `helmet`.
  - Rate limiting on public API routes via `express-rate-limit` (100 requests per 15 min per IP).
  - Strict CORS policy matching `CLIENT_URL` environment whitelist.
- **Performance & Optimization**:
  - Vite bundling with rolldown/oxc for ultra-fast HMR and small bundle footprint.
  - Client-side memoization and deferred image loading.
  - Indexed database queries on `city`, `category`, and `organizerId`.
- **Availability & Resilience**:
  - Non-blocking database connection strategy (server boots immediately; retries DB in background).
  - Graceful fallback datastore ensuring high availability even during DB maintenance.
