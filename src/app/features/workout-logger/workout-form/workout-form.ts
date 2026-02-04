import { Component, inject, OnInit, ElementRef, HostListener, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { WorkoutService } from '../../../services/workout.service';
import { Workout } from '../../../models/workout.model';
import { EXERCISE_LIST } from '../../../models/exercise-list.data';
import { v4 as uuidv4 } from 'uuid';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface ExerciseStats {
  max: number;
  max10: number;
  historyCount: number;
  loading: boolean;
}

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

  workoutForm: FormGroup;
  isEditMode = false;
  workoutId: string | null = null;

  // Autocomplete state
  activeDropdownIndex: number | null = null;
  filteredExercises: string[] = [];

  // Stats State
  // Map index -> Stats. Since FormArray indexes change on remove, we need to be careful.
  // Actually, simplest is to just keep a list that we sync with FormArray?
  // Or better: Use a Map keyed by the FormGroup instance or just rely on index if we assume sync.
  // Let's use an array of signals matched by index.
  exerciseStats = signal<ExerciseStats[]>([]);

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

    // Add stats placeholder
    this.updateStats(this.exercises.length, name);

    // Listen for name changes to update stats
    exerciseGroup.get('name')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      // Use current index in FormArray.
      const index = this.exercises.controls.indexOf(exerciseGroup);
      if (index !== -1) {
        this.updateStats(index, val || '');
      }
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

  async updateStats(index: number, name: string) {
    // Ensure array is big enough
    const currentStats = this.exerciseStats();
    if (index >= currentStats.length) {
      // Fill gap
      const newStats = [...currentStats];
      while (newStats.length <= index) {
        newStats.push({ max: 0, max10: 0, historyCount: 0, loading: false });
      }
      this.exerciseStats.set(newStats);
    }

    if (!name) return;

    // Set loading
    const stats = [...this.exerciseStats()];
    stats[index] = { ...stats[index], loading: true };
    this.exerciseStats.set(stats);

    const result = await this.workoutService.getExerciseStats(name, this.workoutId || undefined);

    // Update result
    const updated = [...this.exerciseStats()];
    updated[index] = { ...result, loading: false };
    this.exerciseStats.set(updated);
  }

  addExercise() {
    // Stats array expansion handled in createExercise implicitly pushing to form array?
    // Actually createExercise is called BEFORE push.
    // So 'index' passed to updateStats will be exercises.length.
    this.exercises.push(this.createExercise());
  }

  removeExercise(index: number) {
    this.exercises.removeAt(index);
    const stats = [...this.exerciseStats()];
    stats.splice(index, 1);
    this.exerciseStats.set(stats);

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

    while (this.exercises.length) {
      this.exercises.removeAt(0);
    }
    // Also clear stats
    this.exerciseStats.set([]);

    workout.exercises.forEach((ex, i) => {
      // createExercise calls updateStats, which is async.
      // But we push immediately.
      // We pass the name so it triggers the initial fetch.
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
