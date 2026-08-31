import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.useWebSocketAdapter(new WsAdapter(app));

  // Keep /health outside the api prefix so compose probes and operators hit a
  // stable, unauthenticated path regardless of API versioning.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableCors({
    origin: resolveCorsOrigin(config),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DockSight API')
    .setDescription(
      'Open-source Docker management and observability platform API',
    )
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Listen for SIGTERM/SIGINT so OnModuleDestroy hooks (Prisma, Redis) run on
  // docker compose stop / docksight update restarts.
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  // Host is deployment-dependent (container, reverse proxy, etc.) — log the
  // bound port rather than hardcoding localhost.
  logger.log(`DockSight API listening on port ${port}`);
  logger.log(`Swagger docs available at /api/docs (port ${port})`);
  logger.log(`Agent WebSocket endpoint at /agents (port ${port})`);
}

/**
 * Allowed browser origins for credentialed CORS.
 * - CORS_ORIGINS set → that explicit list
 * - production, unset → false (same-origin only; no reflected Origin)
 * - development, unset → Vite dev server defaults
 */
function resolveCorsOrigin(config: ConfigService): boolean | string[] {
  const configured = config.get<string>('CORS_ORIGINS');
  if (configured != null && configured.trim() !== '') {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return ['http://localhost:2002', 'http://127.0.0.1:2002'];
}

void bootstrap();
