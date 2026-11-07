import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calculateBillingCollectionTotals,
  getEffectiveBillingNoticeStatus,
  toLocalDateString,
} from "./saasBilling";

describe("SaaS billing calculations", () => {
  it("excludes drafts and cancelled notices from collection rate", () => {
    const totals = calculateBillingCollectionTotals([
      { status: "paid", total_amount: 200 },
      { status: "pending", total_amount: 300 },
      { status: "overdue", total_amount: 500 },
      { status: "draft", total_amount: 1_000 },
      { status: "cancelled", total_amount: 2_000 },
    ]);

    expect(totals).toEqual({ paidTotal: 200, billedTotal: 1_000, collectionRate: 0.2 });
  });

  it("returns no collection rate when there are no issued notices", () => {
    expect(
      calculateBillingCollectionTotals([
        { status: "draft", total_amount: 100 },
        { status: "cancelled", total_amount: 200 },
      ]),
    ).toEqual({ paidTotal: 0, billedTotal: 0, collectionRate: null });
  });

  it("derives overdue for a pending notice after its due date", () => {
    expect(getEffectiveBillingNoticeStatus("pending", "2026-11-05", "2026-11-06")).toBe("overdue");
    expect(getEffectiveBillingNoticeStatus("pending", "2026-11-06", "2026-11-06")).toBe("pending");
    expect(getEffectiveBillingNoticeStatus("draft", "2026-11-01", "2026-11-06")).toBe("draft");
    expect(getEffectiveBillingNoticeStatus("cancelled", "2026-11-01", "2026-11-06")).toBe(
      "cancelled",
    );
  });

  it("formats the local civil date without converting it to UTC", () => {
    expect(toLocalDateString(new Date(2026, 10, 6, 23, 30))).toBe("2026-11-06");
  });

  it("adds calendar days using the local calendar", () => {
    expect(toLocalDateString(addCalendarDays(new Date(2026, 10, 6, 23, 30), 30))).toBe(
      "2026-12-06",
    );
  });
});
