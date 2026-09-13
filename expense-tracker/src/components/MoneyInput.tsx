import { useEffect, useState } from 'react'
import { centsToInput, parseMoneyInput } from '../lib/money'

export function MoneyInput({
  cents,
  onCommit,
  className,
  ariaLabel,
  placeholder = '0.00',
}: {
  cents: number
  onCommit: (cents: number) => void
  className?: string
  ariaLabel?: string
  placeholder?: string
}) {
  const [text, setText] = useState(() => centsToInput(cents))

  useEffect(() => {
    setText(centsToInput(cents))
  }, [cents])

  return (
    <input
      className={className}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (!text.trim()) {
          onCommit(0)
          setText('')
          return
        }
        const parsed = parseMoneyInput(text)
        if (parsed === null) {
          setText(centsToInput(cents))
          return
        }
        onCommit(parsed)
        setText(centsToInput(parsed))
      }}
    />
  )
}
