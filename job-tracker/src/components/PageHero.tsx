import { backLinkClass, pageCardClass, sectionLabelClass } from '../lib/appUi'

interface PageHeroProps {
  label?: string
  title: React.ReactNode
  description?: string
  actions?: React.ReactNode
}

/** Welcome banner for the board home — not used on sub-pages (nav handles those). */
export function PageHero({ label, title, description, actions }: PageHeroProps) {
  return (
    <section className={`relative overflow-hidden ${pageCardClass} p-8 sm:p-10`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/50" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          {label && <p className={sectionLabelClass}>{label}</p>}
          <h1 className={`${label ? 'mt-2' : ''} font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl`}>
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  )
}

export { backLinkClass }