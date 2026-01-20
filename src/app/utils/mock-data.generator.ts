import { Workout, Exercise, Set } from '../models/workout.model';
import { v4 as uuidv4 } from 'uuid';

export class MockDataGenerator {
    private static exercises = [
        'Barbell Bench Press',
        'High-Bar Back Squat',
        'Barbell RDL',
        'Pull-Up',
        'DB Shoulder Press',
        'DB Curl',
        'Triceps Pressdown (Rope)',
        'Leg Press'
    ];

    static generate(count: number = 30): Workout[] {
        const workouts: Workout[] = [];
        const today = new Date();

        // Start from 'count * 3' days ago (approx 1 workout every 3 days)
        let currentDate = new Date();
        currentDate.setDate(today.getDate() - (count * 3));

        // Base strengths for progressive overload simulation
        const strengthMap: Record<string, number> = {
            'Barbell Bench Press': 60,
            'High-Bar Back Squat': 80,
            'Barbell RDL': 90,
            'Pull-Up': 0, // Bodyweight
            'DB Shoulder Press': 15,
            'DB Curl': 10,
            'Triceps Pressdown (Rope)': 15,
            'Leg Press': 100
        };

        for (let i = 0; i < count; i++) {
            // Advance date by 2-4 days
            const daysSkip = Math.floor(Math.random() * 3) + 2;
            currentDate.setDate(currentDate.getDate() + daysSkip);

            // Don't go into future
            if (currentDate > today) break;

            const workout: Workout = {
                id: uuidv4(),
                date: new Date(currentDate), // Clone date
                name: i % 2 === 0 ? 'Full Body A' : 'Full Body B',
                exercises: []
            };

            // Pick 4-6 random exercises
            const numExercises = Math.floor(Math.random() * 3) + 4;
            const shuffled = [...this.exercises].sort(() => 0.5 - Math.random());
            const selectedExercises = shuffled.slice(0, numExercises);

            selectedExercises.forEach(exName => {
                // Progressive overload: small chance to increase weight every workout
                if (Math.random() > 0.3) {
                    strengthMap[exName] += 1.25; // Small increment
                }

                const baseWeight = strengthMap[exName];
                const sets: Set[] = [];
                const numSets = 3;

                for (let s = 0; s < numSets; s++) {
                    sets.push({
                        reps: Math.floor(Math.random() * 4) + 8, // 8-12 reps
                        weight: Math.round(baseWeight) // Round to whole number
                    });
                }

                workout.exercises.push({
                    name: exName,
                    sets: sets
                });
            });

            workouts.push(workout);
        }

        return workouts;
    }
}
