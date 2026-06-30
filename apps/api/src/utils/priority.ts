export const calculatePriorityScore = (
  priority: string,
  dueDate: string | Date | null | undefined,
  createdAt: Date = new Date()
): number => {
  let score = 0;
  
  // 1. User defined priority (25%)
  const priorityWeights: Record<string, number> = { CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25 };
  score += (priorityWeights[priority] || 50) * 0.25;

  // 2. Deadline urgency (35%)
  if (dueDate) {
    const hoursUntilDue = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDue < 0) score += 100 * 0.35; // Overdue
    else if (hoursUntilDue < 24) score += 90 * 0.35; // Due today
    else if (hoursUntilDue < 72) score += 70 * 0.35;
    else if (hoursUntilDue < 168) score += 40 * 0.35;
  }

  // 3. Recency of creation (5%)
  const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation < 24) score += 20 * 0.05; // Deprioritize newer tasks slightly

  // Assume effort_vs_time_left (20%) and dependency_blocking (15%) add base amounts for now
  score += 50 * 0.20; 
  score += 50 * 0.15;

  return Math.min(100, Math.max(0, score));
};
