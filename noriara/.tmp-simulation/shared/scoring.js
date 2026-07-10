/**
 * Calculate the score for a single puzzle solve.
 * @param index - The puzzle index (0-based)
 * @param solveTimeMs - Time taken to solve this puzzle in milliseconds
 * @param currentCombo - The current active combo multiplier
 */
export function calculatePuzzleScore(index, solveTimeMs, currentCombo) {
    let baseScore = 100; // Easy
    if (index >= 3 && index < 7) {
        baseScore = 200; // Medium
    }
    else if (index >= 7) {
        baseScore = 300; // Hard
    }
    // Speed bonus up to 50 points if solved under 1.5 seconds.
    // Linearly drops to 0 at 5+ seconds.
    const maxSpeedBonus = 50;
    const speedBonus = solveTimeMs < 1500
        ? maxSpeedBonus
        : Math.max(0, Math.floor(maxSpeedBonus * (1 - (solveTimeMs - 1500) / 3500)));
    const comboBonus = currentCombo * 10;
    return {
        baseScore,
        speedBonus,
        comboBonus,
        totalScore: baseScore + speedBonus + comboBonus,
    };
}
