# Product Requirements Document (PRD) — City Pulse

**Product Name:** City Pulse  
**Document Owner:** City Pulse Engineering & Product Team  
**Status:** Approved / Active  
**Version:** 1.0.0  
**Target Audience:** Event Explorers, Local Community Hosts, Tech Professionals, and Event Organizers  

---

## 1. Product Overview & Vision Statement

### 1.1 Problem Statement
Finding meaningful local events (tech summits, concerts, networking mixers, and workshops) often requires searching across disjointed platforms with fragmented ticket tracking, cumbersome host management tools, and lack of intelligent event schedule creation.

### 1.2 Product Vision
**City Pulse** is a modern, full-stack event discovery, registration, and hosting platform. It empowers users to instantly discover curated city events, reserve digital ticket passes, and host their own events backed by automated roster management and AI-driven agenda generation.

---

## 2. Target User Personas

| Persona | Role | Primary Goals | Key Pain Points |
|---|---|---|---|
| **Alex Chen** *(28, Tech Professional)* | **Event Explorer / Attendee** | Easily find relevant tech mixers and workshops in his city; get an instant digital pass without complex checkout flows. | Hard to filter events by specific tech categories and tags; losing track of registered tickets. |
| **Sarah Jenkins** *(34, Community Lead)* | **Event Host / Organizer** | Host local community meetups; track attendee RSVPs; export attendee rosters for check-in; generate event itineraries quickly. | Time-consuming agenda drafting; lack of CSV export tools for attendee lists on simple event platforms. |

---

## 3. Functional Requirements (FRs)

### FR-1: Event Discovery & Multi-Facet Filtering
- **FR-1.1 City Selection**: Users can filter events by major cities (e.g., San Francisco, New York, Austin, London, Tokyo) via city chips.
- **FR-1.2 Category & Tag Filtering**: Users can filter by categories (Tech, Music, Food, Networking, Arts) and interactive tag pills (e.g., `#AI`, `#React`, `#Concert`, `#Web3`).
- **FR-1.3 Real-Time Search**: Instant keyword search across event titles, descriptions, and location names.

### FR-2: Digital Ticket Reservation & Pass Generation
- **FR-2.1 Instant Registration**: Single-click registration for free and paid events.
- **FR-2.2 Capacity & Seat Tracking**: Automatic real-time seat availability decrementing (`seatsLeft` / `maxSeats`). Prevent registration when fully booked.
- **FR-2.3 Ticket Pass Generation**: Issuance of a unique ticket code (`TKT-CITY-XXXXX`) and visual QR payload displayed in a modal pass.

### FR-3: User Authentication & Profile Management
- **FR-3.1 Auth Operations**: User account creation (Register) and login using encrypted credentials.
- **FR-3.2 Profile Onboarding & Edit**: Customization of user profile attributes including display name, city location, occupation, bio, and avatar photo.

### FR-4: Event Hosting & Host Dashboard
- **FR-4.1 Host Event Creation**: Modal workflow allowing hosts to define event title, description, category, date, time, pricing, max seat capacity, and custom tags.
- **FR-4.2 Host Management Dashboard**: Unified dashboard view displaying "My Ticket Passes" and "Hosted Events".
- **FR-4.3 Event Deletion**: Hosts can delete hosted events with automated attendee registration cleanup.

### FR-5: Attendee Roster & Data Export
- **FR-5.1 Roster Modal**: Hosts can view the live list of registered attendees for any of their hosted events.
- **FR-5.2 CSV Roster Export**: One-click download of attendee details (`Name`, `Email`, `Ticket Code`, `Registration Date`, `Status`) formatted as a CSV file.

### FR-6: AI Event Assistant (Powered by Google Gemini)
- **FR-6.1 Topic-to-Agenda Generation**: Hosts can provide an event topic prompt to generate structured agenda items (time slots and titles).
- **FR-6.2 Title & Description Suggestions**: AI recommendations for engaging event titles and descriptions.

---

## 4. Non-Functional Requirements (NFRs)

### NFR-1: Performance & Responsiveness
- Client SPA initial bundle load time < 1.5 seconds.
- Sub-100ms UI interaction latency for tag filtering and modal overlays.
- Vite build pre-bundling for optimized asset delivery.

### NFR-2: Security & Privacy
- Password hashing using `bcryptjs` with a minimum salt round factor of 10.
- Application layer HTTP security headers enforced via `helmet`.
- Rate limiting on public API endpoints (100 requests per 15 minutes per IP).
- CORS origin restriction matching production frontend domains.

### NFR-3: Reliability & System Resilience
- Non-blocking database initialization: server starts immediately while connecting to MongoDB in the background.
- Fallback in-memory datastore strategy to ensure continuous uptime even during primary database maintenance.

---

## 5. Success Metrics & Key Performance Indicators (KPIs)

1. **User Conversion Rate**: % of site visitors who complete an event registration ticket pass.
2. **Host Engagement Rate**: Number of events created per active host account.
3. **AI Utilization Rate**: % of newly hosted events utilizing the Gemini AI Assistant for agenda drafting.
4. **Platform Uptime**: > 99.9% uptime across API and frontend services.

---

## 6. Future Release Roadmap (v2.0)

- **Phase 1**: Email & SMS confirmation alerts with calendar file `.ics` attachments.
- **Phase 2**: Payment gateway integration (Stripe / Razorpay) for paid ticket sales.
- **Phase 3**: Geo-location based "Events Near Me" automatic detection.
