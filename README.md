# Poker.io

Web application for playing a **real-time multiplayer poker game** with 4–10 players and an auto-filling poker bot.

Developed for **SF221 Software Process**, Thammasat University.

**This project is made by 2nd-year Software Engineering students from Thammasat University, as an educational project covering frontend frameworks, backend development, API design, and bot logic — all in TypeScript.**

---

## Midterm Milestone Feature

| Feature | Description |
| --- | --- |
| **Authentication** | Login/Register system with JWT-based session. |
| **Real-time Multiplayer** | Play poker with 4–10 friends in real time. |
| **Auto-add Bot** | Automatically fills empty seats with a rule-based bot when players are missing. |
| **Full Betting Logic** | Call, raise, fold, all-in, and side pot handling. |
| **In-game Chat** | Text chat between players at the same table. |

---

## Final Milestone Feature

| Feature | Description |
| --- | --- |
| **AI Bot** | Add adjustable bot difficulty levels. |
| **Card/Table Skin** | Custom card and table skins/themes. |
| **Leaderboard / Stats** | Track win rate, biggest pot, etc. across games. |
| **Reconnect Support** | Allow a disconnected player to rejoin an ongoing hand instead of auto-folding. |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React.js + Tailwind CSS + axios |
| **Backend** | Express.js |
| **Real-time** | Socket.io |
| **Database** | PostgreSQL (game data) + Firebase (user data) |

---

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
    PostgreSQL              Firebase
    (game data)            (user data)
```

- **Client → Server (REST)**: login, table list, history
- **Client → Server (WebSocket)**: real-time game actions (bet, fold, deal)
- **Poker Engine**: runs in server memory during an active hand
- **PostgreSQL**: stores hand results, chip balance history
- **Firebase**: stores user accounts / auth

---

## Sprint Plan

| Week | Goal |
| --- | --- |
| 1 | Project setup — repo structure, React + Express scaffolding, DB schema design |
| 2 | Authentication (Register/Login, JWT) |
| 3 | Table/Lobby system — create & join table (REST CRUD) |
| 4 | Poker engine — deck, shuffle, hand-evaluator |
| 5 | Poker engine — betting logic (call/raise/fold, side pot) |
| 6 | Rule-based Bot logic + Auto-add Bot for empty seats |
| 7 | WebSocket integration — connect engine to real-time gameplay |
| 8 | Testing, bug fixing, **Midterm demo** |
| 9 | Frontend UI — full game table (cards, pot, action buttons) |
| 10 | In-game Chat |
| 11 | Reconnect support (rejoin ongoing hand after disconnect) |
| 12 | Leaderboard / Stats tracking |
| 13 | Bot upgrade — adjustable AI difficulty |
| 14 | Card/Table skins |
| 15 | Testing, bug fixing, polish |
| 16 | Final testing, deployment, **Final demo** |

## Team

| Role | Name |
| --- | --- |
| **Frontend** | Chafaaut Kholoasae |
| **Frontend** | Pornpipat Saekor |
| **Backend / Infra** | Natcha Jaisean |
| **Backend / Game Logic** | Salawin Samut |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
