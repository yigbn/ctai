import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config();

async function bootstrap() {
  // Ensure data directory exists so SQLite can create db file (default: data/db.sqlite)
  const dbPath = process.env.DB_PATH || 'data/db.sqlite';
  const dataDir = path.dirname(dbPath);
  await fs.mkdir(dataDir, { recursive: true });
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
}

bootstrap();


