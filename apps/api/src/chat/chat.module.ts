import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { SessionsService } from "./sessions.service";

@Module({
  imports: [DocumentsModule],
  controllers: [ChatController],
  providers: [ChatService, SessionsService],
})
export class ChatModule {}
