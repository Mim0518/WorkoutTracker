
import { Injectable, signal, computed, inject } from '@angular/core';
import { Workout } from '../models/workout.model';
import { db } from '../db/workout-db';
import { MockDataGenerator } from '../utils/mock-data.generator';
import { PRService, PRNotification } from './pr.service';
import { WorkoutNotification } from './prediction.service';
import { toInputDateString } from '../utils/date.utils';

@Injectable({
    providedIn: 'root'
})
export class WorkoutService {
    private workoutsSignal = signal<Workout[]>([]);
    private prNotificationsSignal = signal<WorkoutNotification[]>([]);

    // Simple injection (WorkoutService -> PRService is fine as PRService only depends on DB)
    private prService = inject(PRService);

    workouts = computed(() => this.workoutsSignal());
    pendingPRNotifications = computed(() => this.prNotificationsSignal());

    constructor() {
        this.loadWorkouts();
    }

    async generateDemoData() {
        try {
            const mockWorkouts = MockDataGenerator.generate(30); // 30 workouts ~ 3 months

            await db.transaction('rw', db.workouts, async () => {
                await db.workouts.clear();
                await db.workouts.bulkAdd(mockWorkouts);
            });
            window.location.reload();
        } catch (error) {
            console.error('Failed to generate demo data', error);
        }
    }

    private async loadWorkouts() {
        try {
            const workouts = await db.workouts.orderBy('date').reverse().toArray();
            this.workoutsSignal.set(workouts);
        } catch (error) {
            console.error('Failed to load workouts from DB', error);
        }
    }

    async addWorkout(workout: Workout): Promise<PRNotification[]> {
        try {
            await db.workouts.add(workout);
            // Check for PRs
            const newPRs = await this.prService.checkForPRs(workout);
            if (newPRs.length > 0) {
                this.storePRNotifications(newPRs);
            }

            // Reload to ensure consistency (or we could optimistically update the signal)
            await this.loadWorkouts();
            return newPRs;
        } catch (error) {
            console.error('Failed to add workout', error);
            return [];
        }
    }

    async updateWorkout(updatedWorkout: Workout): Promise<PRNotification[]> {
        try {
            await db.workouts.put(updatedWorkout);

            // Check for PRs
            const newPRs = await this.prService.checkForPRs(updatedWorkout);
            if (newPRs.length > 0) {
                this.storePRNotifications(newPRs);
            }

            await this.loadWorkouts();
            return newPRs;
        } catch (error) {
            console.error('Failed to update workout', error);
            return [];
        }
    }

    private storePRNotifications(prs: PRNotification[]) {
        const typeLabels: { [key: string]: string } = {
            '1RM': '1RM',
            'MaxWeight': $localize`:@@pr.type.maxWeight:Max Weight`,
            'Volume': $localize`:@@pr.type.volume:Volume`,
            'RepMax': $localize`:@@pr.type.repMax:Max Reps`
        };

        const cards: WorkoutNotification[] = prs.map(pr => {
            // Estimated 1RM is calculated, not actually performed — show as informational
            if (pr.type === '1RM') {
                return {
                    type: 'weight-suggestion' as const,
                    title: $localize`:@@pr.card.estimated1rm:Estimated 1RM Updated`,
                    message: `${pr.exerciseName} — ${$localize`:@@pr.card.estimated1rmDetail:Est. 1RM`}: ${pr.value}kg`,
                    exerciseName: pr.exerciseName,
                    actionable: false
                };
            }

            // Real PRs: Max Weight, Volume, Max Reps
            return {
                type: 'personal-record' as const,
                title: $localize`:@@pr.card.title:New Personal Record!`,
                message: `${pr.exerciseName} — ${typeLabels[pr.type] || pr.type}: ${pr.value}`,
                exerciseName: pr.exerciseName,
                actionable: false
            };
        });

        this.prNotificationsSignal.update(existing => [...existing, ...cards]);
    }

    clearPRNotifications() {
        this.prNotificationsSignal.set([]);
    }

    async deleteWorkout(id: string) {
        try {
            await db.workouts.delete(id);
            await this.loadWorkouts();
        } catch (error) {
            console.error('Failed to delete workout', error);
        }
    }

    async clearDatabase() {
        try {
            await db.delete();
            window.location.reload();
        } catch (error) {
            console.error('Failed to clear database', error);
        }
    }

