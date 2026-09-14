import { Deck, type Card } from '../engine/deck';

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type GamePlayer = {
  id: string; name: string; avatar: string; chips: number; holeCards: Card[];
  currentBet: number; isFolded: boolean; isBot: boolean; isAllIn: boolean; lastAction: string;
};

export type GameState = {
  players: GamePlayer[]; communityCards: Card[]; pot: number; currentBet: number;
  phase: GamePhase; currentPlayerIndex: number; dealerIndex: number; smallBlindAmount: number;
  handNumber: number; resultMessage: string;
};

export class ServerPokerGame {
  private deck = new Deck();
  private acted = new Set<string>();
  private state: GameState;

  constructor(players: Omit<GamePlayer, 'holeCards' | 'currentBet' | 'isFolded' | 'isAllIn' | 'lastAction'>[], smallBlind = 10) {
    this.state = {
      players: players.map((player) => ({ ...player, holeCards: [], currentBet: 0, isFolded: false, isAllIn: false, lastAction: '' })),
      communityCards: [], pot: 0, currentBet: 0, phase: 'preflop', currentPlayerIndex: 0, dealerIndex: -1,
      smallBlindAmount: smallBlind, handNumber: 0, resultMessage: '',
    };
  }

  getState(): GameState { return structuredClone(this.state); }
  startHand(): GameState {
    this.deck = new Deck(); this.acted.clear();
    this.state.communityCards = []; this.state.pot = 0; this.state.currentBet = 0;
    this.state.phase = 'preflop'; this.state.resultMessage = ''; this.state.handNumber += 1;
    for (const player of this.state.players) {
      if (player.chips <= 0) player.chips = 1000;
      player.holeCards = this.deck.draw(2); player.currentBet = 0; player.isFolded = false; player.isAllIn = false; player.lastAction = '';
    }
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length;
    const sb = this.state.players.length === 2 ? this.state.dealerIndex : (this.state.dealerIndex + 1) % this.state.players.length;
    const bb = this.state.players.length === 2 ? (this.state.dealerIndex + 1) % this.state.players.length : (this.state.dealerIndex + 2) % this.state.players.length;
    this.postBlind(sb, this.state.smallBlindAmount, 'SMALL BLIND'); this.postBlind(bb, this.state.smallBlindAmount * 2, 'BIG BLIND');
    this.state.currentBet = Math.max(...this.state.players.map((p) => p.currentBet));
    this.state.currentPlayerIndex = this.nextIndex(bb); return this.getState();
  }

  act(playerId: string, action: 'fold' | 'check' | 'raise', amount = this.state.smallBlindAmount * 2): GameState {
    const player = this.state.players[this.state.currentPlayerIndex];
    if (!player || player.id !== playerId || player.isFolded || player.isAllIn || this.state.phase === 'showdown') return this.getState();
    if (action === 'fold') { player.isFolded = true; player.lastAction = 'FOLD'; }
    else if (action === 'raise') {
      const target = Math.max(this.state.currentBet + this.state.smallBlindAmount * 2, this.state.currentBet + Math.max(0, amount));
      const delta = Math.min(player.chips, target - player.currentBet);
      player.chips -= delta; player.currentBet += delta; this.state.pot += delta; this.state.currentBet = Math.max(this.state.currentBet, player.currentBet);
      player.lastAction = player.chips === 0 ? 'ALL IN' : 'RAISE'; if (player.chips === 0) player.isAllIn = true;
    } else {
      const delta = Math.min(player.chips, Math.max(0, this.state.currentBet - player.currentBet));
      player.chips -= delta; player.currentBet += delta; this.state.pot += delta; player.lastAction = delta ? 'CALL' : 'CHECK'; if (player.chips === 0) player.isAllIn = true;
    }
    this.acted.add(player.id);
    if (this.shouldAdvanceRound()) this.advanceRound(); else this.state.currentPlayerIndex = this.nextIndex(this.state.currentPlayerIndex);
    return this.getState();
  }

  private postBlind(index: number, amount: number, label: string) { const p = this.state.players[index]; const paid = Math.min(p.chips, amount); p.chips -= paid; p.currentBet = paid; p.lastAction = label; this.state.pot += paid; }
  private nextIndex(from: number): number { for (let i = 1; i <= this.state.players.length; i += 1) { const index = (from + i) % this.state.players.length; const p = this.state.players[index]; if (!p.isFolded && !p.isAllIn) return index; } return from; }
  private shouldAdvanceRound(): boolean { const active = this.state.players.filter((p) => !p.isFolded && !p.isAllIn); return active.length <= 1 || active.every((p) => this.acted.has(p.id) && p.currentBet === this.state.currentBet); }
  private advanceRound() {
    this.acted.clear(); this.state.players.forEach((p) => { p.currentBet = 0; p.lastAction = ''; }); this.state.currentBet = 0;
    if (this.state.phase === 'preflop') { this.state.communityCards = this.deck.draw(3); this.state.phase = 'flop'; }
    else if (this.state.phase === 'flop') { this.state.communityCards.push(...this.deck.draw(1)); this.state.phase = 'turn'; }
    else if (this.state.phase === 'turn') { this.state.communityCards.push(...this.deck.draw(1)); this.state.phase = 'river'; }
    else { this.state.phase = 'showdown'; this.state.resultMessage = 'SHOWDOWN'; return; }
    this.state.currentPlayerIndex = this.nextIndex(this.state.dealerIndex);
  }
}
