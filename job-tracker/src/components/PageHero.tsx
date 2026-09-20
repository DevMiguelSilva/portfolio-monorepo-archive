import { boardLook } from './BoardLook'
import { backLinkClass } from '../lib/appUi'

interface PageHeroProps {
  label?: string
  title: React.ReactNode
  description?: string
  actions?: React.ReactNode
}

/** Welcome banner for the board home — not used on sub-pages (nav handles those). */
export function PageHero({ label, title, description, actions }: PageHeroProps) {
  return (
    <section className={boardLook.hero}>
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          {label && <p className={boardLook.label}>{label}</p>}
          <h1 className={`${label ? 'mt-2' : ''} ${boardLook.headline}`}>{title}</h1>
          {description && <p className={`mt-3 max-w-xl ${boardLook.body}`}>{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  )
}

export { backLinkClass }