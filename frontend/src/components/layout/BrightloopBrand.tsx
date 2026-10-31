import { Repeat } from 'lucide-react'
import { Link } from 'react-router-dom'

export function BrightloopBrand() {
  return (
    <Link className="bl-brand" to="/" aria-label="Brightloop home">
      <span className="bl-brand-mark">
        <Repeat size={19} strokeWidth={2.2} />
      </span>
      brightloop<span className="bl-brand-period">.</span>
    </Link>
  )
}
