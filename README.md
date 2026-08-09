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
| **Frontend** | React.js + Tailwind CSS |
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
