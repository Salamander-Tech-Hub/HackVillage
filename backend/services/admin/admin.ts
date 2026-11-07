export class AdminError extends Error {
  code: "NOT_FOUND" | "FORBIDDEN" | "PRECONDITION_FAILED";

  constructor(code: AdminError["code"], message: string) {
    super(message);
    this.name = "AdminError";
    this.code = code;
  }
}
