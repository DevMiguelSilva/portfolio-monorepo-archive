interface IconActionProps {
  label: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

/** Compact icon action used by editable list rows. */
export function IconAction({ label, danger, disabled, onClick, children }: IconActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1 text-center text-xs font-medium leading-tight disabled:opacity-60 ${
        danger ? 'text-red-700' : 'text-brand-ink'
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e6eeeb] bg-white">
        {children}
      </span>
      {label}
    </button>
  )
}
