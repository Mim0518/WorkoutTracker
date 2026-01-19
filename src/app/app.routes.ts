import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { WorkoutListComponent } from './features/workout-logger/workout-list/workout-list';
import { WorkoutFormComponent } from './features/workout-logger/workout-form/workout-form';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'workouts', component: WorkoutListComponent },
    { path: 'workouts/new', component: WorkoutFormComponent },
    { path: 'workouts/:id', component: WorkoutFormComponent },
];
