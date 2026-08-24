type LogoProps = {
  showWordmark?: boolean
}

export default function Logo({ showWordmark = false }: LogoProps) {
  return (
    <div className="flex items-center gap-3 max-[700px]:gap-1.5" aria-label="POKER.se">
      <img
        className={`${showWordmark ? 'size-[clamp(54px,7vw,92px)]' : 'size-[clamp(150px,22vw,220px)]'} block object-contain [image-rendering:pixelated]`}
        src="/images/poker-se-logo.png"
        alt=""
      />
      {showWordmark && <img className="block w-[clamp(120px,15vw,190px)] max-[700px]:w-[clamp(100px,30vw,150px)] [image-rendering:pixelated]" src="/images/poker-se-wordmark.png" alt="POKER.se" />}
    </div>
  )
}
