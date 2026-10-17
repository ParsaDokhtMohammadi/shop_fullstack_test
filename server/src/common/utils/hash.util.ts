import * as bcrypt from 'bcrypt';
const BCRYPT_ROUNDS = 10;
export const hashCode = (code: string): Promise<string> => {
  return bcrypt.hash(code, BCRYPT_ROUNDS);
};

export const verifyCode = (
  code: string,
  codeHash: string,
): Promise<boolean> => {
  return bcrypt.compare(code, codeHash);
};
