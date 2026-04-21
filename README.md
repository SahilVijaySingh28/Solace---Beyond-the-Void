# 🌌 Solace — Beyond the Void

> *A cinematic, full-stack communication platform for secure memory archiving, real-time communication, and peer-to-peer calls. Built with a premium "Cyber-OS" aesthetic.*

---

## ✨ Overview

**Solace** is a production-grade web application that combines encrypted time capsules, real-time global chat, private messaging, WebRTC peer-to-peer video/voice calling, and an AI-powered Oracle guardian — all wrapped in a breathtaking holographic glass interface.

---

## 🚀 Live Platform

> [![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-brightgreen?style=for-the-badge&logo=vercel)](https://solace-beyond-the-void.vercel.app/)


---

## 🧠 Core Features

| Feature | Description |
|---|---|
| 🗄️ **Memory Archive** | Create time-locked capsules that unlock at a specific date/time. Supports public, private (recipient-targeted), and AES-GCM encrypted vaults. |
| 🔐 **Void Vault** | Client-side AES-GCM 256-bit encryption. Messages are encrypted in the browser before reaching the database — only you hold the key. |
| 🌐 **Global Lobby** | Real-time public broadcast channel with live typing indicators and message history. |
| 💬 **Private Messaging** | End-to-end direct messages between travelers. Powered by Supabase Realtime. |
| 📡 **Pulse Network** | See all connected travelers with live breathing status indicators. Click any profile to initiate a call, message, or send a capsule. |
| 📞 **Quantum Tether** | Peer-to-peer WebRTC voice and video calling. No servers in the middle — direct device-to-device connection. |
| 🤖 **Oracle Link** | A procedural AI guardian that responds to queries with context-aware answers (traveler count, archive density, time-of-day). Includes a typewriter materialization effect. |
| 🕰️ **Tether History** | Persistent call log tracking all past voice and video connections. |
| 🎨 **Holographic UI** | Mouse-tracking radial glow physics, glassmorphism panels, breathing status animations, and cinematic scanline sweeps. |
| 📱 **Fully Responsive** | Adapts from 4K monitors to mobile portrait mode. Sidebar collapses to a sticky bottom navigation on phones. |

---

## 🏗️ Project Architecture

```
src/
├── assets/
│   └── logo.png                  # Solace brand icon
│
├── utils/                        # Pure logic — no React dependencies
│   ├── crypto.js                 # PBKDF2 key derivation + AES-GCM 256-bit encryption
│   └── formatters.js             # Date, time, and countdown formatting helpers
│
├── hooks/                        # Reusable React custom hooks
│   ├── useOracle.js              # Oracle sentience engine + typewriter effect
│   └── useQuantumTether.js       # Full WebRTC lifecycle + Always-On signaling
│
├── lib/
│   └── supabase.js               # Supabase client initialization
│
├── components/
│   ├── Auth.jsx                  # Login / Sign-up gateway
│   └── Dashboard.jsx             # Main platform orchestrator
│
├── AuthContext.jsx                # Global user session context provider
├── App.jsx                       # Root component with route guard
├── main.jsx                      # Application entry point
└── index.css                     # Complete design system + responsive breakpoints
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Framework** | React | ^19.2.4 |
| **Build Tool** | Vite | ^8.0.4 |
| **Backend / Database** | Supabase (PostgreSQL + Realtime) | ^2.103.0 |
| **Animations** | Framer Motion | ^12.38.0 |
| **Icons** | Lucide React | ^1.8.0 |
| **Calling** | WebRTC (native browser API) | — |
| **Encryption** | Web Crypto API (AES-GCM 256-bit) | — |
| **Deployment** | Vercel | — |
| **Styling** | Vanilla CSS (design tokens + responsive) | — |

---

## 🗄️ Database Schema

All tables are in the `public` schema with **Row Level Security (RLS)** enforced.

| Table | Purpose |
|---|---|
| `profiles` | Stores user identity (username, full name, bio). Auto-created on sign-up via trigger. |
| `capsules` | Time-locked memory capsules. Supports optional encryption and recipient targeting. |
| `messages` | Global Lobby broadcast messages. |
| `direct_messages` | Private 1-on-1 messages between users. |
| `call_logs` | Persistent log of all voice and video call events. |

### Supabase Setup Checklist

1. Run `SCHEMA.sql` in the **Supabase SQL Editor** to create all tables, policies, and triggers.
2. Enable **Realtime** for `messages`, `direct_messages`, and `profiles` in **Database → Replication**.
3. Create a **Storage Bucket** named `capsules` (or run the script — it creates it automatically).

---

## ⚙️ Local Development

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/solace.git
cd solace
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up the Database
- Open your Supabase project → **SQL Editor**
- Copy and run the contents of `SCHEMA.sql`

### 4. Start the Dev Server
```bash
npm run dev
```
The platform will be live at `http://localhost:5173`

### Available Scripts
```bash
npm run dev      # Start development server with HMR
npm run build    # Build production bundle to /dist
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint checks
```

---

## 🚀 Deployment

Solace is optimized for **one-click Vercel deployment**.

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: Solace — initial deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel will auto-detect the Vite framework

3. **Add Environment Variables**
   In Vercel project settings → **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL       → https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY  → your-anon-key-here
   ```

4. **Deploy** — Vercel handles the rest. The `vercel.json` config ensures SPA routing works correctly for all paths.

---

## 🐳 Docker Support

Solace includes a production-ready, multi-stage Docker setup using Node for building and NGINX for ultra-fast asset serving. The NGINX configuration automatically handles SPA Fallback routing.

### 1. Build the Image
```bash
docker build -t solace-app .
```

### 2. Run the Container
```bash
docker run -p 8080:80 -d solace-app
```

The application will be live at `http://localhost:8080`.

> **Note on Environment Variables:** 
> Your local `.env` file is intentionally read during the Docker build process. Vite requires your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at *build time* to compile the static frontend assets. Ensure your `.env` file is fully populated before executing `docker build`.

---

## 🔐 Security Architecture

- **Client-Side Encryption**: The Void Vault uses `PBKDF2` (100,000 iterations, SHA-256) for key derivation and `AES-GCM 256-bit` for encryption. All cryptographic operations happen in the browser via the native **Web Crypto API**. The plaintext content **never reaches the server**.
- **Row Level Security**: Every Supabase table has RLS policies enforced at the database level. Users can only read/write their own data.
- **WebRTC**: Peer connections are negotiated via STUN (Google's public server) and established directly between browsers — no media passes through a relay server.
- **Environment Variables**: Supabase keys are stored as `VITE_` prefixed env vars and are never hardcoded.

---

## 📱 Responsive Breakpoints

| Breakpoint | Screen Size | Layout |
|---|---|---|
| Default | > 1280px | Full sidebar + content |
| Small Desktop | ≤ 1280px | Compact sidebar (260px) |
| Tablet | ≤ 1024px | Narrow sidebar (220px), stacked headers |
| Mobile | ≤ 768px | Sticky bottom navigation bar |
| Small Mobile | ≤ 480px | Icon-only bottom bar, single-column grids |
| Landscape | height ≤ 500px | Slim vertical icon rail |

---

## 🤖 Oracle Commands

Type any of these into the Oracle terminal:

| Command | Response |
|---|---|
| `guide` | Full platform manual with all feature walkthroughs |
| `status` | Live platform metrics (traveler count, archive density, sync health) |
| `who are you` | The Oracle's identity and purpose |
| `hello` / `hi` | Personalized greeting with link status |
| *Any other query* | Procedural mystical response from the sentience engine |

---

## 📄 License

This project is private and built for personal/academic use. All rights reserved.

---

> *"The void is not empty — it is waiting to be filled."*
