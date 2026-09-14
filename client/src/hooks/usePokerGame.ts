import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'
import { PokerGame } from '../engine/pokerGame'
import type { Player } from '../engine/pokerGame'

type InitialPlayer = Omit<Player, 'holeCards' | 'currentBet' | 'isFolded' | 'isAllIn' | 'lastAction'>
type OnlineGame = { pin: string; playerId: string; isHost: boolean; socket: Socket }

export function usePokerGame(initialPlayers: InitialPlayer[], smallBlind = 10, online?: OnlineGame) {
  const [gameState, setGameState] = useState<PokerGame | null>(null)
  const gameRef = useRef<PokerGame | null>(null)

  useEffect(() => {
    const receiveState = (state: PokerGame) => setGameState(state)
    online?.socket.on('game:state', receiveState)


    if (!online) {
      const game = new PokerGame(initialPlayers, () => {
        const snapshot = Object.assign(Object.create(Object.getPrototypeOf(game)), game) as PokerGame
        setGameState(snapshot)
      }, smallBlind)
      gameRef.current = game
      game.startHand()
    } else {
      online.socket.emit('game:sync', { pin: online.pin }, (state: PokerGame | null) => { if (state) setGameState(state) })
    }

    return () => {
      gameRef.current?.destroy()
      online?.socket.off('game:state', receiveState)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const act = (action: 'fold' | 'check' | 'raise', amount?: number) => {
    if (online) return online.socket.emit('game:action', { pin: online.pin, action, amount })
    if (action === 'fold') gameRef.current?.fold()
    else if (action === 'raise') gameRef.current?.raise(amount || smallBlind * 2)
    else gameRef.current?.checkOrCall()
  }

  return { gameState, fold: () => act('fold'), check: () => act('check'), raise: (amount: number) => act('raise', amount) }
}
