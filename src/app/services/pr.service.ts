import { Injectable } from '@angular/core';
import { db } from '../db/workout-db';
import { Workout } from '../models/workout.model';
import { liveQuery } from 'dexie';

export interface PersonalRecord {
    exerciseName: string;
    oneRepMax: number; // Estimated 1RM
    maxWeight: number; // Heaviest weight lifted
    maxVolume: number; // Max volume in a single session
    maxReps: number; // Max reps in a single set
    bestSet: { weight: number, reps: number }; // Best set by 1RM
    date: Date;
    updatedAt: Date;
}

export interface PRNotification {
    exerciseName: string;
    type: '1RM' | 'MaxWeight' | 'Volume' | 'RepMax';
    value: number;
    previousValue: number;
}

@Injectable({
    providedIn: 'root'
})
export class PRService {

    // Live query for PRs
    prs = liveQuery(() => db.personalRecords.toArray());

    constructor() { }

    /**
     * Check a workout for any new PRs and update the DB
     * Returns a list of new PRs achieved
     */
    async checkForPRs(workout: Workout): Promise<PRNotification[]> {
        const newPRs: PRNotification[] = [];

        for (const exercise of workout.exercises) {
            const existingPR = await db.personalRecords.get(exercise.name) as PersonalRecord | undefined;

            // Calculate stats for this session
            let sessionMaxWeight = 0;
            let sessionMaxVolume = 0;
            let sessionMaxReps = 0;
            let sessionBest1RM = 0;
            let sessionBestSet = { weight: 0, reps: 0 };

            exercise.sets.forEach(set => {
                // Max Weight
                if (set.weight > sessionMaxWeight) {
                    sessionMaxWeight = set.weight;
                }

                // Max Reps
                if (set.reps > sessionMaxReps) {
                    sessionMaxReps = set.reps;
                }

                // Volume
                sessionMaxVolume += (set.weight * set.reps);

                // 1RM (Epley Formula)
                // 1RM = Weight * (1 + Reps/30)
                const est1RM = set.weight * (1 + set.reps / 30);
                if (est1RM > sessionBest1RM) {
                    sessionBest1RM = est1RM;
                    sessionBestSet = { weight: set.weight, reps: set.reps };
                }
            });

            // Compare with existing PR
            const currentPR: PersonalRecord = existingPR || {
                exerciseName: exercise.name,
                oneRepMax: 0,
                maxWeight: 0,
                maxVolume: 0,
                maxReps: 0,
                bestSet: { weight: 0, reps: 0 },
                date: new Date(),
                updatedAt: new Date()
            };

            let updated = false;

            // Check 1RM
            if (sessionBest1RM > currentPR.oneRepMax) {
                newPRs.push({
                    exerciseName: exercise.name,
                    type: '1RM',
                    value: Math.round(sessionBest1RM),
                    previousValue: Math.round(currentPR.oneRepMax)
                });
                currentPR.oneRepMax = sessionBest1RM;
                currentPR.bestSet = sessionBestSet;
                updated = true;
            }

            // Check Max Weight
            if (sessionMaxWeight > currentPR.maxWeight) {
                newPRs.push({
                    exerciseName: exercise.name,
                    type: 'MaxWeight',
                    value: sessionMaxWeight,
                    previousValue: currentPR.maxWeight
                });
                currentPR.maxWeight = sessionMaxWeight;
                updated = true;
            }

            // Check Max Volume
            if (sessionMaxVolume > currentPR.maxVolume) {
                // Only notify for volume PRs if it's a significant increase (> 5%)
                // to avoid noise on simple variance
                if (sessionMaxVolume > currentPR.maxVolume * 1.05) {
                    newPRs.push({
                        exerciseName: exercise.name,
                        type: 'Volume',
                        value: Math.round(sessionMaxVolume),
                        previousValue: Math.round(currentPR.maxVolume)
                    });
                }
                if (sessionMaxVolume > currentPR.maxVolume) {
                    currentPR.maxVolume = sessionMaxVolume;
                    updated = true;
                }
            }

            // Check Max Reps
            if (sessionMaxReps > currentPR.maxReps) {
                newPRs.push({
                    exerciseName: exercise.name,
                    type: 'RepMax',
                    value: sessionMaxReps,
                    previousValue: currentPR.maxReps
                });
                currentPR.maxReps = sessionMaxReps;
                updated = true;
            }

            if (updated) {
                currentPR.date = new Date(workout.date);
                currentPR.updatedAt = new Date();
                await db.personalRecords.put(currentPR);
            }
        }

        return newPRs;
    }

    /**
     * Get PRs for a specific exercise
     */
    async getPR(exerciseName: string): Promise<PersonalRecord | undefined> {
        return await db.personalRecords.get(exerciseName);
    }

    /**
     * Recalculate all PRs from full history (maintenance)
     */
    /**
     * Get the history of PR progression for an exercise
     * Returns a list of PRs achieved over time
     */
    async getPRHistory(exerciseName: string): Promise<{ date: Date, value: number, type: string }[]> {
        const workouts = await db.workouts.orderBy('date').toArray();
        const history: { date: Date, value: number, type: string }[] = [];

        let current1RM = 0;

        for (const workout of workouts) {
            const exercise = workout.exercises.find(e => e.name === exerciseName);
            if (exercise) {
                let sessionBest1RM = 0;
                exercise.sets.forEach(set => {
                    const est1RM = set.weight * (1 + set.reps / 30);
                    if (est1RM > sessionBest1RM) sessionBest1RM = est1RM;
                });

                if (sessionBest1RM > current1RM) {
                    current1RM = sessionBest1RM;
                    history.push({
                        date: workout.date,
                        value: Math.round(sessionBest1RM),
                        type: '1RM'
                    });
                }
            }
        }
        return history;
    }

    async recalculateAllPRs(workouts: Workout[]) {
        await db.personalRecords.clear();
        // Just run checkForPRs for every workout chronologically
        const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const workout of sortedWorkouts) {
            await this.checkForPRs(workout);
        }
    }
}
