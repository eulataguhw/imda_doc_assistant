import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { DocumentsModule } from "./documents/documents.module";
import { ChatModule } from "./chat/chat.module";

@Module({ imports: [DocumentsModule, ChatModule], controllers: [AppController] })
export class AppModule {}
