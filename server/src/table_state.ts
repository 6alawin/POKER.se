import type { Server, Socket } from 'socket.io';
import pool from './db';

export const TURN_DURATION_MS = Number(process.env.TURN_DURATION_MS ?? 30_000);

export type TablePlayer = {
  uid: string;
  username: string | null;
  pictureId: string | null;
  seatNumber: number;
  connected: boolean;
  folded: boolean;
};

export type TableState = {
  tableId: string;
  status: string;
  maxPlayer: number;
  currentPlayer: number;
  players: TablePlayer[];
  currentTurnUid: string | null;
  turnStartedAt: number | null;
  turnDeadline: number | null;
  turnDurationMs: number;
};

type ActiveTable = {
  currentTurnUid: string | null;
  turnStartedAt: number | null;
  turnDeadline: number | null;
  foldedPlayerIds: Set<string>;
  timer?: NodeJS.Timeout;
};

const tables = new Map<string, ActiveTable>();
const playerSockets = new Map<string, Set<string>>();
const socketPlayers = new Map<string, { tableId: string; uid: string }>();

function getTable(tableId: string): ActiveTable {
  let table = tables.get(tableId);
  if (!table) {
    table = { currentTurnUid: null, turnStartedAt: null, turnDeadline: null, foldedPlayerIds: new Set() };
    tables.set(tableId, table);
  }
  return table;
}

function isConnected(tableId: string, uid: string): boolean {
  return [...(playerSockets.get(`${tableId}:${uid}`) ?? [])].length > 0;
}

async function getState(tableId: string): Promise<TableState | null> {
  const result = await pool.query(
    `SELECT r.table_id, r.status, r.max_player, r.current_player,
      COALESCE(json_agg(json_build_object('uid', p.uid, 'username', u.username, 'pictureId', u.picture_id, 'seatNumber', p.seat_number) ORDER BY p.seat_number) FILTER (WHERE p.uid IS NOT NULL), '[]') AS players
     FROM game_room r
     LEFT JOIN roomplayer p ON p.table_id = r.table_id
     LEFT JOIN "user" u ON u.uid = p.uid
     WHERE r.table_id = $1
     GROUP BY r.table_id`,
    [tableId],
  );
  if (!result.rowCount) return null;
  const room = result.rows[0];
  const table = getTable(tableId);
  const players = (room.players as Omit<TablePlayer, 'connected' | 'folded'>[]).map((player) => ({
    ...player,
    connected: isConnected(tableId, player.uid),
    folded: table.foldedPlayerIds.has(player.uid),
  }));
  return {
    tableId: room.table_id,
    status: room.status,
    maxPlayer: room.max_player,
    currentPlayer: room.current_player,
    players,
    currentTurnUid: table.currentTurnUid,
    turnStartedAt: table.turnStartedAt,
    turnDeadline: table.turnDeadline,
    turnDurationMs: TURN_DURATION_MS,
  };
}

function clearTurn(table: ActiveTable): void {
  if (table.timer) clearTimeout(table.timer);
  table.timer = undefined;
  table.currentTurnUid = null;
  table.turnStartedAt = null;
  table.turnDeadline = null;
}

async function advanceTurn(io: Server, tableId: string): Promise<void> {
  const state = await getState(tableId);
  if (!state || state.status !== 'active') return;
  const table = getTable(tableId);
  const eligible = state.players.filter((player) => !player.folded && player.connected);
  if (!eligible.length) return clearTurn(table);
  const currentIndex = state.currentTurnUid ? eligible.findIndex((player) => player.uid === state.currentTurnUid) : -1;
  const next = eligible[(currentIndex + 1) % eligible.length];
  clearTurn(table);
  table.currentTurnUid = next.uid;
  table.turnStartedAt = Date.now();
  table.turnDeadline = table.turnStartedAt + TURN_DURATION_MS;
  table.timer = setTimeout(() => void foldAndAdvance(io, tableId, next.uid), TURN_DURATION_MS);
  await broadcastTableState(io, tableId);
}

async function foldAndAdvance(io: Server, tableId: string, uid: string): Promise<void> {
  const table = getTable(tableId);
  if (table.currentTurnUid !== uid || table.foldedPlayerIds.has(uid)) return;
  table.foldedPlayerIds.add(uid);
  clearTurn(table);
  await broadcastTableState(io, tableId);
  await advanceTurn(io, tableId);
}

export async function broadcastTableState(io: Server, tableId: string): Promise<void> {
  const state = await getState(tableId);
  if (state) io.to(`room:${tableId}`).emit('table:state', state);
}

export async function startTable(io: Server, tableId: string): Promise<void> {
  const table = getTable(tableId);
  table.foldedPlayerIds.clear();
  await advanceTurn(io, tableId);
}

export async function subscribePlayer(io: Server, socket: Socket, tableId: string, uid?: string): Promise<void> {
  await socket.join(`room:${tableId}`);
  if (uid) {
    const membership = await pool.query('SELECT 1 FROM roomplayer WHERE table_id = $1 AND uid = $2', [tableId, uid]);
    if (membership.rowCount) {
      socketPlayers.set(socket.id, { tableId, uid });
      const key = `${tableId}:${uid}`;
      const sockets = playerSockets.get(key) ?? new Set<string>();
      sockets.add(socket.id);
      playerSockets.set(key, sockets);
    }
  }
  await broadcastTableState(io, tableId);
}

export async function disconnectPlayer(io: Server, socket: Socket): Promise<void> {
  const player = socketPlayers.get(socket.id);
  if (!player) return;
  socketPlayers.delete(socket.id);
  const key = `${player.tableId}:${player.uid}`;
  const sockets = playerSockets.get(key);
  sockets?.delete(socket.id);
  if (sockets?.size === 0) playerSockets.delete(key);
  const table = getTable(player.tableId);
  if (!isConnected(player.tableId, player.uid) && table.currentTurnUid === player.uid) await foldAndAdvance(io, player.tableId, player.uid);
  await broadcastTableState(io, player.tableId);
}

export async function leavePlayer(io: Server, socket: Socket): Promise<void> {
  await disconnectPlayer(io, socket);
}
