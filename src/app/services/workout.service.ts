
import { Injectable, signal, computed } from '@angular/core';
import { Workout } from '../models/workout.model';
import { db } from '../db/workout-db';
import { MockDataGenerator } from '../utils/mock-data.generator';

@Injectable({
    providedIn: 'root'
})
export class WorkoutService {
    private workoutsSignal = signal<Workout[]>([]);

    workouts = computed(() => this.workoutsSignal());

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

    async addWorkout(workout: Workout) {
        try {
            await db.workouts.add(workout);
            // Reload to ensure consistency (or we could optimistically update the signal)
            await this.loadWorkouts();
        } catch (error) {
            console.error('Failed to add workout', error);
        }
    }

    async updateWorkout(updatedWorkout: Workout) {
        try {
            await db.workouts.put(updatedWorkout);
            await this.loadWorkouts();
        } catch (error) {
            console.error('Failed to update workout', error);
        }
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
            const date = new Date().toISOString().split('T')[0];
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
}
