/** One error shape for every client call. */
export class ApiError extends Error {
  constructor(code, status = 0, detail = undefined, body = undefined) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}
