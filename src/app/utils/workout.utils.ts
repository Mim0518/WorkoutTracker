import { Exercise, type Set as SetModel, Workout } from '../models/workout.model';

/**
 * Calculates the volume (weight × reps) for a single set.
 * @param set - The set containing weight and reps.
 * @returns The volume in kg.
 */
export function calculateSetVolume(set: SetModel): number {
    return set.weight * set.reps;
}

/**
 * Calculates total volume for an exercise by summing all sets.
 * @param exercise - The exercise containing sets.
 * @returns Total volume in kg.
 */
export function calculateExerciseVolume(exercise: Exercise): number {
    return exercise.sets.reduce((acc, set) => acc + calculateSetVolume(set), 0);
}

/**
 * Calculates total volume for a single workout by summing all exercises.
 * @param workout - The workout containing exercises.
 * @returns Total volume in kg.
 */
export function calculateWorkoutVolume(workout: Workout): number {
    return workout.exercises.reduce((acc, exercise) => acc + calculateExerciseVolume(exercise), 0);
}

/**
 * Calculates total volume across multiple workouts.
 * @param workouts - Array of workouts.
 * @returns Total volume in kg.
 */
export function calculateTotalVolume(workouts: Workout[]): number {
    return workouts.reduce((acc, workout) => acc + calculateWorkoutVolume(workout), 0);
}

/**
 * Counts the total number of sets across all exercises in a workout.
 * @param workout - The workout containing exercises.
 * @returns Total number of sets.
 */
export function countWorkoutSets(workout: Workout): number {
    return workout.exercises.reduce((acc, exercise) => acc + exercise.sets.length, 0);
}

/**
 * Gets unique exercise names from a list of workouts.
 * @param workouts - Array of workouts.
 * @returns Set of unique exercise names.
 */
export function getUniqueExerciseNames(workouts: Workout[]): Set<string> {
    const names = new Set<string>();
    workouts.forEach(w => w.exercises.forEach(e => names.add(e.name)));
    return names;
}
