type ClassValue = string | false | null | undefined

/**
 * Joins class names, dropping anything falsy, so a conditional class reads as
 * `cn('base', isActive && 'active')`.
 *
 * Deliberately five lines instead of a dependency: `clsx` would add a package
 * for this, and `tailwind-merge` solves a different problem — resolving
 * conflicting utilities — which this app avoids by having components own their
 * styling rather than accepting arbitrary overrides.
 */
export const cn = (...classes: ClassValue[]): string =>
  classes.filter(Boolean).join(' ')
