import { describe, it, expect, vi, afterEach } from "vitest";
import {
  listDocuments,
  deleteDocument,
  uploadChatDocument,
  listSessions,
  createSession,
  getSession,
} from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api.ts M8 helpers (WEB-M8-4/5)", () => {
  it("listDocuments('chat') sends the origin query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: "c1" }] });
    vi.stubGlobal("fetch", fetchMock);
    expect(await listDocuments("chat")).toEqual([{ id: "c1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents?origin=chat");
  });

  it("listDocuments() omits the origin param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    await listDocuments();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents");
  });

  it("deleteDocument resolves on 204 and sends DELETE (id URL-encoded)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    await deleteDocument("abc/1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents/abc%2F1");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("deleteDocument throws on a non-204 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(deleteDocument("nope")).rejects.toThrow(/404/);
  });

  it("uploadChatDocument posts multipart with the optional title", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "c9", title: "T", pages: 4 }) });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    expect(await uploadChatDocument(file, "My Doc")).toMatchObject({ id: "c9", pages: 4 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat/documents");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("title")).toBe("My Doc");
  });

  it("listSessions / createSession / getSession hit the right endpoints", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ id: "s1" }] });
    expect(await listSessions()).toEqual([{ id: "s1" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/chat/sessions");

    fetchMock.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: "s2", title: "New" }) });
    expect(await createSession("New")).toMatchObject({ id: "s2" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/chat/sessions");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ title: "New" });

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "s3", messages: [] }) });
    expect(await getSession("s3")).toMatchObject({ id: "s3" });
    expect(fetchMock.mock.calls[2][0]).toBe("/api/chat/sessions/s3");
  });

  it("createSession without a title posts an empty object", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "s4" }) });
    vi.stubGlobal("fetch", fetchMock);
    await createSession();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
  });
});
