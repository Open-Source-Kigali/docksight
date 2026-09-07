import { ConfigService, registerAs } from '@nestjs/config';

export type DatabaseEnv = {
  url: string;
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
};

function buildDatabaseUrl(parts: {
  host: string;
  port: string | number;
  user: string;
  password: string;
  name: string;
}): string {
  const user = encodeURIComponent(parts.user);
  const password = encodeURIComponent(parts.password);
  return `postgresql://${user}:${password}@${parts.host}:${parts.port}/${parts.name}?schema=public`;
}

/**
 * NestJS configuration namespace for PostgreSQL.
 * Prefer DATABASE_URL; otherwise assemble from discrete DATABASE_* vars.
 */
export const databaseConfig = registerAs('database', (): DatabaseEnv => {
  const host = process.env.DATABASE_HOST ?? 'localhost';
  const port = Number(process.env.DATABASE_PORT ?? 5432);
  const user = process.env.DATABASE_USER ?? 'docksight';
  const password = process.env.DATABASE_PASSWORD ?? 'docksight';
  const name = process.env.DATABASE_NAME ?? 'docksight';

  const url =
    process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0
      ? process.env.DATABASE_URL
      : buildDatabaseUrl({ host, port, user, password, name });

  return { url, host, port, user, password, name };
});

export function resolveDatabaseUrl(config: ConfigService): string {
  const configured = config.get<string>('database.url');
  if (configured && configured.length > 0) {
    return configured;
  }

  const fallback = config.get<string>('DATABASE_URL');
  if (fallback && fallback.length > 0) {
    return fallback;
  }

  throw new Error(
    'DATABASE_URL is required (or set DATABASE_HOST/PORT/USER/PASSWORD/NAME).',
  );
}
