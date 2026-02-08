import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkoutService } from '../../../services/workout.service';
import { calculateWorkoutVolume } from '../../../utils/workout.utils';
import { Workout } from '../../../models/workout.model';

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

  calculateTotalVolume(workout: Workout): number {
    return calculateWorkoutVolume(workout);
  }
}
