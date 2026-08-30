export const MACRO_GROUPS: Record<string, string[]> = {
  Chest: ['Chest'],
  Back: ['Lats', 'Mid Back', 'Traps', 'Lower Back', 'Neck'],
  Shoulders: ['Anterior Delt', 'Lateral Delt', 'Posterior Delt'],
  Arms: ['Biceps', 'Triceps', 'Brachialis', 'Forearms'],
  Legs: ['Quads', 'Hamstrings', 'Calves', 'Adductor', 'Abductor'],
  Core: ['Abs'],
};

export function calculateMuscleDistribution(
  sessions: any[],
  exerciseDict: Record<string, string>, // NEW parameter
  days: number = 30,
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const prevCutoffDate = new Date(cutoffDate);
  prevCutoffDate.setDate(prevCutoffDate.getDate() - days);

  const distribution = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Legs: 0,
    Core: 0,
  };
  const prevDistribution = {
    Chest: 0,
    Back: 0,
    Shoulders: 0,
    Arms: 0,
    Legs: 0,
    Core: 0,
  };

  let totalWorkouts = 0,
    totalDuration = 0,
    totalVolume = 0,
    totalSets = 0;
  let prevWorkouts = 0,
    prevDuration = 0,
    prevVolume = 0,
    prevSets = 0;

  sessions.forEach((session) => {
    if (session.status !== 'completed') return;

    const sessionDate = new Date(session.start_time);
    const isCurrent = sessionDate >= cutoffDate;
    const isPrevious =
      sessionDate >= prevCutoffDate && sessionDate < cutoffDate;

    if (!isCurrent && !isPrevious) return;

    const duration = session.duration_seconds || 0;

    if (isCurrent) {
      totalWorkouts++;
      totalDuration += duration;
    } else if (isPrevious) {
      prevWorkouts++;
      prevDuration += duration;
    }

    session.exercises?.forEach((ex: any) => {
      /* Fall back to the dictionary when the logged set carries no muscle */
      const muscle = ex.primary_muscle || exerciseDict[ex.name];
      const validSets = ex.sets?.filter((s: any) => s.completed) || [];
      const setCount = validSets.length;

      validSets.forEach((s: any) => {
        const vol = (s.weight_kg || 0) * (s.reps || 0);
        if (isCurrent) totalVolume += vol;
        if (isPrevious) prevVolume += vol;
      });

      if (isCurrent) totalSets += setCount;
      if (isPrevious) prevSets += setCount;

      for (const [group, muscles] of Object.entries(MACRO_GROUPS)) {
        if (muscles.includes(muscle)) {
          if (isCurrent)
            distribution[group as keyof typeof distribution] += setCount;
          if (isPrevious)
            prevDistribution[group as keyof typeof prevDistribution] +=
              setCount;
          break;
        }
      }
    });
  });

  const chartData = Object.keys(distribution).map((subject) => ({
    subject,
    current: distribution[subject as keyof typeof distribution],
    previous: prevDistribution[subject as keyof typeof prevDistribution],
  }));

  return {
    chartData,
    stats: {
      workouts: { current: totalWorkouts, delta: totalWorkouts - prevWorkouts },
      duration: { current: totalDuration, delta: totalDuration - prevDuration },
      volume: { current: totalVolume, delta: totalVolume - prevVolume },
      sets: { current: totalSets, delta: totalSets - prevSets },
    },
  };
}
