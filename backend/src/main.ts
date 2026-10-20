import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './common/problem-details.filter';
import { assertSafeAuthConfig } from './auth/auth-config';

async function bootstrap() {
  assertSafeAuthConfig(process.env);
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
  });
  app.useWebSocketAdapter(
    new WsAdapter(app, {
      messageParser: (data: any) => {
        try {
          const raw = typeof data === 'string' ? data : data.toString();
          const parsed = JSON.parse(raw);
          const event = parsed.event ?? parsed.type;
          if (typeof event === 'string') {
            return {
              event,
              data: parsed.data ?? parsed.payload ?? parsed,
            };
          }
        } catch {
          // Ignore invalid JSON payloads
        }
        return undefined;
      },
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());

  const doc = new DocumentBuilder()
    .setTitle('DevArena API')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, doc),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
