export class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error) {
  if (error instanceof AppError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }

  console.error(error);
  return Response.json(
    { error: "Terjadi kesalahan pada server.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
