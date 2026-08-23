import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import Logo from './Logo'

export default function PageHeader() {
  const navigate = useNavigate()
  return <header><button className="user" onClick={() => navigate('/profile')}><Avatar /><span><b>{'{ USERNAME }'}</b><small>{'{ email }'}@gmail.com</small></span></button><Logo /></header>
}
