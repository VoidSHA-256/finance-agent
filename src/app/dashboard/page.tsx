import { getBudgetStatus } from "@/lib/budgets";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  const statuses = await getBudgetStatus();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Budgets</h1>
      <p className={styles.subtitle}>Spending against your limits this period.</p>

      {statuses.length === 0 ? (
        <p className={styles.empty}>No budgets set yet.</p>
      ) : (
        <div className={styles.grid}>
          {statuses.map((status) => {
            const spentRatio = Math.min(parseFloat(status.spent) / parseFloat(status.limitAmount), 1);
            return (
              <div key={status.budgetId} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.category}>{status.categoryName}</span>
                  <span className={styles.period}>{status.period}</span>
                </div>

                <div className={styles.barTrack}>
                  <div
                    className={status.overBudget ? `${styles.barFill} ${styles.barFillOver}` : styles.barFill}
                    style={{ width: `${spentRatio * 100}%` }}
                  />
                </div>

                <div className={styles.stats}>
                  <span>
                    <span className={styles.statValue}>${status.spent}</span>{" "}
                    <span className={styles.statLabel}>of ${status.limitAmount}</span>
                  </span>
                  <span className={status.overBudget ? styles.remainingNegative : styles.remainingPositive}>
                    ${status.remaining} left
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
