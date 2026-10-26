import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { DocumentDto, DocumentsService } from "./documents.service";

// PONYTAIL: local structural type instead of the `Express.Multer.File` global — @types/multer's
// global augmentation does not load under this tsconfig (tsgo/TS7); we only need these two fields.
interface UploadedFileLike {
  buffer: Buffer;
  originalname: string;
}

@Controller("documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(@Query("origin") origin?: string): DocumentDto[] {
    // M8 (API-M8-5): only accept the two known origins; anything else → unfiltered.
    const o = origin === "knowledge" || origin === "chat" ? origin : undefined;
    return this.service.list(o);
  }

  /** M8 (API-M8-6): remove a document (row + Qdrant points for knowledge docs). */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string): Promise<void> {
    await this.service.delete(id);
  }

  /** M4 JSON text path — unchanged. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<DocumentDto> {
    const { title, content } = (body ?? {}) as { title?: unknown; content?: unknown };
    if (
      typeof title !== "string" ||
      typeof content !== "string" ||
      !title.trim() ||
      !content.trim()
    ) {
      throw new BadRequestException("title and content are required");
    }
    return this.service.upload(title.trim(), content.trim());
  }

  /** M5 multipart upload: field `file` (.pdf/.docx), optional form field `title`. Returns 201 immediately; indexing runs in the background queue. */
  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: UploadedFileLike | undefined
  ): Promise<DocumentDto> {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException("A multipart file field named 'file' is required");
    }
    // Non-file form fields land in req.body (multer).
    const title = typeof req.body?.title === "string" ? (req.body.title as string) : undefined;
    return this.service.uploadFile(file.buffer, file.originalname, title);
  }
}
