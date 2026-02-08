import { describe, it, expect } from 'vitest';
import {
    calculateSetVolume,
    calculateExerciseVolume,
    calculateWorkoutVolume,
    calculateTotalVolume,
    countWorkoutSets,
    getUniqueExerciseNames
} from './workout.utils';
import { Workout, Exercise } from '../models/workout.model';

describe('Workout Utils', () => {
    describe('calculateSetVolume', () => {
        it('should calculate volume for a single set', () => {
            expect(calculateSetVolume({ weight: 100, reps: 10 })).toBe(1000);
        });

        it('should return 0 for zero weight', () => {
            expect(calculateSetVolume({ weight: 0, reps: 10 })).toBe(0);
        });

        it('should return 0 for zero reps', () => {
            expect(calculateSetVolume({ weight: 100, reps: 0 })).toBe(0);
        });
    });

    describe('calculateExerciseVolume', () => {
        it('should sum volume across all sets', () => {
            const exercise: Exercise = {
                name: 'Bench Press',
                sets: [
                    { weight: 100, reps: 10 },
                    { weight: 100, reps: 8 },
                    { weight: 100, reps: 6 }
                ]
            };
            expect(calculateExerciseVolume(exercise)).toBe(2400); // 1000 + 800 + 600
        });

        it('should return 0 for empty sets', () => {
            const exercise: Exercise = { name: 'Deadlift', sets: [] };
            expect(calculateExerciseVolume(exercise)).toBe(0);
        });
    });

    describe('calculateWorkoutVolume', () => {
        it('should sum volume across all exercises', () => {
            const workout: Workout = {
                id: '1',
                name: 'Test Workout',
                date: new Date(),
                exercises: [
                    { name: 'Bench', sets: [{ weight: 100, reps: 10 }] },
                    { name: 'Squat', sets: [{ weight: 150, reps: 5 }] }
                ]
            };
            expect(calculateWorkoutVolume(workout)).toBe(1750); // 1000 + 750
        });

        it('should return 0 for empty exercises', () => {
            const workout: Workout = {
                id: '1',
                name: 'Empty Workout',
                date: new Date(),
                exercises: []
            };
            expect(calculateWorkoutVolume(workout)).toBe(0);
        });
    });

    describe('calculateTotalVolume', () => {
        it('should sum volume across all workouts', () => {
            const workouts: Workout[] = [
                {
                    id: '1',
                    name: 'W1',
                    date: new Date(),
                    exercises: [{ name: 'Bench', sets: [{ weight: 100, reps: 10 }] }]
                },
                {
                    id: '2',
                    name: 'W2',
                    date: new Date(),
                    exercises: [{ name: 'Squat', sets: [{ weight: 100, reps: 10 }] }]
                }
            ];
            expect(calculateTotalVolume(workouts)).toBe(2000);
        });

        it('should return 0 for empty array', () => {
            expect(calculateTotalVolume([])).toBe(0);
        });
    });

    describe('countWorkoutSets', () => {
        it('should count total sets in a workout', () => {
            const workout: Workout = {
                id: '1',
                name: 'Test',
                date: new Date(),
                exercises: [
                    { name: 'Bench', sets: [{ weight: 100, reps: 10 }, { weight: 100, reps: 8 }] },
                    { name: 'Squat', sets: [{ weight: 150, reps: 5 }] }
                ]
            };
            expect(countWorkoutSets(workout)).toBe(3);
        });
    });

    describe('getUniqueExerciseNames', () => {
        it('should return unique exercise names', () => {
            const workouts: Workout[] = [
                {
                    id: '1',
                    name: 'W1',
                    date: new Date(),
                    exercises: [
                        { name: 'Bench Press', sets: [] },
                        { name: 'Squat', sets: [] }
                    ]
                },
                {
                    id: '2',
                    name: 'W2',
                    date: new Date(),
                    exercises: [
                        { name: 'Bench Press', sets: [] },
                        { name: 'Deadlift', sets: [] }
                    ]
                }
            ];
            const names = getUniqueExerciseNames(workouts);
            expect(names.size).toBe(3);
            expect(names.has('Bench Press')).toBe(true);
            expect(names.has('Squat')).toBe(true);
            expect(names.has('Deadlift')).toBe(true);
        });
    });
});
