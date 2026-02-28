import { describe, it, expect } from "vitest";
import {
  mapError,
  XeroMLAuthError,
  XeroMLCreditError,
  XeroMLRateLimitError,
  XeroMLValidationError,
  XeroMLParseError,
  XeroMLNotFoundError,
  XeroMLSessionEndedError,
  XeroMLTimeoutError,
  XeroMLServerError,
  XeroMLError,
} from "../src/errors";

const body = (code: string, message: string) => ({
  error: { code, message, request_id: "req_123" },
});

describe("mapError", () => {
  it("maps 401 to XeroMLAuthError", () => {
    const err = mapError(401, body("invalid_api_key", "Bad key"));
    expect(err).toBeInstanceOf(XeroMLAuthError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("invalid_api_key");
    expect(err.requestId).toBe("req_123");
  });

  it("maps 402 to XeroMLCreditError", () => {
    const err = mapError(402, body("credits_exhausted", "No credits"));
    expect(err).toBeInstanceOf(XeroMLCreditError);
    expect(err.status).toBe(402);
  });

  it("maps 429 to XeroMLRateLimitError with retryAfter", () => {
    const err = mapError(429, body("rate_limited", "Slow down"), 30);
    expect(err).toBeInstanceOf(XeroMLRateLimitError);
    expect(err.status).toBe(429);
    expect((err as XeroMLRateLimitError).retryAfter).toBe(30);
  });

  it("maps 429 defaults retryAfter to 60", () => {
    const err = mapError(429, body("rate_limited", "Slow down"));
    expect((err as XeroMLRateLimitError).retryAfter).toBe(60);
  });

  it("maps 400 to XeroMLValidationError", () => {
    const err = mapError(400, body("invalid_input", "Bad input"));
    expect(err).toBeInstanceOf(XeroMLValidationError);
    expect(err.status).toBe(400);
  });

  it("maps 422 to XeroMLParseError", () => {
    const err = mapError(422, body("parse_failed", "Parse failed"));
    expect(err).toBeInstanceOf(XeroMLParseError);
    expect(err.status).toBe(422);
  });

  it("maps 404 to XeroMLNotFoundError", () => {
    const err = mapError(404, body("session_not_found", "Not found"));
    expect(err).toBeInstanceOf(XeroMLNotFoundError);
    expect(err.status).toBe(404);
  });

  it("maps 409 to XeroMLSessionEndedError", () => {
    const err = mapError(409, body("session_ended", "Already ended"));
    expect(err).toBeInstanceOf(XeroMLSessionEndedError);
    expect(err.status).toBe(409);
  });

  it("maps 504 to XeroMLTimeoutError", () => {
    const err = mapError(504, body("timeout", "Timed out"));
    expect(err).toBeInstanceOf(XeroMLTimeoutError);
    expect(err.status).toBe(504);
  });

  it("maps unknown status to XeroMLServerError", () => {
    const err = mapError(503, body("internal_error", "Server error"));
    expect(err).toBeInstanceOf(XeroMLServerError);
    expect(err).toBeInstanceOf(XeroMLError);
  });

  it("uses defaults when body.error is undefined", () => {
    const err = mapError(401, {});
    expect(err).toBeInstanceOf(XeroMLAuthError);
    expect(err.code).toBe("invalid_api_key");
    expect(err.message).toBe("Invalid or revoked API key.");
  });
});
