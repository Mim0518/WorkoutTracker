import Dexie, { Table } from 'dexie';
import { Workout } from '../models/workout.model';

export class WorkoutDatabase extends Dexie {
    workouts!: Table<Workout, string>;
    personalRecords!: Table<any, string>;

    constructor() {
        super('WorkoutTrackerDB');
        this.version(1).stores({
            workouts: 'id, date'
        });
        this.version(2).stores({
            workouts: 'id, date',
            personalRecords: 'exerciseName'
        });
    }
}

export const db = new WorkoutDatabase();
