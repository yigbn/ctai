import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';

export interface LastPracticePosition {
  fen: string;
  savedAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  displayName?: string;
  chessComUsername?: string;
  lichessUsername?: string;
  lastPracticePositions?: LastPracticePosition[];
}

const MAX_PRACTICE_POSITIONS = 15;

function parsePositionsJson(json: string | null | undefined): LastPracticePosition[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as LastPracticePosition[];
    return Array.isArray(arr) ? arr.slice(0, MAX_PRACTICE_POSITIONS) : [];
  } catch {
    return [];
  }
}

function entityToUser(e: UserEntity): User {
  return {
    id: String(e.id),
    email: e.email,
    passwordHash: e.passwordHash,
    createdAt: e.createdAt,
    displayName: e.displayName ?? undefined,
    chessComUsername: e.chessComUsername ?? undefined,
    lichessUsername: e.lichessUsername ?? undefined,
    lastPracticePositions: parsePositionsJson(e.lastPracticePositionsJson),
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const e = await this.userRepo.findOne({ where: { email } });
    return e ? entityToUser(e) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const numId = Number(id);
    if (Number.isNaN(numId) || numId < 1) return undefined;
    const e = await this.userRepo.findOne({ where: { id: numId } });
    return e ? entityToUser(e) : undefined;
  }

  async create(email: string, password: string): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new Error('User with this email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const entity = this.userRepo.create({
      email,
      passwordHash,
    });
    const saved = await this.userRepo.save(entity);
    return entityToUser(saved);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async updateSettings(
    id: string,
    settings: {
      displayName?: string | null;
      chessComUsername?: string | null;
      lichessUsername?: string | null;
      lastPracticePositions?: LastPracticePosition[] | null;
    },
  ): Promise<User> {
    const numId = Number(id);
    if (Number.isNaN(numId) || numId < 1) {
      throw new Error('User not found');
    }
    const e = await this.userRepo.findOne({ where: { id: numId } });
    if (!e) {
      throw new Error('User not found');
    }

    if (settings.displayName !== undefined) {
      e.displayName = settings.displayName ?? null;
    }
    if (settings.chessComUsername !== undefined) {
      e.chessComUsername = settings.chessComUsername ?? null;
    }
    if (settings.lichessUsername !== undefined) {
      e.lichessUsername = settings.lichessUsername ?? null;
    }
    if (settings.lastPracticePositions !== undefined) {
      const list = Array.isArray(settings.lastPracticePositions)
        ? settings.lastPracticePositions.slice(0, MAX_PRACTICE_POSITIONS)
        : [];
      e.lastPracticePositionsJson =
        list.length > 0 ? JSON.stringify(list) : null;
    }

    await this.userRepo.save(e);
    return entityToUser(e);
  }
}
