/* --------------------------------------------------------------- messages -- */

export function iliasError(status, code, detail) {
  const error = new Error(code);
  error.status = status;
  if (detail) error.detail = String(detail).slice(0, 300);
  return error;
}
