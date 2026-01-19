export interface Set {
    reps: number;
    weight: number;
}

export interface Exercise {
    name: string;
    sets: Set[];
}

export interface Workout {
    id: string;
    date: Date;
    name: string;
    exercises: Exercise[];
}
