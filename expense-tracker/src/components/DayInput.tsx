import { useEffect, useState } from 'react'

export function DayInput({
  day,
  onCommit,
  className,
  ariaLabel,
}: {
  day: number | null
  onCommit: (day: number | null) => void
  className?: string
  ariaLabel?: string
}) {
  const [text, setText] = useState(day ? String(day) : '')

  useEffect(() => {
    setText(day ? String(day) : '')
  }, [day])

  return (
    <input
      className={className}
      inputMode="numeric"
      value={text}
      placeholder="—"
      aria-label={ariaLabel}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!text.trim() || text.trim().toLowerCase() === 'x') {
          onCommit(null)
          setText('')
          return
        }
        const value = Number(text)
        if (!Number.isInteger(value) || value < 1 || value > 31) {
          setText(day ? String(day) : '')
          return
        }
        onCommit(value)
      }}
    />
  )
}
