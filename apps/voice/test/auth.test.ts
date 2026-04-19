/**
 * Unit-test the auth middleware in isolation. Module-load env capture means
 * we re-import the module fresh inside each test using vi.resetModules() +
 * dynamic import.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

function makeReq(headers: Record<string, string> = {}): Request {
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;
}

function makeRes(): Response & { _status: number; _body: unknown } {
  const res = {
    _status: 0,
    _body: null as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return res as unknown as Response & { _status: number; _body: unknown };
}

afterEach(() => {
  delete process.env.VOICE_SHARED_SECRET;
  process.env.NODE_ENV = "test";
  vi.resetModules();
});

describe("requireSharedSecret middleware", () => {
  it("calls next() when VOICE_SHARED_SECRET is unset (dev fallback)", async () => {
    delete process.env.VOICE_SHARED_SECRET;
    process.env.NODE_ENV = "development";
    const { requireSharedSecret } = await import("../src/middleware/auth");
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireSharedSecret(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(0);
  });

  it("rejects with 401 when secret is set and header is missing", async () => {
    process.env.VOICE_SHARED_SECRET = "supersecret";
    const { requireSharedSecret } = await import("../src/middleware/auth");
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireSharedSecret(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "unauthorized" });
  });

  it("rejects with 401 when header value doesn't match", async () => {
    process.env.VOICE_SHARED_SECRET = "supersecret";
    const { requireSharedSecret } = await import("../src/middleware/auth");
    const req = makeReq({ "x-counter-token": "wrong" });
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireSharedSecret(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });

  it("returns 503 when production and VOICE_SHARED_SECRET unset", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.VOICE_SHARED_SECRET;
    const { requireSharedSecret } = await import("../src/middleware/auth");
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireSharedSecret(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(503);
    expect(res._body).toMatchObject({ error: "misconfigured" });
  });

  it("calls next() when header matches the secret", async () => {
    process.env.VOICE_SHARED_SECRET = "supersecret";
    const { requireSharedSecret } = await import("../src/middleware/auth");
    const req = makeReq({ "x-counter-token": "supersecret" });
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireSharedSecret(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(0);
  });
});
