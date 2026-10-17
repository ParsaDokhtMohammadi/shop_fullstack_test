import { randomInt } from 'crypto';

// A short code the customer can read out on the phone, e.g. 260109-48213. The
// id stays a uuid — this is only for humans, which is why it does not have to
// be dense or sequential. Dated so support can see roughly when it was placed,
// and random rather than counted so nobody can tell how many orders a shop
// takes per day. Collisions are caught by the unique index and retried.
export const generateOrderNumber = (): string => {
  const now = new Date();
  const date = [
    String(now.getFullYear()).slice(2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  return `${date}-${String(randomInt(0, 100000)).padStart(5, '0')}`;
};
