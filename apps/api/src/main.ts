import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config } from "./lib/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  await app.listen(config.port);
  console.log(`doc-api listening on :${config.port} (prefix /api)`);
}
bootstrap();
