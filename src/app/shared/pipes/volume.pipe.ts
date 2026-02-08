import { Pipe, PipeTransform } from '@angular/core';
import { Workout, Exercise, Set } from '../../models/workout.model';
import { calculateWorkoutVolume, calculateTotalVolume, calculateExerciseVolume } from '../../utils/workout.utils';

/**
 * Pipe to calculate and format volume for workouts, exercises, or sets.
 * 
 * Usage:
 * - Single workout: {{ workout | volume }}
 * - Array of workouts: {{ workouts | volume }}
 * - Single exercise: {{ exercise | volume }}
 */
@Pipe({
    name: 'volume',
    standalone: true
})
export class VolumePipe implements PipeTransform {
    transform(value: Workout | Workout[] | Exercise | Set[] | null | undefined): number {
        if (!value) {
            return 0;
        }

        // Array of workouts
        if (Array.isArray(value) && value.length > 0 && 'exercises' in value[0]) {
            return calculateTotalVolume(value as Workout[]);
        }

        // Array of sets
        if (Array.isArray(value) && value.length > 0 && 'reps' in value[0]) {
            return (value as Set[]).reduce((acc, set) => acc + (set.weight * set.reps), 0);
        }

        // Single workout
        if ('exercises' in value) {
            return calculateWorkoutVolume(value as Workout);
        }

        // Single exercise
        if ('sets' in value) {
            return calculateExerciseVolume(value as Exercise);
        }

        return 0;
    }
}
