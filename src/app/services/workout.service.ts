import { Injectable, signal, computed } from '@angular/core';
import { Workout } from '../models/workout.model';
import { db } from '../db/workout-db';

@Injectable({
    providedIn: 'root'
})
export class WorkoutService {
    private workoutsSignal = signal<Workout[]>([]);

    workouts = computed(() => this.workoutsSignal());

    constructor() {
        this.loadWorkouts();
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

    getWorkout(id: string) {
        return computed(() => this.workoutsSignal().find(w => w.id === id));
    }
}
