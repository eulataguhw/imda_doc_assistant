import { Controller, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

interface ChatRequestBody { question?: string; documentIds?: string[]; }

/** M3 wires real RAG + streaming. The M1 stub fixes the SSE contract: citation -> chunks -> done. */
@Controller("chat")
export class ChatController {
  @Post("stream")
  stream(@Req() req: Request, @Res() res: Response): void {
    const body = (req.body ?? {}) as ChatRequestBody;
    if (!body || typeof body.question !== "string" || !Array.isArray(body.documentIds)) {
      res.status(400).json({ error: "question (string) and documentIds (array) required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    for (const id of body.documentIds) {
      res.write(`data: ${JSON.stringify({ type: "citation", documentId: id })}\n\n`);
    }
    const chunks = ["This is a stub answer. ", "M3 streams real LLM tokens. "];
    for (const delta of chunks) {
      res.write(`data: ${JSON.stringify({ type: "chunk", delta })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
}
