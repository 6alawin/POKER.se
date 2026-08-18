# POKER.se

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
| Poker engine (hand evaluation, side pots) is more complex than estimated | Given a dedicated 3-week sprint (Sprint 3) with WebSocket integration validated early via a real end-to-end hand, instead of building the engine in isolation |
| Real-time state gets out of sync across clients | Server is the single source of truth — client only renders state pushed to it, never computes game logic locally |
| Sprint before demo has no slack | Dedicated Hardening sprint (Week 8) with zero new features — bug fixing and rehearsal only |

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
## Database Design

The database is designed around the idea that an active poker hand is fast-moving and should be controlled by the server, while important long-term records should be persisted for history, statistics, and reconnect support.

See the full visual diagram here: [ERD](ERD.svg)

### Data Storage Responsibilities

| Storage | Responsibility |
| --- | --- |
| **Firebase** | User authentication, login provider data, and account identity. |
| **PostgreSQL** | Poker-specific data such as tables, room members, game results, player statistics, and cosmetic selections. |
| **Server memory** | Current hand state, deck order, turn state, community cards, current bets, and temporary bot decisions during an active hand. |

### Main Entities

| Entity | Purpose | Important fields |
| --- | --- | --- |
| **Users** | Stores the application profile linked to Firebase auth. | `uid`, `email`, `username`, `current_stack`, `created_at` |
| **Tables** | Represents a poker table/lobby that players can join before a game starts. | `table_id`, `name`, `asset_url` |
| **Games** | Stores one playable poker session created from a table. | `game_id`, `host_id`, `status`, `max_player`, `current_player`, `created_at` |
| **Room_Player** | Join table between users and games; tracks each seat in a room. | `PK_id`, `uid`, `seat_number`, `is_bot`, `chip_stack`, `joined_at` |
| **Game_Result** | Stores the final outcome of a completed game for history and stats. | `game_id`, `winner_id`, `status`, `max_player`, `current_player`, `created_at` |
| **Card_Skins** | Stores card theme choices available to players. | `skin_id`, `name`, `asset_url` |
| **Table_Skins** | Stores table/background theme choices available to players. | `skin_id`, `name`, `asset_url` |

### Relationships

- One **User** can host many **Games** through `Games.host_id`.
- One **Game** can have many **Room_Player** records, one for each human player or bot seat.
- One **User** can appear in many **Room_Player** records across different games.
- One **Game_Result** belongs to one completed **Game** and references the winning **User** through `winner_id`.
- Skin tables are separated from game history so cosmetic assets can be reused without duplicating image URLs in every game record.

### Design Notes

- The server is the single source of truth for live gameplay. Clients send actions such as call, raise, fold, or all-in; the server validates them and broadcasts the updated state through Socket.io.
- PostgreSQL stores only durable data. This keeps the schema clean and avoids writing every small in-hand change, such as each card dealt or each temporary bet, unless it is needed for final history.
- `Room_Player.is_bot` allows the same seat model to support both real players and auto-filled bots, which keeps game setup logic simple.
- `chip_stack` in `Room_Player` represents chips inside a specific game, while `Users.current_stack` can be used for the player's longer-term balance.
- `status` fields make it possible to separate waiting, active, completed, and cancelled games without deleting records.

## Architecture

```
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
  PostgreSQL               Firebase
  (game data)             (user data)
```

- **Client → Server (REST)**: login, table list, history
- **Client → Server (WebSocket)**: real-time game actions (bet, fold, deal)
- **Poker Engine**: runs in server memory during an active hand
- **PostgreSQL**: stores hand results, chip balance history
- **Firebase**: stores user accounts / auth

---

## Sprint Plan (Scrum)

| Sprint | Week | Sprint Goal |
| --- | --- | --- |
| **1** | 1 | Repo, infra, and data layer are ready to build on |
| **2** | 2 | A user can register, log in, and create or join a table |
| **3** | 3–5 | Two players can play a full hand live over WebSocket |
| **4** | 6–7 | A full 4–10 player table plays correctly, bots included |
| **Hardening** | 8 | Build is stable and demo-ready — **Midterm demo** |
| **5** | 9–10 | Table feels alive and works on mobile |
| **6** | 11–12 | Players can drop and rejoin, progress is tracked |
| **7** | 13–14 | Bot difficulty is adjustable |
| **8** | 15–16 | Product is polished and deployed — **Final demo** |

Each sprint includes Sprint Planning, standups on Mon/Wed/Fri, a Sprint Review (working demo with feedback collected), and a Sprint Retrospective.

---

## Team

| Role                      | Name               |
| ------------------------- | ------------------ | 
| **Frontend**              | Chafaaut Kholoasae | 
| **Frontend**              | Pornpipat Saekor   |
| **Backend / Infra**       | Natcha Jaisean     |
| **Full Stack** | Salawin Samut      |

---

## Getting Started

See [SETUP.md](SETUP.md) for local development setup instructions.

---
