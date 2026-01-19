import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkoutService } from '../../../services/workout.service';

@Component({
  selector: 'app-workout-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './workout-list.html',
  styleUrl: './workout-list.css'
})
export class WorkoutListComponent {
  private workoutService = inject(WorkoutService);
  workouts = this.workoutService.workouts;

  deleteWorkout(id: string) {
    if (confirm('Are you sure you want to delete this workout?')) {
      this.workoutService.deleteWorkout(id);
    }
  }

  calculateTotalVolume(workout: any): number {
    return workout.exercises.reduce((acc: number, ex: any) => {
      return acc + ex.sets.reduce((sAcc: number, s: any) => sAcc + (s.weight * s.reps), 0);
    }, 0);
  }
}
