import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs/promises';
import * as path from 'path';

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
export class UsersService implements OnModuleInit {
  private readonly users: User[] = [];
  private readonly dataFile = path.join(process.cwd(), 'data', 'users.json');

  async onModuleInit(): Promise<void> {
    await this.loadFromDisk();
  }

  private async ensureDataDir() {
    const dir = path.dirname(this.dataFile);
    await fs.mkdir(dir, { recursive: true });
  }

  private async loadFromDisk() {
    try {
      const raw = await fs.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(raw) as Array<Omit<User, 'createdAt'> & { createdAt: string }>;
      this.users.splice(
        0,
        this.users.length,
        ...parsed.map((u) => ({
          ...u,
          createdAt: new Date(u.createdAt),
        })),
      );
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        // No data file yet – start with empty array and create file on first write.
        await this.ensureDataDir();
        await this.saveToDisk();
      } else {
        // Log and continue with empty in-memory users to avoid crashing the app.
        // eslint-disable-next-line no-console
        console.error('Failed to load users DB from disk:', err);
      }
    }
  }

  private async saveToDisk() {
    await this.ensureDataDir();
    const serializable = this.users.map((u) => ({
      ...u,
      // Dates will be stringified automatically; keep explicit for clarity.
      createdAt: u.createdAt.toISOString(),
    }));
    await fs.writeFile(this.dataFile, JSON.stringify(serializable, null, 2), 'utf8');
  }

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
    const nextId = (this.users.length + 1).toString();
    const user: User = {
      id: nextId,
      email,
      passwordHash,
      createdAt: new Date(),
    };
    this.users.push(user);
    await this.saveToDisk();
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

    await this.saveToDisk();
    return user;
  }
}


