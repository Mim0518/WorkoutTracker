import { Injectable } from '@angular/core';
import { WorkoutService } from './workout.service';

export interface OverloadRecommendation {
    exerciseName: string;
    currentWeight: number;
    suggestedWeight: number;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
}

export interface DeloadRecommendation {
    shouldDeload: boolean;
    reason: string;
    suggestedDuration: number; // days
    suggestedVolumeReduction: number; // percentage
}

export interface WorkoutNotification {
    type: 'progressive-overload' | 'deload' | 'weight-suggestion' | 'personal-record';
    title: string;
    message: string;
    exerciseName?: string;
    actionable: boolean;
    data?: any;
}

export interface ExerciseSession {
    date: Date;
    sets: { reps: number; weight: number }[];
    workoutName: string;
}

// Common leg exercises for detecting lower body movements
const LEG_EXERCISES = [
    'squat', 'deadlift', 'leg press', 'lunge', 'romanian deadlift',
    'front squat', 'hack squat', 'bulgarian split squat', 'leg curl', 'leg extension'
];

@Injectable({
    providedIn: 'root'
})
export class PredictionService {

    constructor(private workoutService: WorkoutService) { }

    /**
     * Get suggested weight for an exercise based on recent performance
     * Uses exponential weighted average of last 5 sessions
     */
    async getSuggestedWeight(exerciseName: string): Promise<number | null> {
        const history = await this.workoutService.getExerciseHistory(exerciseName, 5);

        if (history.length === 0) {
            return null;
        }

        // Filter for successful sets (8+ reps as a general target)
        const weights: number[] = [];
        const sessionWeights = [0.5, 0.25, 0.15, 0.07, 0.03]; // Exponential weights

        history.forEach((session, index) => {
            const successfulSets = session.sets.filter((set: { reps: number; weight: number }) => set.reps >= 8);
            if (successfulSets.length > 0) {
                const avgWeight = successfulSets.reduce((sum: number, set: { weight: number }) => sum + set.weight, 0) / successfulSets.length;
                weights.push(avgWeight * sessionWeights[index]);
            }
        });

        if (weights.length === 0) {
            return null;
        }

        const suggestedWeight = weights.reduce((sum, w) => sum + w, 0);

        // Round to nearest 2.5kg
        return Math.round(suggestedWeight / 2.5) * 2.5;
    }

    /**
     * Check if user is ready for progressive overload
     * Returns recommendation if user has completed target reps for 2 consecutive sessions
     */
    async getProgressiveOverloadRecommendation(exerciseName: string): Promise<OverloadRecommendation | null> {
        const history = await this.workoutService.getExerciseHistory(exerciseName, 3);

        if (history.length < 2) {
            return null;
        }

        const [mostRecent, secondRecent] = history;

        // Check if both sessions used the same weight
        const recentWeights = mostRecent.sets.map((s: { weight: number }) => s.weight);
        const secondWeights = secondRecent.sets.map((s: { weight: number }) => s.weight);

        const recentAvgWeight = recentWeights.reduce((a: number, b: number) => a + b, 0) / recentWeights.length;
        const secondAvgWeight = secondWeights.reduce((a: number, b: number) => a + b, 0) / secondWeights.length;

        // Allow 2.5kg variance (same weight essentially)
        if (Math.abs(recentAvgWeight - secondAvgWeight) > 2.5) {
            return null;
        }

        // Check if user completed target reps (10+) in at least 3 sets for both sessions
        const recentSuccess = mostRecent.sets.filter((s: { reps: number }) => s.reps >= 10).length >= 3;
        const secondSuccess = secondRecent.sets.filter((s: { reps: number }) => s.reps >= 10).length >= 3;

        if (!recentSuccess || !secondSuccess) {
            return null;
        }

        // Determine if it's a leg exercise
        const isLegExercise = LEG_EXERCISES.some(leg =>
            exerciseName.toLowerCase().includes(leg)
        );

        const increment = isLegExercise ? 5 : 2.5;
        const suggestedWeight = Math.round((recentAvgWeight + increment) / 2.5) * 2.5;

        return {
            exerciseName,
            currentWeight: Math.round(recentAvgWeight * 10) / 10,
            suggestedWeight,
            reason: $localize`:@@prediction.overload.reason:You've completed 3+ sets of 10 reps for 2 consecutive sessions. Time to increase!`,
            confidence: 'high'
        };
    }

