import { Link } from 'react-router-dom'
import { backLinkClass, pageTitleClass } from '../lib/appUi'

interface PageToolbarProps {
  title?: string
  backTo?: string
  backLabel?: string
  showBack?: boolean
  actions?: React.ReactNode
}

/** Back link, one page title, and optional actions. */
export function PageToolbar({
  title,
  backTo = '/',
  backLabel = 'Back to board',
  showBack = true,
  actions,
}: PageToolbarProps) {
  return (
    <div className="space-y-3">
      {showBack && (
        <Link to={backTo} className={backLinkClass}>
          ← {backLabel}
        </Link>
      )}
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {title ? <h1 className={pageTitleClass}>{title}</h1> : <span />}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </div>
  )
}
