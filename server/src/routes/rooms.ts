import { Router } from "express";
import crypto from "crypto";
import type { Server } from "socket.io";
import pool from "../db";

const VALID_MAX_PLAYERS = new Set([2, 6, 9]);
const createRoomCode = () => crypto.randomInt(1000, 10000).toString();

type RoomUpdatedEvent = {
  tableId: string;
  reason: "player-joined" | "game-started";
};

export function createRoomsRouter(io: Server) {
  const router = Router();

router.post('/:tableId/start', async (req, res) => {
  const { tableId } = req.params
  const { uid } = req.body as { uid?: string }

  if (!uid) {
    return res.status(400).json({ message: 'uid is required' })
  }

  try {
    const result = await pool.query(
      `UPDATE game_room
       SET status = 'active'
       WHERE table_id = $1
         AND host_id = $2
         AND status = 'waiting'
       RETURNING table_id, host_id, status, max_player, current_player`,
      [tableId, uid],
    )

    if (result.rowCount === 0) {
      return res.status(403).json({
        message: 'Only the host can start a waiting room.',
      })
    }

    const room = result.rows[0]

    const event: RoomUpdatedEvent = { tableId, reason: "game-started" };
    io.to(`room:${tableId}`).emit("room:updated", event);

    return res.json({ message: 'Game started', room })
  } catch (error) {
    console.error('Start room error:', error)
    return res.status(500).json({ message: 'Unable to start the game.' })
  }
})








  router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
      const { uid, maxPlayers = 2 } = req.body as { uid?: unknown; maxPlayers?: unknown };
      if (typeof uid !== "string" || !uid) return res.status(400).json({ message: "uid is required" });
      if (typeof maxPlayers !== "number" || !VALID_MAX_PLAYERS.has(maxPlayers)) return res.status(400).json({ message: "maxPlayers must be 2, 6, or 9" });
      const user = await client.query('SELECT uid FROM "user" WHERE uid = $1', [uid]);
      if (user.rowCount === 0) return res.status(404).json({ message: "User not found" });

      let tableId = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = createRoomCode();
        const exists = await client.query("SELECT 1 FROM game_room WHERE table_id = $1", [candidate]);
        if (exists.rowCount === 0) { tableId = candidate; break; }
      }
      if (!tableId) return res.status(503).json({ message: "Could not generate a room code. Please try again." });

      await client.query("BEGIN");
      await client.query(`INSERT INTO game_room (table_id, host_id, status, max_player, current_player, created_at) VALUES ($1, $2, 'waiting', $3, 1, NOW())`, [tableId, uid, maxPlayers]);
      await client.query(`INSERT INTO roomplayer (table_id, pk_fk, uid, seat_number, is_bot, chip_stack, joined_at) VALUES ($1, $2, $3, 1, false, 1000, NOW())`, [tableId, `${tableId}_${uid}`, uid]);
      await client.query("COMMIT");

      const room = { tableId, hostId: uid, status: "waiting", maxPlayer: maxPlayers, currentPlayer: 1 };
      return res.status(201).json({ message: "Room created successfully", room });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("Create room error:", error);
      return res.status(500).json({ message: "Failed to create room" });
    } finally { client.release(); }
  });

  router.post("/:tableId/join", async (req, res) => {
    const client = await pool.connect();
    try {
      const { tableId } = req.params;
      const { uid } = req.body as { uid?: unknown };
      if (!/^\d{4}$/.test(tableId)) return res.status(400).json({ message: "Room code must be 4 digits" });
      if (typeof uid !== "string" || !uid) return res.status(400).json({ message: "uid is required" });
      await client.query("BEGIN");
      const roomResult = await client.query("SELECT * FROM game_room WHERE table_id = $1 FOR UPDATE", [tableId]);
      if (roomResult.rowCount === 0) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Room not found" }); }
      const room = roomResult.rows[0];
      if (room.status !== "waiting") { await client.query("ROLLBACK"); return res.status(400).json({ message: "This game has already started" }); }
      const existing = await client.query("SELECT seat_number FROM roomplayer WHERE table_id = $1 AND uid = $2", [tableId, uid]);
      if (existing.rowCount) { await client.query("COMMIT"); return res.json({ message: "Already in this room", room: { tableId, seatNumber: existing.rows[0].seat_number, currentPlayer: room.current_player, maxPlayer: room.max_player } }); }
      if (room.current_player >= room.max_player) { await client.query("ROLLBACK"); return res.status(400).json({ message: "Room is full" }); }

      const seats = await client.query("SELECT seat_number FROM roomplayer WHERE table_id = $1 ORDER BY seat_number", [tableId]);
      const usedSeats = new Set(seats.rows.map((row) => row.seat_number));
      let seatNumber = 1; while (usedSeats.has(seatNumber)) seatNumber += 1;
      await client.query(`INSERT INTO roomplayer (table_id, pk_fk, uid, seat_number, is_bot, chip_stack, joined_at) VALUES ($1, $2, $3, $4, false, 1000, NOW())`, [tableId, `${tableId}_${uid}`, uid, seatNumber]);
      const currentPlayer = Number(room.current_player) + 1;
      await client.query("UPDATE game_room SET current_player = $1 WHERE table_id = $2", [currentPlayer, tableId]);
      await client.query("COMMIT");
      const updatedRoom = { tableId, hostId: room.host_id, status: room.status, currentPlayer, maxPlayer: room.max_player };
      const event: RoomUpdatedEvent = { tableId, reason: "player-joined" };
      io.to(`room:${tableId}`).emit("room:updated", event);
      return res.json({ message: "Joined room successfully", room: { ...updatedRoom, seatNumber } });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("Join room error:", error);
      return res.status(500).json({ message: "Failed to join room" });
    } finally { client.release(); }
  });

  router.get("/:tableId", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT r.table_id, r.host_id, r.status, r.max_player, r.current_player,
          COALESCE(json_agg(json_build_object('uid', p.uid, 'username', u.username, 'pictureId', u.picture_id, 'seatNumber', p.seat_number) ORDER BY p.seat_number) FILTER (WHERE p.uid IS NOT NULL), '[]') AS players
         FROM game_room r LEFT JOIN roomplayer p ON p.table_id = r.table_id LEFT JOIN "user" u ON u.uid = p.uid WHERE r.table_id = $1 GROUP BY r.table_id`,
        [req.params.tableId],
      );
      if (result.rowCount === 0) return res.status(404).json({ message: "Room not found" });
      const room = result.rows[0];
      return res.json({ room: { tableId: room.table_id, hostId: room.host_id, status: room.status, maxPlayer: room.max_player, currentPlayer: room.current_player, players: room.players } });
    } catch (error) { console.error("Get room error:", error); return res.status(500).json({ message: "Failed to load room" }); }
  });
  return router;
}
