import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  /** Optional display name for the user */
  displayName?: string;
  /** Optional username on chess.com */
  chessComUsername?: string;
  /** Optional username on lichess.org */
  lichessUsername?: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find((u) => u.email === email);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }

  async create(email: string, password: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user: User = {
      id: (this.users.length + 1).toString(),
      email,
      passwordHash,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * Return a copy of the user object without sensitive fields like passwordHash.
   * This is useful for sending user data to the client.
   */
  sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  /**
   * Update the (optional) settings/profile fields for a user.
   * All fields are optional; only provided keys will be updated.
   */
  async updateSettings(
    id: string,
    settings: {
      displayName?: string | null;
      chessComUsername?: string | null;
      lichessUsername?: string | null;
    },
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (settings.displayName !== undefined) {
      user.displayName = settings.displayName || undefined;
    }
    if (settings.chessComUsername !== undefined) {
      user.chessComUsername = settings.chessComUsername || undefined;
    }
    if (settings.lichessUsername !== undefined) {
      user.lichessUsername = settings.lichessUsername || undefined;
    }

    return user;
  }
}


