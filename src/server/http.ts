import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function route<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
         if (err instanceof ZodError) {
        const issue = err.issues[0];
        const where = issue?.path.join(".") || "root";
        console.error("[validation]", where, issue?.message, err.issues.slice(0, 5));
        return NextResponse.json(
          { error: `Validation failed at "${where}": ${issue?.message ?? "unknown"}`, issues: err.issues },
          { status: 400 },
        );
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}