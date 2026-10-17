import { useId } from 'react'
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

/**
 * Form controls. The three share one wrapper so a label, a hint and an error
 * always sit in the same place and are always wired up with `htmlFor` and
 * `aria-describedby` — which is the part that is easy to forget and is what
 * screen readers rely on.
 */

const CONTROL_BASE =
  'w-full rounded-control border bg-white px-3.5 text-ink-900 transition-colors ' +
  'placeholder:text-ink-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-600/25 focus:border-brand-600 ' +
  'disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500'

const borderFor = (hasError: boolean) =>
  hasError
    ? 'border-sale-500 focus:border-sale-600 focus:ring-sale-500/25'
    : 'border-ink-300 hover:border-ink-400'

interface FieldShellProps {
  id: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}

const FieldShell = ({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldShellProps) => (
  <div className="flex flex-col gap-1.5">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-ink-800">
        {label}
        {required && (
          <span className="text-sale-600 ms-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
    )}
    {children}
    {/* The hint is hidden once there is an error, so the two never stack and
        push the form around as the user types. */}
    {error ? (
      // role="alert" makes a screen reader announce the message when it
      // appears, rather than leaving it to be discovered.
      <p id={`${id}-error`} role="alert" className="text-sm text-sale-600">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${id}-hint`} className="text-ink-500 text-sm">
          {hint}
        </p>
      )
    )}
  </div>
)

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: string
  error?: string
  /** Rendered inside the control, at the start edge (the right, in RTL). */
  icon?: ReactNode
  /**
   * Passed straight to the input. React 19 treats `ref` as an ordinary prop on
   * function components, so no forwardRef wrapper is needed any more.
   */
  ref?: Ref<HTMLInputElement>
}

export const Input = ({
  label,
  hint,
  error,
  icon,
  className,
  id: providedId,
  required,
  ref,
  ...props
}: InputProps) => {
  // useId gives a stable unique id across renders, so the label stays bound to
  // its own input even when several of these are on one page.
  const generatedId = useId()
  const id = providedId ?? generatedId

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        {icon && (
          <span className="text-ink-400 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5">
            {icon}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          required={required}
          // Tells assistive technology the value is rejected, and points at
          // the message explaining why.
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            CONTROL_BASE,
            borderFor(Boolean(error)),
            'h-11',
            icon ? 'ps-11' : undefined,
            className,
          )}
          {...props}
        />
      </div>
    </FieldShell>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = ({
  label,
  hint,
  error,
  className,
  id: providedId,
  required,
  rows = 4,
  ...props
}: TextareaProps) => {
  const generatedId = useId()
  const id = providedId ?? generatedId

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          CONTROL_BASE,
          borderFor(Boolean(error)),
          'resize-y py-2.5 leading-7',
          className,
        )}
        {...props}
      />
    </FieldShell>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
}

export const Select = ({
  label,
  hint,
  error,
  className,
  id: providedId,
  required,
  children,
  ...props
}: SelectProps) => {
  const generatedId = useId()
  const id = providedId ?? generatedId

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          CONTROL_BASE,
          borderFor(Boolean(error)),
          'h-11 cursor-pointer appearance-none pe-9',
          // The native arrow is removed above so it can be drawn on the
          // correct side for RTL; this is the replacement.
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%237a7a73%27 stroke-width=%272%27 stroke-linecap=%27round%27%3E%3Cpath d=%27M6 9l6 6 6-6%27/%3E%3C/svg%3E')] bg-size-[1.1rem] bg-no-repeat",
          'bg-position-[left_0.75rem_center]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}
