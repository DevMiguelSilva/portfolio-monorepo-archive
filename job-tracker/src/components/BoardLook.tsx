/** Locked board styles. The compare switch and the previous look are gone. */
try {
  sessionStorage.removeItem('board-look')
} catch {
  // Private mode can block storage. Nothing else reads this key.
}

export const boardLook = {
  page: 'space-y-4 font-sans text-brand-ink',
  card: 'rounded-[1.25rem] border border-[#e6eeeb] bg-white',
  cardHover: 'transition duration-300 hover:border-brand-primary/40',
  button:
    'inline-block rounded-lg bg-brand-primary px-4 py-2.5 font-sans text-[0.9375rem] font-semibold text-brand-ink transition hover:bg-brand-primaryDeep',
  headline: 'font-display text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-brand-ink',
  sectionTitle: 'font-display text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-brand-ink',
  body: 'font-sans text-[0.9375rem] leading-relaxed text-brand-muted',
  label: 'font-sans text-xs font-medium text-brand-muted',
  caption: 'font-sans text-xs font-medium text-brand-muted',
  figure: 'font-sans text-lg font-semibold leading-none',
  figureQuiet: 'font-display text-[1.75rem] font-semibold leading-none text-brand-ink',
  streakTitle: 'font-display text-lg font-semibold leading-snug text-brand-ink',
  streakValue: 'font-sans text-sm font-semibold leading-none text-brand-primary',
  streakQuiet: 'font-sans text-sm font-semibold leading-none text-brand-ink',
  hero: 'relative overflow-hidden rounded-[1.25rem] border border-[#e6eeeb] bg-white p-8 sm:p-10',
  cardPad: 'p-6',
  search:
    'w-full appearance-none rounded-lg border border-[#e6eeeb] bg-white py-2.5 pl-9 pr-9 font-sans text-[0.9375rem] text-brand-ink outline-none transition placeholder:text-brand-muted/70 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25',
  jobCard:
    'rounded-[1.25rem] border border-[#e6eeeb] bg-white p-4 transition hover:bg-[#f7fbf9]',
  jobTitle: 'font-sans text-sm font-semibold leading-snug text-brand-ink',
  jobMeta: 'font-sans text-xs leading-snug text-brand-muted',
  empty: 'rounded-[1.25rem] border border-dashed border-[#e6eeeb] bg-white p-12 text-center',
  emptyTitle: 'mt-3 font-display text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-brand-ink',
  kanban:
    'app-scroll max-h-[40rem] overflow-x-hidden overflow-y-auto rounded-[1.25rem] border border-[#e6eeeb] bg-[#f7fbf9] px-3 pb-3',
} as const

export type BoardLook = typeof boardLook
