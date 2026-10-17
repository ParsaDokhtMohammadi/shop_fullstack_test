import { Transform } from 'class-transformer';

// Every boolean that arrives as text needs this: a query string carries
// "true", and so does a multipart form field, so @IsBoolean on its own would
// reject the only spelling a browser can send.
//
// The point is what it does with a third value. The obvious transform —
//
//   value === 'true' || value === true
//
// collapses everything that is not "true" into false, so ?isActive=maybe
// validates cleanly and quietly means "show me the inactive ones". On a body
// it is worse: a typo'd isActive on a category creates it switched off and
// answers 201, and the category just never appears.
//
// So only the two real spellings are mapped. Anything else is handed on
// untouched for @IsBoolean to reject, which makes a bad boolean a 400 like
// every other bad value in this API.
//
// Pair it with @IsBoolean — this decorator only converts, it never validates:
//
//   @ToBoolean()
//   @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE_INVALID })
//   isActive?: boolean;
export const ToBoolean = () =>
  Transform(({ value }: { value: unknown }): unknown => {
    // undefined is "the field was omitted", which @IsOptional handles. Passing
    // it through keeps an optional field optional instead of defaulting it.
    if (value === undefined || typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  });
