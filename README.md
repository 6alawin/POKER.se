# README.md

# Poker.io

Web application for playing a **real-time multiplayer poker game** with 4–10 players and an auto-filling poker bot.

Developed for **SF221 Software Process**, Thammasat University.

**This project is made by 2nd-year Software Engineering students from Thammasat University, as an educational project covering frontend frameworks, backend development, API design, and bot logic — all in TypeScript.**

## Motivation

Real-time multiplayer systems are hard to get right — synchronizing state across many clients, handling disconnects, and keeping game logic consistent under concurrent actions are problems most course projects never touch. We chose a poker platform specifically because it forces us to confront all of these at once: strict turn-based rules, real-money-style pot math (including side pots), and a live multiplayer experience that has to feel instant. It's a small enough domain to finish in one semester, but deep enough to genuinely exercise the software process skills SF221 is built around.

## Learning Objectives

| Area | How this project covers it |
| --- | --- |
| **Software process** | Full Scrum cycle — sprint planning, daily standups, reviews, retrospectives across 8 sprints |
| **System design** | Client-server architecture combining REST (state) and WebSocket (real-time actions) |
| **Backend engineering** | API design, authentication, a stateful game engine running in server memory |
| **Concurrency & real-time systems** | Synchronizing game state across 4–10 concurrent players via Socket.io |
| **Data modeling** | Relational schema (PostgreSQL) for game history alongside Firebase for user data |
| **Algorithmic thinking** | Hand evaluation, side pot calculation, and Monte Carlo simulation for bot difficulty |

## Risks & Mitigation

| Risk | Mitigation |
| --- | --- |
| Poker engine (hand evaluation, side pots) is more complex than estimated | Isolated into its own sprint with WebSocket integration validated early via a real end-to-end hand |
| Real-time state gets out of sync across clients | Server is the single source of truth — client only renders state pushed to it, never computes game logic locally |
| Sprint before demo has no slack | Dedicated Hardening sprint (Week 9) with zero new features — bug fixing and rehearsal only |

---

## Midterm Milestone Feature

| Feature | Description |
| --- | --- |
| **Authentication** | Login/Register system with JWT-based session. |
| **Real-time Multiplayer** | Play poker with 4–10 friends in real time. |
| **Auto-add Bot** | Automatically fills empty seats with a rule-based bot when players are missing. |
| **Full Betting Logic** | Call, raise, fold, all-in, and side pot handling. |

## Final Milestone Feature

| Feature | Description |
| --- | --- |
| **Harder Bot** | Add adjustable bot difficulty levels. |
| **In-game Chat** | Text chat between players at the same table. |
| **Card/Table Skin** | Custom card and table skins/themes (stretch goal). |
| **Leaderboard / Stats** | Track win rate, biggest pot, etc. across games. |
| **Reconnect Support** | Allow a disconnected player to rejoin an ongoing hand instead of auto-folding. |
| **Mobile Responsive** | Responsive layout that adapts the game table and UI to mobile screen sizes. |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Monorepo** | Turborepo |
| **Frontend** | React.js + Tailwind CSS + axios |
| **Backend** | Express.js |
| **Real-time** | Socket.io |
| **Database** | PostgreSQL (game data) + Firebase (user data) |

## Architecture

Client (React)
                  │
      ┌───────────┴───────────┐
    REST                  WebSocket
      │                       │
      ▼                       ▼
    Server (Express.js + Socket.io)
                  │
                  ▼
            Poker Engine
    (deck, betting logic, bot)
                  │
      ┌───────────┴───────────┐
      ▼                       ▼
PostgreSQL              Firebase
(game data)            (user data)

- **Client → Server (REST)**: login, table list, history
- **Client → Server (WebSocket)**: real-time game actions (bet, fold, deal)
- **Poker Engine**: runs in server memory during an active hand
- **PostgreSQL**: stores hand results, chip balance history
- **Firebase**: stores user accounts / auth

---

## Sprint Plan (Scrum, 2-week sprints)

| Sprint | Week | Sprint Goal |
| --- | --- | --- |
| **1** | 1–2 | Repo, infra, and data layer are ready to build on |
| **2** | 3–4 | A user can register, log in, and create or join a table |
| **3** | 5–6 | Two players can play a full hand live over WebSocket |
| **4** | 7–8 | A full 4–10 player table plays correctly, bots included |
| **Hardening** | 9 | Build is stable and demo-ready — **Midterm demo** |
| **5** | 10–11 | Table feels alive and works on mobile |
| **6** | 12–13 | Players can drop and rejoin, progress is tracked |
| **7** | 14–15 | Bot difficulty is adjustable |
| **8** | 16 | Product is polished and deployed — **Final demo** |

Each sprint includes Sprint Planning, standups on Mon/Wed/Fri, a Sprint Review (working demo with feedback collected), and a Sprint Retrospective.

---

## Team

| Role | Name | Responsibility |
| --- | --- | --- |
| **Frontend** | Chafaaut Kholoasae | Game table UI, lobby, responsive layout |
| **Frontend** | Pornpipat Saekor | Auth UI, chat, leaderboard UI |
| **Backend / Infra** | Natcha Jaisean | Auth, DB schema, deployment, CI/CD |
| **Backend / Game Engine** | Salawin Samut | Poker engine, betting logic, bot, WebSocket integration |

---

## Getting Started

See [SETUP.md](SETUP.md) for local development setup instructions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
