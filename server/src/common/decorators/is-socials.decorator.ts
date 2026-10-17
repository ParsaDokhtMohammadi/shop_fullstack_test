import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { VALIDATION_MESSAGES } from '../messages';

// Why this is not just @IsObject: an admin saving {"x": "javascript:alert(1)"}
// stores a working script, and a storefront that renders socials as <a href>
// runs it. `//evil.com` is the same problem more quietly — a protocol-relative
// url is a redirect off the shop's own page.
//
// So the scheme is checked here rather than trusted to whoever writes the
// frontend. http and https only, and nothing deeper than one level: the column
// is network -> url, so a nested object has no meaning anyway.
const MAX_NETWORKS = 20;
const MAX_KEY_LENGTH = 40;
const MAX_URL_LENGTH = 300;
const HTTP_URL = /^https?:\/\/\S+$/i;

// Returns the first network whose url is unusable, or null when the whole
// object is fine. A key rather than a boolean because the error has to be able
// to name it: rejecting a read-modify-write of the settings form without
// saying which of twenty networks is at fault is a guessing game.
//
// undefined means "not that kind of wrong" — the value is not a network -> url
// map at all, so there is no key to blame and the generic message applies.
const offendingNetwork = (value: unknown): string | null | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return undefined;

  const entries = Object.entries(value);
  if (entries.length > MAX_NETWORKS) return undefined;

  for (const [key, url] of entries) {
    if (key.length < 1 || key.length > MAX_KEY_LENGTH) return undefined;
    if (typeof url !== 'string') return key;
    if (url.length > MAX_URL_LENGTH || !HTTP_URL.test(url)) return key;
  }

  return null;
};

export const IsSocials = (options?: ValidationOptions) =>
  function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSocials',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => offendingNetwork(value) === null,
        // Only reached when `options.message` is not set, so the caller can
        // still override it. Falls back to the generic text when the value was
        // not a map of networks to urls in the first place.
        defaultMessage: (args?: ValidationArguments) => {
          const key = offendingNetwork(args?.value);

          return key
            ? VALIDATION_MESSAGES.SOCIALS_INVALID_KEY(key)
            : VALIDATION_MESSAGES.SOCIALS_INVALID;
        },
      },
    });
  };
