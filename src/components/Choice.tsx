import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props<T extends string> {
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  id?: string
  className?: string
  'aria-label'?: string
}

/** Single-choice dropdown over a fixed list of string options. */
export function Choice<T extends string>({ value, options, onChange, id, className, ...rest }: Props<T>) {
  return (
    <Select items={options} value={value} onValueChange={(v) => v !== null && onChange(v as T)}>
      <SelectTrigger id={id} className={className ?? 'w-full'} aria-label={rest['aria-label']}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
