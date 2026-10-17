import { registerDecorator, ValidationOptions } from 'class-validator';

// An admin-entered link that something renders as <a href>. Two shapes are
// allowed, and nothing else:
//
//   /category/shoes            an in-shop path, which is the common case — a
//                              banner usually links into the shop, and a path
//                              survives a domain change and works on localhost
//   https://instagram.com/x    a deliberate external link
//
// What this exists to refuse is `//evil.com`, which browsers read as
// "https://evil.com": with `require_protocol: false`, @IsUrl accepts it and the
// shop's own homepage quietly becomes a redirect to somebody else's site. `/\`
// is the same trick, since browsers normalise the backslash to a slash.
//
// That is also why the relative branch is not just "starts with a slash": the
// second character is what decides whether the value can leave the site.
const MAX_LENGTH = 500;
const RELATIVE_PATH = /^\/(?![/\\])\S*$/;
const ABSOLUTE_URL = /^https?:\/\/\S+$/i;

const isLinkUrl = (value: unknown): boolean =>
  typeof value === 'string' &&
  value.length >= 1 &&
  value.length <= MAX_LENGTH &&
  (RELATIVE_PATH.test(value) || ABSOLUTE_URL.test(value));

export const IsLinkUrl = (options?: ValidationOptions) =>
  function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLinkUrl',
      target: object.constructor,
      propertyName,
      options,
      validator: { validate: (value: unknown) => isLinkUrl(value) },
    });
  };
