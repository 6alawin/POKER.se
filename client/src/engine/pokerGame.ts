import { Deck } from './deck'
import type { Card } from './deck'
import { evaluateHand } from './handevaluation'

export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export interface Player {
  id: string
  name: string
  avatar: string
  chips: number
  holeCards: Card[]
  currentBet: number
  isFolded: boolean
  isBot: boolean
  isAllIn: boolean
  lastAction: string
}

export class PokerGame {
  deck = new Deck()
  players: Player[] = []
  communityCards: Card[] = []
  pot = 0
  currentBet = 0
  phase: GamePhase = 'preflop'
  currentPlayerIndex = 0
  dealerIndex = -1
  smallBlindAmount = 10
  handNumber = 0
  resultMessage = ''
  onStateChange: () => void
  private actedPlayerIds = new Set<string>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private destroyed = false

  constructor(players: Omit<Player, 'holeCards' | 'currentBet' | 'isFolded' | 'isAllIn' | 'lastAction'>[], onStateChange: () => void, smallBlind = 10) {
    this.onStateChange = onStateChange
    this.smallBlindAmount = smallBlind
    this.players = players.map((player) => ({ ...player, holeCards: [], currentBet: 0, isFolded: false, isAllIn: false, lastAction: '' }))
  }

  destroy() {
    this.destroyed = true
    if (this.timer) clearTimeout(this.timer)
  }

  startHand() {
    if (this.destroyed) return
    if (this.timer) clearTimeout(this.timer)
    this.deck = new Deck()
    this.communityCards = []
    this.pot = 0
    this.currentBet = 0
    this.phase = 'preflop'
    this.resultMessage = ''
    this.handNumber += 1
    this.actedPlayerIds.clear()

    this.players.forEach((player) => {
      if (player.chips <= 0) player.chips = 1000
      player.holeCards = this.deck.draw(2)
      player.currentBet = 0
      player.isFolded = false
      player.isAllIn = false
      player.lastAction = ''
    })

    this.dealerIndex = (this.dealerIndex + 1) % this.players.length
    const smallBlindIndex = this.players.length === 2 ? this.dealerIndex : (this.dealerIndex + 1) % this.players.length
    const bigBlindIndex = this.players.length === 2 ? (this.dealerIndex + 1) % this.players.length : (this.dealerIndex + 2) % this.players.length
    this.postBlind(smallBlindIndex, this.smallBlindAmount, 'SMALL BLIND')
    this.postBlind(bigBlindIndex, this.smallBlindAmount * 2, 'BIG BLIND')
    this.currentBet = Math.max(...this.players.map((player) => player.currentBet))
    this.currentPlayerIndex = this.findNextIndex(bigBlindIndex)
    this.notify()
    this.triggerBotIfNeeded()
  }

  fold() {
    const player = this.currentPlayer
    if (!this.canPlayerAct(player)) return
    player.isFolded = true
    player.lastAction = 'FOLD'
    this.actedPlayerIds.add(player.id)
    this.advanceTurn()
  }

  checkOrCall() {
    const player = this.currentPlayer
    if (!this.canPlayerAct(player)) return
    const callAmount = Math.min(Math.max(0, this.currentBet - player.currentBet), player.chips)
    player.chips -= callAmount
    player.currentBet += callAmount
    this.pot += callAmount
    player.isAllIn = player.chips === 0
    player.lastAction = callAmount > 0 ? `CALL $${callAmount}` : 'CHECK'
    this.actedPlayerIds.add(player.id)
    this.advanceTurn()
  }

  raise(amount: number) {
    const player = this.currentPlayer
    if (!this.canPlayerAct(player)) return
    const callAmount = Math.max(0, this.currentBet - player.currentBet)
    const availableRaise = Math.max(0, player.chips - callAmount)
    const raiseBy = Math.min(Math.max(this.smallBlindAmount * 2, Math.floor(amount)), availableRaise)
    if (raiseBy <= 0) return this.checkOrCall()
    const deduction = Math.min(player.chips, callAmount + raiseBy)
    player.chips -= deduction
    player.currentBet += deduction
    this.pot += deduction
    this.currentBet = player.currentBet
    player.isAllIn = player.chips === 0
    player.lastAction = `RAISE TO $${player.currentBet}`
    this.actedPlayerIds = new Set([player.id])
    this.advanceTurn()
  }

  private get currentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  private canPlayerAct(player?: Player) {
    return Boolean(player && !player.isFolded && !player.isAllIn && this.phase !== 'showdown')
  }

  private postBlind(index: number, amount: number, label: string) {
    const player = this.players[index]
    const paid = Math.min(amount, player.chips)
    player.chips -= paid
    player.currentBet = paid
    player.isAllIn = player.chips === 0
    player.lastAction = label
    this.pot += paid
  }

