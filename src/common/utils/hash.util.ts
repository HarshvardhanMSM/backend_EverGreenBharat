import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class HashUtil {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateRandomToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
