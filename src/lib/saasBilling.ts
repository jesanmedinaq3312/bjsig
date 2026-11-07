export interface BillingNoticeForCollection {
  status: string;
  total_amount: number | string | null | undefined;
}

export interface BillingCollectionTotals {
  paidTotal: number;
  billedTotal: number;
  collectionRate: number | null;
}

const BILLABLE_NOTICE_STATUSES = new Set(["pending", "paid", "overdue"]);

/** Format a Date as a SQL `date` using its local calendar day, without converting through UTC. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Add civil calendar days, preserving the local date across timezone/DST changes. */
export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** A pending notice becomes overdue on the day after its local due date. */
export function getEffectiveBillingNoticeStatus(
  status: string,
  dueDate: string,
  today: string,
): string {
  return status === "pending" && dueDate < today ? "overdue" : status;
}

/** Drafts and cancelled notices are not issued debt and must not dilute collection rate. */
export function calculateBillingCollectionTotals(
  notices: BillingNoticeForCollection[],
): BillingCollectionTotals {
  const billableNotices = notices.filter((notice) => BILLABLE_NOTICE_STATUSES.has(notice.status));
  const billedTotal = billableNotices.reduce(
    (total, notice) => total + Number(notice.total_amount ?? 0),
    0,
  );
  const paidTotal = billableNotices
    .filter((notice) => notice.status === "paid")
    .reduce((total, notice) => total + Number(notice.total_amount ?? 0), 0);

  return {
    paidTotal,
    billedTotal,
    collectionRate: billedTotal > 0 ? paidTotal / billedTotal : null,
  };
}