    async exportData() {
        try {
            const workouts = await db.workouts.toArray();
            const dataStr = JSON.stringify(workouts, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            const date = toInputDateString(new Date());
            a.download = `workout-tracker-backup-${date}.json`;
            a.click();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export data', error);
        }
    }

    async importData(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const json = e.target?.result as string;
                    const data = JSON.parse(json);

                    if (!Array.isArray(data)) {
                        throw new Error('Invalid data format: Expected an array');
                    }

                    // Simple schema check on first item if exists
                    if (data.length > 0 && (!data[0].id || !data[0].date)) {
                        throw new Error('Invalid data format: Missing required fields');
                    }

                    // Restore Dates
                    const parsedData = data.map((w: any) => ({
                        ...w,
                        date: new Date(w.date)
                    }));

                    // Transaction: Clear and Add
                    await db.transaction('rw', db.workouts, async () => {
                        await db.workouts.clear();
                        await db.workouts.bulkAdd(parsedData);
                    });

                    // Recalculate PRs from scratch
                    // We need to fetch all workouts properly typed to pass to recalculate
                    const allWorkouts = await db.workouts.orderBy('date').toArray();
                    await this.prService.recalculateAllPRs(allWorkouts);

                    window.location.reload();
                    resolve();

                } catch (error) {
                    console.error('Failed to import data', error);
                    reject(error);
                }
            };
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    getWorkout(id: string) {
        return computed(() => this.workoutsSignal().find(w => w.id === id));
    }
    async getExerciseStats(exerciseName: string, excludeWorkoutId?: string): Promise<{ max: number; max10: number; historyCount: number }> {
        const lowerName = exerciseName.toLowerCase().trim();
        if (!lowerName) return { max: 0, max10: 0, historyCount: 0 };

        let workouts = await db.workouts.toArray();

        if (excludeWorkoutId) {
            workouts = workouts.filter(w => w.id !== excludeWorkoutId);
        }

        let max = 0;
        let max10 = 0;
        let count = 0;

        workouts.forEach(w => {
            // Find exercises matching the name (case-insensitive)
            const matches = w.exercises.filter(e => e.name.toLowerCase().trim() === lowerName);
            if (matches.length > 0) {
                count++;
                matches.forEach(ex => {
                    ex.sets.forEach(s => {
                        if (s.weight > max) max = s.weight;
                        if (s.reps >= 10 && s.weight > max10) max10 = s.weight;
                    });
                });
            }
        });

        return { max, max10, historyCount: count };
    }

    /**
     * Get exercise history for predictions
     * Returns chronological sessions (most recent first)
     */
    async getExerciseHistory(exerciseName: string, limit: number = 10): Promise<any[]> {
        const lowerName = exerciseName.toLowerCase().trim();
        if (!lowerName) return [];

        const workouts = await db.workouts.orderBy('date').reverse().toArray();
        const sessions: any[] = [];

        for (const workout of workouts) {
            const matchingExercises = workout.exercises.filter(e =>
                e.name.toLowerCase().trim() === lowerName
            );

            if (matchingExercises.length > 0) {
                matchingExercises.forEach(ex => {
                    sessions.push({
                        date: workout.date,
                        sets: ex.sets,
                        workoutName: workout.name
                    });
                });
            }

            if (sessions.length >= limit) {
                break;
            }
        }

        return sessions.slice(0, limit);
    }

    /**
     * Get recent workouts within specified days
     */
    async getRecentWorkouts(days: number): Promise<any[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const workouts = await db.workouts
            .where('date')
            .above(cutoffDate)
            .reverse()
            .sortBy('date');

        return workouts;
    }

    /**
     * Analyze performance trend for an exercise
     */
    async getPerformanceTrend(exerciseName: string): Promise<'improving' | 'plateau' | 'declining'> {
        const history = await this.getExerciseHistory(exerciseName, 6);

        if (history.length < 3) {
            return 'plateau'; // Not enough data
        }

        // Calculate average volume for each session
        const volumes = history.map(session => {
            return session.sets.reduce((sum: number, set: any) =>
                sum + (set.weight * set.reps), 0
            );
        });

        // Compare recent 3 vs previous 3
        const recentAvg = volumes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const previousAvg = volumes.slice(3, 6).reduce((a, b) => a + b, 0) / 3;

        const change = ((recentAvg - previousAvg) / previousAvg) * 100;

        if (change > 5) return 'improving';
        if (change < -5) return 'declining';
        return 'plateau';
    }
}
