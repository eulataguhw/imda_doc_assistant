import { Module } from "@nestjs/common";
import { DocumentsModule } from "./documents/documents.module";
import { ChatModule } from "./chat/chat.module";

@Module({ imports: [DocumentsModule, ChatModule] })
export class AppModule {}
