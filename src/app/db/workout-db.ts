import Dexie, { Table } from 'dexie';
import { Workout } from '../models/workout.model';

export class WorkoutDatabase extends Dexie {
    workouts!: Table<Workout, string>;

    constructor() {
        super('WorkoutTrackerDB');
        this.version(1).stores({
            workouts: 'id, date'
        });
    }
}

export const db = new WorkoutDatabase();
