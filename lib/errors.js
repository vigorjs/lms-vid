export class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function validationErrorMessage(error) {
  const issue = Array.isArray(error?.issues) ? error.issues[0] : null;
  return typeof issue?.message === "string" && issue.message ? issue.message : null;
}

export function actionErrorMessage(error, fallback) {
  return validationErrorMessage(error) || error?.message || fallback;
}

export function errorResponse(error) {
  if (error instanceof AppError) {
    return Response.json({ error: error.message, code: error.code }, { status: error.status });
  }

  const validationMessage = validationErrorMessage(error);
  if (validationMessage) {
    return Response.json({ error: validationMessage, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  console.error(error);
  return Response.json(
    { error: "Terjadi kesalahan pada server.", code: "INTERNAL_ERROR" },
    { status: 500 },
  );
}
