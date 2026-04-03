export type Rating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface SRData {
  next_review_at: string;
  last_interval: number;
  ease_factor: number;
  consecutive_correct: number;
}

/**
 * SuperMemo 2 (SM-2) algorithm simplified for flashcards
 * @param rating User's rating of the card (1-4)
 * @param currentEaseFactor Current ease factor (default 2.5)
 * @param currentInterval Current interval in days (default 0)
 * @param consecutiveCorrect Number of times answered correctly in a row
 */
export function calculateSM2(
  rating: Rating,
  currentEaseFactor: number = 2.5,
  currentInterval: number = 0,
  consecutiveCorrect: number = 0
): SRData {
  let nextInterval: number;
  let easeFactor = currentEaseFactor;
  let correct = consecutiveCorrect;

  if (rating === 1) { // Again (Failed)
    correct = 0;
    nextInterval = 0; // Due immediately or tomorrow
    // Ease factor stays same or decreases slightly (we'll decrease standard SM-2 amount below)
  } else {
    correct += 1;
    if (correct === 1) {
      nextInterval = 1;
    } else if (correct === 2) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEaseFactor);
    }
  }

  // Adjust Ease Factor (minimum 1.3)
  easeFactor = currentEaseFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);

  if (rating === 1) {
      // If failed, make it visible immediately (0 days)
      nextInterval = 0;
  } else if (rating === 2) {
      // Hard: slight penalty to interval growth
      nextInterval = Math.round(currentInterval * 1.2); 
      // If it became 0 somehow but was correct, make it at least 1
      if (nextInterval <= 0) nextInterval = 1;
  } else if (rating === 4) {
      // Easy: extra bonus
      nextInterval = Math.round(nextInterval * 1.3);
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  if (nextInterval > 0) {
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  } else {
    // Due now (or practically soon)
  }
  
  return {
    next_review_at: nextReviewDate.toISOString(),
    last_interval: nextInterval,
    ease_factor: easeFactor,
    consecutive_correct: correct,
  };
}
