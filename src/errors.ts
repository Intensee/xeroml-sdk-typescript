// @xeroml/sdk — Error classes matching API error codes

export interface ErrorBody {
  error?: {
    code?: string;
    message?: string;
    status?: number;
    request_id?: string;
    details?: Record<string, unknown>;
  };
}

export class XeroMLError extends Error {
  code: string;
  status: number;
  requestId: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, requestId?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "XeroMLError";
    this.status = status;
    this.code = code;
    this.requestId = requestId ?? "";
    this.details = details;
  }
}

export class XeroMLAuthError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(401, err?.code ?? "invalid_api_key", err?.message ?? "Invalid or revoked API key.", err?.request_id, err?.details);
    this.name = "XeroMLAuthError";
  }
}

export class XeroMLCreditError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(402, err?.code ?? "credits_exhausted", err?.message ?? "Credits exhausted.", err?.request_id, err?.details);
    this.name = "XeroMLCreditError";
  }
}

export class XeroMLRateLimitError extends XeroMLError {
  retryAfter: number;

  constructor(body: ErrorBody, retryAfter?: number) {
    const err = body.error;
    super(429, err?.code ?? "rate_limited", err?.message ?? "Rate limit exceeded.", err?.request_id, err?.details);
    this.name = "XeroMLRateLimitError";
    this.retryAfter = retryAfter ?? 60;
  }
}

export class XeroMLValidationError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(400, err?.code ?? "invalid_input", err?.message ?? "Invalid input.", err?.request_id, err?.details);
    this.name = "XeroMLValidationError";
  }
}

export class XeroMLParseError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(422, err?.code ?? "parse_failed", err?.message ?? "Parse failed.", err?.request_id, err?.details);
    this.name = "XeroMLParseError";
  }
}

export class XeroMLNotFoundError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(404, err?.code ?? "session_not_found", err?.message ?? "Session not found.", err?.request_id, err?.details);
    this.name = "XeroMLNotFoundError";
  }
}

export class XeroMLSessionEndedError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(409, err?.code ?? "session_ended", err?.message ?? "Session already ended.", err?.request_id, err?.details);
    this.name = "XeroMLSessionEndedError";
  }
}

export class XeroMLTimeoutError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(504, err?.code ?? "timeout", err?.message ?? "Request timed out.", err?.request_id, err?.details);
    this.name = "XeroMLTimeoutError";
  }
}

export class XeroMLServerError extends XeroMLError {
  constructor(body: ErrorBody) {
    const err = body.error;
    super(err?.status ?? 500, err?.code ?? "internal_error", err?.message ?? "Internal server error.", err?.request_id, err?.details);
    this.name = "XeroMLServerError";
  }
}

/**
 * Maps an HTTP error response to a typed XeroMLError.
 */
export function mapError(status: number, body: ErrorBody, retryAfter?: number): XeroMLError {
  switch (status) {
    case 401: return new XeroMLAuthError(body);
    case 402: return new XeroMLCreditError(body);
    case 429: return new XeroMLRateLimitError(body, retryAfter);
    case 400: return new XeroMLValidationError(body);
    case 422: return new XeroMLParseError(body);
    case 404: return new XeroMLNotFoundError(body);
    case 409: return new XeroMLSessionEndedError(body);
    case 504: return new XeroMLTimeoutError(body);
    default:  return new XeroMLServerError(body);
  }
}
