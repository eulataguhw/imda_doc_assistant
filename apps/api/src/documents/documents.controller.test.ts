import { describe, it, expect, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";

function makeService() {
  return { list: vi.fn(), delete: vi.fn(), upload: vi.fn(), uploadFile: vi.fn() };
}

describe("DocumentsController (API-M4-1/2, API-M5-2, API-M8-5/6)", () => {
  it("list() forwards a valid origin and drops unknown ones", () => {
    const svc = makeService();
    svc.list.mockReturnValue([]);
    const c = new DocumentsController(svc as any);

    c.list("knowledge");
    expect(svc.list).toHaveBeenLastCalledWith("knowledge");
    c.list("chat");
    expect(svc.list).toHaveBeenLastCalledWith("chat");
    c.list("bogus");
    expect(svc.list).toHaveBeenLastCalledWith(undefined);
    c.list();
    expect(svc.list).toHaveBeenLastCalledWith(undefined);
  });

  it("delete() delegates to the service", async () => {
    const svc = makeService();
    svc.delete.mockResolvedValue(undefined);
    await new DocumentsController(svc as any).delete("abc");
    expect(svc.delete).toHaveBeenCalledWith("abc");
  });

  it("create() validates title+content and rejects malformed bodies", async () => {
    const svc = makeService();
    svc.upload.mockResolvedValue({ id: "x" });
    const c = new DocumentsController(svc as any);

    await c.create({ title: "T", content: "C" } as any);
    expect(svc.upload).toHaveBeenCalledWith("T", "C");

    await expect(c.create({ title: "", content: "C" })).rejects.toThrow(BadRequestException);
    await expect(c.create({ title: "T" })).rejects.toThrow(BadRequestException);
    await expect(c.create(undefined)).rejects.toThrow(BadRequestException);
  });

  it("uploadFile() requires a multipart file buffer and forwards an optional title", async () => {
    const svc = makeService();
    svc.uploadFile.mockReturnValue({ id: "y" });
    const c = new DocumentsController(svc as any);

    await expect(c.uploadFile({ body: {} } as any, undefined)).rejects.toThrow(BadRequestException);

    await c.uploadFile({ body: { title: "My Doc" } } as any, {
      buffer: Buffer.from("x"),
      originalname: "a.pdf",
    });
    expect(svc.uploadFile).toHaveBeenCalledWith(Buffer.from("x"), "a.pdf", "My Doc");
  });
});
