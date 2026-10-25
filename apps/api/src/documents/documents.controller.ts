import { Body, BadRequestException, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { DocumentDto, DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(): DocumentDto[] {
    return this.service.list();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: unknown): Promise<DocumentDto> {
    const { title, content } = (body ?? {}) as { title?: unknown; content?: unknown };
    if (typeof title !== "string" || typeof content !== "string" || !title.trim() || !content.trim()) {
      throw new BadRequestException("title and content are required");
    }
    return this.service.upload(title.trim(), content.trim());
  }
}