    /**
     * Detect if user needs a deload week
     * Analyzes performance trends and training frequency
     */
    async detectDeloadNeed(): Promise<DeloadRecommendation | null> {
        const recentWorkouts = await this.workoutService.getRecentWorkouts(28); // 4 weeks

        if (recentWorkouts.length < 8) {
            // Not enough data
            return null;
        }

        // Check for rest weeks (3+ consecutive days without training)
        const hasRecentRest = this.hasRestWeek(recentWorkouts, 28);

        if (hasRecentRest) {
            return null; // Already had a deload/rest
        }

        // Check for performance drops
        const performanceDrop = await this.detectPerformanceDrop(recentWorkouts);

        if (performanceDrop) {
            return {
                shouldDeload: true,
                reason: $localize`:@@prediction.deload.reasonDrop:Performance has dropped across multiple exercises. Your body needs recovery.`,
                suggestedDuration: 7,
                suggestedVolumeReduction: 30
            };
        }

        // Check for 4+ weeks of consistent training without rest
        if (recentWorkouts.length >= 12) {
            return {
                shouldDeload: true,
                reason: $localize`:@@prediction.deload.reasonConsistent:You've been training consistently for 4+ weeks. A deload will help you come back stronger.`,
                suggestedDuration: 5,
                suggestedVolumeReduction: 25
            };
        }

        return null;
    }

    /**
     * Get all actionable notifications for the user
     */
    async getReadinessNotifications(): Promise<WorkoutNotification[]> {
        const notifications: WorkoutNotification[] = [];

        // Check for deload need (highest priority)
        const deloadRec = await this.detectDeloadNeed();
        if (deloadRec && deloadRec.shouldDeload) {
            notifications.push({
                type: 'deload',
                title: $localize`:@@prediction.deload.title:Consider a Deload Week`,
                message: deloadRec.reason,
                actionable: true,
                data: deloadRec
            });
        }

        // Check for progressive overload opportunities
        const allExercises = await this.getAllUniqueExercises();

        for (const exerciseName of allExercises.slice(0, 5)) { // Limit to top 5 to avoid spam
            const overloadRec = await this.getProgressiveOverloadRecommendation(exerciseName);
            if (overloadRec) {
                notifications.push({
                    type: 'progressive-overload',
                    title: $localize`:@@prediction.overload.title:Ready to Progress!`,
                    message: $localize`:@@prediction.overload.message:You've been crushing ${exerciseName}:exerciseName:. Try ${overloadRec.suggestedWeight}:weight:kg next time!`,
                    exerciseName: exerciseName,
                    actionable: true,
                    data: overloadRec
                });
            }
        }

        return notifications;
    }

    // Helper methods

    private hasRestWeek(workouts: any[], days: number): boolean {
        if (workouts.length === 0) return false;

        const sortedWorkouts = [...workouts].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        for (let i = 0; i < sortedWorkouts.length - 1; i++) {
            const current = new Date(sortedWorkouts[i].date);
            const next = new Date(sortedWorkouts[i + 1].date);
            const daysDiff = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff >= 3) {
                return true;
            }
        }

        return false;
    }

    private async detectPerformanceDrop(workouts: any[]): Promise<boolean> {
        if (workouts.length < 8) return false;

        // Split into recent (last 2 weeks) and previous (2 weeks before that)
        const midpoint = Math.floor(workouts.length / 2);
        const recentWorkouts = workouts.slice(0, midpoint);
        const previousWorkouts = workouts.slice(midpoint);

        // Calculate average volume (weight × reps) for common exercises
        const recentVolume = this.calculateAverageVolume(recentWorkouts);
        const previousVolume = this.calculateAverageVolume(previousWorkouts);

        let droppedExercises = 0;

        for (const [exercise, recentVol] of Object.entries(recentVolume)) {
            const prevVol = previousVolume[exercise];
            if (prevVol) {
                const dropPercentage = ((prevVol - recentVol) / prevVol) * 100;
                if (dropPercentage > 15) {
                    droppedExercises++;
                }
            }
        }

        return droppedExercises >= 2;
    }

    private calculateAverageVolume(workouts: any[]): Record<string, number> {
        const volumeMap: Record<string, number[]> = {};

        workouts.forEach(workout => {
            workout.exercises.forEach((ex: { name: string; sets: { weight: number; reps: number }[] }) => {
                const volume = ex.sets.reduce((sum: number, set: any) =>
                    sum + (set.weight * set.reps), 0
                );

                if (!volumeMap[ex.name]) {
                    volumeMap[ex.name] = [];
                }
                volumeMap[ex.name].push(volume);
            });
        });

        const avgVolume: Record<string, number> = {};
        for (const [exercise, volumes] of Object.entries(volumeMap)) {
            avgVolume[exercise] = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        }

        return avgVolume;
    }

    private async getAllUniqueExercises(): Promise<string[]> {
        const workouts = await this.workoutService.getRecentWorkouts(90);
        const exerciseSet = new Set<string>();

        workouts.forEach(workout => {
            workout.exercises.forEach((ex: { name: string }) => {
                exerciseSet.add(ex.name);
            });
        });

        return Array.from(exerciseSet);
    }
}