  private findNextIndex(fromIndex: number): number {
    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const index = (fromIndex + offset) % this.players.length
      if (this.canPlayerAct(this.players[index])) return index
    }
    return fromIndex
  }

  private bettingRoundComplete(): boolean {
    const ableToAct = this.players.filter((player) => !player.isFolded && !player.isAllIn)
    if (ableToAct.length === 0) return true
    return ableToAct.every((player) => this.actedPlayerIds.has(player.id) && player.currentBet === this.currentBet)
  }

  private advanceTurn() {
    const contenders = this.players.filter((player) => !player.isFolded)
    if (contenders.length === 1) return this.awardUncontested(contenders[0])
    if (this.bettingRoundComplete()) return this.nextPhase()
    this.currentPlayerIndex = this.findNextIndex(this.currentPlayerIndex)
    this.notify()
    this.triggerBotIfNeeded()
  }

  private nextPhase() {
    this.players.forEach((player) => { player.currentBet = 0; player.lastAction = '' })
    this.currentBet = 0
    this.actedPlayerIds.clear()
    if (this.phase === 'preflop') { this.communityCards = this.deck.draw(3); this.phase = 'flop' }
    else if (this.phase === 'flop') { this.communityCards.push(...this.deck.draw(1)); this.phase = 'turn' }
    else if (this.phase === 'turn') { this.communityCards.push(...this.deck.draw(1)); this.phase = 'river' }
    else return this.resolveShowdown()

    const ableToAct = this.players.filter((player) => !player.isFolded && !player.isAllIn)
    if (ableToAct.length <= 1) {
      if (this.phase === 'flop') this.communityCards.push(...this.deck.draw(2))
      else if (this.phase === 'turn') this.communityCards.push(...this.deck.draw(1))
      this.phase = 'river'
      return this.resolveShowdown()
    }
    this.currentPlayerIndex = this.findNextIndex(this.dealerIndex)
    this.notify()
    this.triggerBotIfNeeded()
  }

  private compareHands(first: Player, second: Player): number {
    const a = evaluateHand([...first.holeCards, ...this.communityCards])
    const b = evaluateHand([...second.holeCards, ...this.communityCards])
    if (a.rank !== b.rank) return b.rank - a.rank
    const length = Math.max(a.tiebreakers.length, b.tiebreakers.length)
    for (let index = 0; index < length; index += 1) {
      if ((a.tiebreakers[index] ?? 0) !== (b.tiebreakers[index] ?? 0)) return (b.tiebreakers[index] ?? 0) - (a.tiebreakers[index] ?? 0)
    }
    return 0
  }

  private resolveShowdown() {
    this.phase = 'showdown'
    const contenders = this.players.filter((player) => !player.isFolded).sort((a, b) => this.compareHands(a, b))
    const winners = contenders.filter((player) => this.compareHands(player, contenders[0]) === 0)
    const share = Math.floor(this.pot / winners.length)
    winners.forEach((winner) => { winner.chips += share })
    this.resultMessage = winners.length > 1 ? `${winners.map((winner) => winner.name).join(' + ')} SPLIT $${this.pot}` : `${winners[0].name} WINS $${this.pot}`
    this.pot = 0
    this.notify()
    this.scheduleNextHand()
  }

  private awardUncontested(winner: Player) {
    this.phase = 'showdown'
    winner.chips += this.pot
    this.resultMessage = `${winner.name} WINS $${this.pot}`
    this.pot = 0
    this.notify()
    this.scheduleNextHand()
  }

  private scheduleNextHand() {
    this.timer = setTimeout(() => this.startHand(), 3500)
  }

  private triggerBotIfNeeded() {
    const player = this.currentPlayer
    if (!player?.isBot || !this.canPlayerAct(player)) return
    this.timer = setTimeout(() => {
      if (this.destroyed || this.currentPlayer.id !== player.id) return
      const callAmount = Math.max(0, this.currentBet - player.currentBet)
      const highCard = Math.max(...player.holeCards.map((card) => card.rank))
      const pair = player.holeCards[0]?.rank === player.holeCards[1]?.rank
      const pressure = callAmount / Math.max(1, player.chips)
      const roll = Math.random()
      if (pressure > 0.35 && !pair && highCard < 12 && roll < 0.72) this.fold()
      else if ((pair || highCard >= 13) && player.chips > callAmount + this.smallBlindAmount * 2 && roll > 0.55) this.raise(this.smallBlindAmount * 2)
      else this.checkOrCall()
    }, 650 + Math.random() * 650)
  }

  private notify() {
    if (!this.destroyed) this.onStateChange()
  }
}
