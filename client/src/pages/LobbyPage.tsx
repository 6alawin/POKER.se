import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import TrophyIcon from '../components/ui/TrophyIcon'

export default function LobbyPage() {
  const navigate = useNavigate()

  return (
    <main className="lobby-page !flex !h-dvh !min-h-screen !flex-col !overflow-hidden">
      <PageHeader />
      <section className="lobby-content !relative !z-10 !min-h-0 !flex-1 !justify-center !px-6 !py-[clamp(10px,3vh,32px)]">
        <h1 className="!mb-[clamp(22px,6vh,68px)] !mt-0 !text-[clamp(20px,3vw,34px)] max-[700px]:!mb-[clamp(12px,3vh,35px)]">SELECT MODE</h1>
        <div className="modes !min-h-0 !w-[min(900px,100%)] !gap-[clamp(16px,3vw,32px)] max-[700px]:!w-[min(430px,100%)]">
          <button className="mode friend !aspect-square !min-h-0 !gap-[clamp(12px,3vh,27px)] max-[700px]:!aspect-auto max-[700px]:basis-0" onClick={() => navigate('/room')}>
            <span className="mode-icon"><img className="size-[60%] object-contain [image-rendering:pixelated]" src="/images/player_icon.png" alt="" /></span>
            <b>Play with Friend</b>
            <small>INVITE VIA CODE</small>
          </button>
          <button className="mode bot !aspect-square !min-h-0 !gap-[clamp(12px,3vh,27px)] max-[700px]:!aspect-auto max-[700px]:basis-0" onClick={() => alert('Practice mode is coming soon.')}>
            <span className="mode-icon"><img className="size-[60%] object-contain [image-rendering:pixelated]" src="/images/bot_icon.png" alt="" /></span>
            <b>Play with Bot</b>
            <small>PRACTICE OFFLINE</small>
          </button>
        </div>
      </section>
      <footer className="!min-h-0 !basis-[clamp(72px,12vh,110px)] !px-[clamp(16px,7vw,72px)] !py-[clamp(12px,3vh,28px)]">
        <button className="flex items-center gap-3" onClick={() => alert('Leaderboard is coming soon.')}>
          <TrophyIcon />
          <span>LEADERBOARD</span>
        </button>
      </footer>
    </main>
  )
}
