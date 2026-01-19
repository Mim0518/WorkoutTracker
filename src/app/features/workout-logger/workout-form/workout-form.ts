import { Component, inject, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { WorkoutService } from '../../../services/workout.service';
import { Workout } from '../../../models/workout.model';
import { EXERCISE_LIST } from '../../../models/exercise-list.data';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-workout-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './workout-form.html',
  styleUrl: './workout-form.css'
})
export class WorkoutFormComponent implements OnInit {
  exerciseList = EXERCISE_LIST;
  private fb = inject(FormBuilder);
  private workoutService = inject(WorkoutService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private eRef = inject(ElementRef);

  workoutForm: FormGroup;
  isEditMode = false;
  workoutId: string | null = null;

  // Autocomplete state
  activeDropdownIndex: number | null = null;
  filteredExercises: string[] = [];

  constructor() {
    this.workoutForm = this.fb.group({
      name: ['', Validators.required],
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      exercises: this.fb.array([])
    });
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.activeDropdownIndex !== null) {
      // Check if click was inside the dropdown container
      const target = event.target as HTMLElement;
      if (!target.closest('.exercise-autocomplete-container')) {
        this.closeDropdown();
      }
    }
  }

  ngOnInit() {
    this.workoutId = this.route.snapshot.paramMap.get('id');
    if (this.workoutId) {
      this.isEditMode = true;
      const workout = this.workoutService.getWorkout(this.workoutId)();
      if (workout) {
        this.patchForm(workout);
      }
    } else {
      this.addExercise(); // Default to one exercise
    }
  }

  get exercises() {
    return this.workoutForm.get('exercises') as FormArray;
  }

  getSets(exerciseIndex: number) {
    return this.exercises.at(exerciseIndex).get('sets') as FormArray;
  }

  createExercise(name: string = '', sets: any[] = []) {
    const exerciseGroup = this.fb.group({
      name: [name, Validators.required],
      sets: this.fb.array([])
    });

    if (sets.length > 0) {
      sets.forEach(s => {
        (exerciseGroup.get('sets') as FormArray).push(this.createSet(s.reps, s.weight));
      });
    } else {
      (exerciseGroup.get('sets') as FormArray).push(this.createSet());
    }

    return exerciseGroup;
  }

  createSet(reps: number = 0, weight: number = 0) {
    return this.fb.group({
      reps: [reps, [Validators.required, Validators.min(1)]],
      weight: [weight, [Validators.required, Validators.min(0)]]
    });
  }

  addExercise() {
    this.exercises.push(this.createExercise());
  }

  removeExercise(index: number) {
    this.exercises.removeAt(index);
    // Close dropdown strictly if we removed the active one or one before it
    if (this.activeDropdownIndex === index) {
      this.closeDropdown();
    } else if (this.activeDropdownIndex !== null && this.activeDropdownIndex > index) {
      this.activeDropdownIndex--;
    }
  }

  addSet(exerciseIndex: number) {
    this.getSets(exerciseIndex).push(this.createSet());
  }

  removeSet(exerciseIndex: number, setIndex: number) {
    this.getSets(exerciseIndex).removeAt(setIndex);
  }

  patchForm(workout: Workout) {
    this.workoutForm.patchValue({
      name: workout.name,
      date: new Date(workout.date).toISOString().substring(0, 10)
    });

    // Clear initial exercises
    while (this.exercises.length) {
      this.exercises.removeAt(0);
    }

    workout.exercises.forEach(ex => {
      this.exercises.push(this.createExercise(ex.name, ex.sets));
    });
  }

  onSubmit() {
    if (this.workoutForm.valid) {
      const formValue = this.workoutForm.value;
      const workoutData: Workout = {
        id: this.isEditMode && this.workoutId ? this.workoutId : uuidv4(),
        name: formValue.name,
        date: (() => {
          const [year, month, day] = formValue.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        })(),
        exercises: formValue.exercises
      };

      if (this.isEditMode) {
        this.workoutService.updateWorkout(workoutData);
      } else {
        this.workoutService.addWorkout(workoutData);
      }

      this.router.navigate(['/workouts']);
    }
  }

  // --- Autocomplete Logic ---

  openDropdown(index: number) {
    this.activeDropdownIndex = index;
    // Initialize filter with current value
    const currentValue = this.exercises.at(index).get('name')?.value || '';
    this.filterExercises(currentValue);
  }

  closeDropdown() {
    this.activeDropdownIndex = null;
  }

  onSearchInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    this.filterExercises(input.value);

    // Also explicitly open if typing opens it
    if (this.activeDropdownIndex !== index) {
      this.activeDropdownIndex = index;
    }
  }

  filterExercises(term: string) {
    if (!term) {
      this.filteredExercises = this.exerciseList;
      return;
    }
    const lowerTerm = term.toLowerCase();
    this.filteredExercises = this.exerciseList.filter(ex =>
      ex.toLowerCase().includes(lowerTerm)
    );
  }

  selectExercise(index: number, exercise: string) {
    this.exercises.at(index).get('name')?.setValue(exercise);
    this.closeDropdown();
  }
}
