export interface WeightAverageResult {
  days: number;
  label: string;
  avgWeight: number | null;
  count: number;
  deltaFromCurrent: number | null;
}

export function calculatePeriodAverages(
  logs: { date: string; weight_kg: number }[],
  referenceDateStr?: string,
): WeightAverageResult[] {
  if (!logs || logs.length === 0) return [];

  // Sort chronologically (oldest to newest)
  const sorted = [...logs]
    .filter(
      (l) =>
        typeof l.weight_kg === 'number' &&
        !isNaN(l.weight_kg) &&
        l.weight_kg > 0,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) return [];

  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  refDate.setHours(23, 59, 59, 999);

  const currentWeight = sorted[sorted.length - 1].weight_kg;
  const periods = [7, 14, 21, 28];

  return periods.map((days) => {
    const cutoff = new Date(refDate);
    cutoff.setDate(refDate.getDate() - days);

    // Filter logs that fall within the [cutoff, refDate] window
    const windowLogs = sorted.filter((l) => {
      const d = new Date(l.date);
      return d >= cutoff && d <= refDate;
    });

    if (windowLogs.length === 0) {
      return {
        days,
        label: `${days} Days`,
        avgWeight: null,
        count: 0,
        deltaFromCurrent: null,
      };
    }

    const sum = windowLogs.reduce((acc, curr) => acc + curr.weight_kg, 0);
    const avg = Number((sum / windowLogs.length).toFixed(2));
    const delta = Number((currentWeight - avg).toFixed(2));

    return {
      days,
      label: `${days}D Avg`,
      avgWeight: avg,
      count: windowLogs.length,
      deltaFromCurrent: delta,
    };
  });
}
