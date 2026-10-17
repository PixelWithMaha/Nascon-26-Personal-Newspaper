import { describe, expect, it } from "vitest";
import { readersToPrint } from "./cron";

describe("readersToPrint", () => {
  const now = new Date("2026-10-17T00:45:00Z"); // 05:45 in Karachi, still Oct 16 in New York

  it("uses each reader's own date and skips who already has a paper", () => {
    const readers = [
      { userId: "karachi", timezone: "Asia/Karachi" },
      { userId: "newyork", timezone: "America/New_York" },
      { userId: "done", timezone: "Asia/Karachi" },
    ];
    const printed = new Set(["done:2026-10-17"]);

    const queue = readersToPrint(readers, printed, now);
    expect(queue).toEqual([
      { userId: "karachi", timezone: "Asia/Karachi", date: "2026-10-17" },
      { userId: "newyork", timezone: "America/New_York", date: "2026-10-16" },
    ]);
  });
});