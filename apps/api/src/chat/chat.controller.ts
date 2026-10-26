import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
// `ExpressResponse` avoids shadowing the global fetch `Response` that ChatService returns.
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { ChatService, DirectDoc, HistoryMessage } from "./chat.service";
import { SessionDetailDto, SessionsService, SessionDto } from "./sessions.service";
import { DocumentDto, DocumentsService } from "../documents/documents.service";

/** M6: real RAG + streaming over the frozen flat SSE contract (citation → chunk* → done | error). */
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly sessions: SessionsService,
    private readonly documents: DocumentsService
  ) {}

  // ── M8 (API-M8-2/3): conversation history. ────────────────────────────────────────────────
  @Get("sessions")
  listSessions(): SessionDto[] {
    return this.sessions.list();
  }

  @Post("sessions")
  createSession(@Body() body: unknown): SessionDto {
    const b = (body ?? {}) as Record<string, unknown>;
    const title = typeof b.title === "string" ? b.title : undefined;
    return this.sessions.create(title);
  }

  @Get("sessions/:id")
  getSession(@Param("id") id: string): SessionDetailDto {
    return this.sessions.get(id);
  }

  // ── M8 (API-M8-7): chat document upload (no embedding/queue). ─────────────────────────────
  @Post("documents")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  async uploadChatDocument(
    @Req() req: ExpressRequest,
    @UploadedFile() file?: { buffer: Buffer; originalname: string }
  ): Promise<DocumentDto> {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException("A multipart file field named 'file' is required");
    }
    const title = typeof req.body?.title === "string" ? (req.body.title as string) : undefined;
    return this.documents.uploadChat(file.buffer, file.originalname, title);
  }

  // ── M6 + M8: RAG stream with optional session context + direct-mode attachments. ───────────
  @Post("stream")
  async stream(@Req() req: ExpressRequest, @Res() res: ExpressResponse): Promise<void> {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      res.status(400).json({ error: "question (non-empty string) required" });
      return;
    }

    // documentIds: optional array of strings; absent/empty → global retrieval (API-M6-1/2).
    let documentIds: string[] = [];
    if (body.documentIds !== undefined) {
      if (!Array.isArray(body.documentIds)) {
        res.status(400).json({ error: "documentIds must be an array of strings" });
        return;
      }
      documentIds = body.documentIds.filter((v): v is string => typeof v === "string");
    }

    // M8 (API-M8-2/4): sessionId → server-side history + persistence.
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim()
        : undefined;

    // M8 (API-CHAT-5): attachments → direct mode (takes precedence over RAG scope for this message).
    let attachments: string[] = [];
    if (body.attachments !== undefined) {
      if (!Array.isArray(body.attachments)) {
        res.status(400).json({ error: "attachments must be an array of strings" });
        return;
      }
      attachments = body.attachments.filter((v): v is string => typeof v === "string");
    }

    // history: client-provided fallback when no session (API-M6-3).
    const clientHistory: HistoryMessage[] = Array.isArray(body.history)
      ? body.history.filter(
          (m): m is HistoryMessage =>
            !!m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
      : [];

    const directMode = attachments.length > 0;
    let citations: Awaited<ReturnType<ChatService["retrieve"]>> = [];
    let directDocs: DirectDoc[] = [];
    let llmRes: Response;
    try {
      // Server-side history wins when a session is present (API-M8-4).
      const history = sessionId ? this.sessions.recentMessages(sessionId) : clientHistory;
      if (directMode) {
        directDocs = this.chat.loadDirectContext(attachments);
        llmRes = await this.chat.openCompletion(
          this.chat.buildMessagesDirect(question, history, directDocs)
        );
      } else if (documentIds.length > 0) {
        const directForScoped = this.chat.loadDirectContext(documentIds);
        if (directForScoped.length > 0) {
          directDocs = directForScoped;
          llmRes = await this.chat.openCompletion(
            this.chat.buildMessagesDirect(question, history, directDocs)
          );
        } else {
          citations = await this.chat.retrieve(question, documentIds);
          llmRes = await this.chat.openCompletion(
            this.chat.buildMessages(question, history, citations)
          );
        }
      } else {
        citations = await this.chat.retrieve(question, documentIds);
        llmRes = await this.chat.openCompletion(
          this.chat.buildMessages(question, history, citations)
        );
      }
    } catch (e) {
      res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
      return;
    }

    // First byte from here on — mid-stream failures become SSE `error` events.
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();
    const send = (obj: unknown) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

    // Client abort (ChatPage's AbortController) → release the upstream stream too.
    req.on("close", () => {
      void llmRes.body?.cancel();
    });

    // Emit citations: direct docs (attachments or direct content) → one per doc; RAG → with score.
    if (directDocs.length > 0) {
      for (const d of directDocs) {
        send({
          type: "citation",
          documentId: d.documentId,
          title: d.title,
          ...(d.pages != null ? { page: d.pages } : {}),
        });
      }
    } else {
      for (const c of citations) {
        send({
          type: "citation",
          documentId: c.documentId,
          title: c.title,
          ...(c.page != null ? { page: c.page } : {}),
          score: c.score,
        });
      }
    }

    // Accumulate the assistant text so a session can persist the full answer (API-M8-4).
    let fullText = "";
    try {
      for await (const delta of this.chat.readDeltas(llmRes)) {
        send({ type: "chunk", delta });
        fullText += delta;
      }
      send({ type: "done" });
      if (sessionId) {
        const refs = directMode
          ? directDocs.map((d) => ({
              documentId: d.documentId,
              title: d.title,
              ...(d.pages != null ? { page: d.pages } : {}),
            }))
          : citations.map((c) => ({
              documentId: c.documentId,
              title: c.title,
              ...(c.page != null ? { page: c.page } : {}),
            }));
        this.sessions.appendMessage(sessionId, "user", question);
        this.sessions.appendMessage(sessionId, "assistant", fullText, refs);
      }
    } catch (e) {
      send({ type: "error", reason: e instanceof Error ? e.message : String(e) });
    }
    res.end();
  }
}
