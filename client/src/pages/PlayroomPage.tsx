import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'
import { usePokerGame } from '../hooks/usePokerGame'
import type { Card } from '../engine/deck'
import Logo from '../components/ui/Logo'
import PlayingCard from '../features/game/components/PlayingCard'
import PlayerSeat from '../features/game/components/PlayerSeat'
import ActionBar from '../features/game/components/ActionBar'
import type { LobbyRoom } from '../features/rooms/components/WaitingRoom'
import cowboyAvatar from '../assets/picture_profile/cowboy.png'
import pineAvatar from '../assets/picture_profile/pine-tree.webp'
import cherryAvatar from '../assets/picture_profile/cherry-tree.webp'
import plagueAvatar from '../assets/picture_profile/plague-doctor.png'
import wizardAvatar from '../assets/picture_profile/wizard.png'
import playerAvatar from '../assets/picture_profile/ice-fishing.png'

const BOT_PROFILES = [
  { id: 'bot1', name: 'NeonJack', avatar: cowboyAvatar },
  { id: 'bot2', name: 'RetroMike', avatar: pineAvatar },
  { id: 'bot3', name: 'PixelQueen', avatar: cherryAvatar },
  { id: 'bot4', name: 'VaporJim', avatar: plagueAvatar },
  { id: 'bot5', name: 'SynthNeo', avatar: wizardAvatar },
  { id: 'bot6', name: 'LuckyByte', avatar: cowboyAvatar },
  { id: 'bot7', name: 'RiverRat', avatar: pineAvatar },
  { id: 'bot8', name: 'AcePilot', avatar: cherryAvatar },
]

type PlayLocationState = { mode?: 'bots' | 'friends'; botCount?: number; stake?: 'micro' | 'mid' | 'high'; room?: LobbyRoom; playerId?: string }

export default function PlayroomPage() {
  const navigate = useNavigate()
  const socket = useSocket()
  const { state } = useLocation()
  const options = (state || {}) as PlayLocationState
  const playerName = localStorage.getItem('poker-username') || 'Player1'
  const smallBlind = options.stake === 'high' ? 50 : options.stake === 'mid' ? 25 : 10

  const initialPlayers = useMemo(() => {
    if (options.mode === 'friends' && options.room) {
      return options.room.members.map((member, index) => ({
        id: member.id,
        name: member.name,
        avatar: member.id === options.playerId ? playerAvatar : BOT_PROFILES[index % BOT_PROFILES.length].avatar,
        chips: 1000,
        isBot: false,
      }))
    }
    const me = { id: 'player1', name: playerName, avatar: playerAvatar, chips: 1000, isBot: false }
    const count = Math.min(8, Math.max(1, options.botCount ?? 5))
    return [me, ...BOT_PROFILES.slice(0, count).map((bot) => ({ ...bot, chips: 1000, isBot: true }))]
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const online = options.mode === 'friends' && options.room && options.playerId ? {
    pin: options.room.pin,
    playerId: options.playerId,
    isHost: Boolean(options.room.members.find((member) => member.id === options.playerId)?.isHost),
    socket,
  } : undefined
  const { gameState, fold, check, raise } = usePokerGame(initialPlayers, smallBlind, online)
  if (!gameState) return <div className="grid min-h-screen place-items-center bg-[#126137] text-[#ffc23d]">SHUFFLING...</div>

  const activePlayer = gameState.players[gameState.currentPlayerIndex]
  const myPlayer = gameState.players.find((player) => player.id === (options.playerId || 'player1')) || gameState.players[0]
  const callAmount = Math.min(Math.max(0, gameState.currentBet - (myPlayer?.currentBet || 0)), myPlayer?.chips || 0)
  const availableRaise = Math.max(0, (myPlayer?.chips || 0) - callAmount)
  const isMyTurn = activePlayer?.id === myPlayer?.id && gameState.phase !== 'showdown'
  const displayPlayers = [myPlayer, ...gameState.players.filter((player) => player.id !== myPlayer.id)]

  return (
    <div className="playroom-page">
      <header className="playroom-header">
        <Logo showWordmark />
        <div className="table-meta"><b>TABLE #{options.room?.pin || 'BOT'}</b><span>HAND {gameState.handNumber} · {smallBlind}/{smallBlind * 2}</span></div>
        <button className="leave-room" onClick={() => navigate('/lobby')}>← LEAVE TABLE</button>
      </header>

      <main className="table-area">
        <div className="poker-table">
          <div className="phase-badge">{gameState.phase.toUpperCase()}</div>
          <div className="community-cards">
            {gameState.communityCards.map((card: Card, index: number) => <PlayingCard key={`${card.suit}-${card.rank}-${index}`} card={card} />)}
            {Array.from({ length: 5 - gameState.communityCards.length }).map((_, index) => <PlayingCard key={`empty-${index}`} hidden />)}
          </div>
          <div className="pot-info"><span className="chip-stack" aria-hidden="true">●</span> POT ${gameState.pot.toLocaleString()}</div>
          <p className={`turn-message ${gameState.resultMessage ? 'result' : ''}`}>
            {gameState.resultMessage || (isMyTurn ? 'YOUR TURN' : `${activePlayer?.name || 'PLAYER'} IS THINKING...`)}
          </p>

          {displayPlayers.map((player, index) => <PlayerSeat
            key={player.id}
            player={{ id: player.id, name: player.name, avatar: player.avatar, chips: player.chips }}
            isActive={player.id === activePlayer?.id && gameState.phase !== 'showdown'}
            isFolded={player.isFolded}
            seatIndex={index}
            seatCount={gameState.players.length}
            currentBet={player.currentBet}
            lastAction={player.lastAction}
            isDealer={gameState.players.findIndex((seat) => seat.id === player.id) === gameState.dealerIndex}
            showCards={gameState.phase === 'showdown' && !player.isFolded && index !== 0}
            holeCards={player.holeCards}
          />)}
        </div>
      </main>

      <ActionBar
        holeCards={myPlayer?.holeCards || []}
        canCheck={callAmount === 0}
        callAmount={callAmount}
        minRaise={smallBlind * 2}
        maxRaise={availableRaise}
        isMyTurn={isMyTurn}
        onFold={fold}
        onCheck={check}
        onRaise={raise}
      />
    </div>
  )
}
