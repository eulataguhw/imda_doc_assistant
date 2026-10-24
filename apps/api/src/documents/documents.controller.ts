import { Controller, Get } from "@nestjs/common";
import { DocumentDto, DocumentsService } from "./documents.service";

@Controller("documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}
  @Get()
  list(): DocumentDto[] {
    return this.service.list();
  }
}
