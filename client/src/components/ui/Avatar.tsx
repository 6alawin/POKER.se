import cowboyProfile from '../../assets/picture_profile/cowboy.png'

type AvatarProps = {
  className?: string
}

export default function Avatar({ className = '' }: AvatarProps) {
  return (
    <div className={`avatar aspect-square ${className}`}>
      <img className="size-full object-cover [image-rendering:pixelated]" src={cowboyProfile} alt="Cowboy profile" />
    </div>
  )
}
