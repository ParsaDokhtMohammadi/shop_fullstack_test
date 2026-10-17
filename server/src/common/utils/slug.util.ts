// Everything that is not a letter or a digit becomes a dash, which keeps
// Persian intact (\p{L} covers Arabic script) while dropping punctuation.
//
// It CAN return an empty string: "+++", "!!" or "🙂🙂" have nothing left after
// stripping, and all three pass a @Length(2, …) first — class-validator counts
// a surrogate pair as one character, so a lone emoji is caught by the length
// rule but two of them are not. An empty slug is not a usable url and collides
// with the next one, so every caller checks the result and refuses it rather
// than storing it — see VALIDATION_MESSAGES.SLUG_NOT_DERIVABLE.
export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
