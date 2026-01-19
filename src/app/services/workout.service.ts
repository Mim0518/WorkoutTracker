import { Injectable, signal, computed, effect } from '@angular/core';
import { Workout } from '../models/workout.model';

@Injectable({
    providedIn: 'root'
})
export class WorkoutService {
    private workoutsSignal = signal<Workout[]>([]);
    private readonly storageKey = 'workout-tracker-data';

    workouts = computed(() => this.workoutsSignal());

    constructor() {
        this.loadWorkouts();

        // Auto-save effect
        effect(() => {
            this.saveWorkouts(this.workoutsSignal());
        });
    }

    private loadWorkouts() {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
            try {
                const workouts = JSON.parse(data);
                // Restore Date objects potentially if stored as strings
                const parsedWorkouts = workouts.map((w: any) => ({
                    ...w,
                    date: new Date(w.date)
                }));
                this.workoutsSignal.set(parsedWorkouts);
            } catch (e) {
                console.error('Failed to parse workouts', e);
            }
        }
    }

    private saveWorkouts(workouts: Workout[]) {
        localStorage.setItem(this.storageKey, JSON.stringify(workouts));
    }

    addWorkout(workout: Workout) {
        this.workoutsSignal.update(current => [workout, ...current]);
    }

    updateWorkout(updatedWorkout: Workout) {
        this.workoutsSignal.update(current =>
            current.map(w => w.id === updatedWorkout.id ? updatedWorkout : w)
        );
    }

    deleteWorkout(id: string) {
        this.workoutsSignal.update(current => current.filter(w => w.id !== id));
    }

    getWorkout(id: string) {
        return computed(() => this.workoutsSignal().find(w => w.id === id));
    }
}
