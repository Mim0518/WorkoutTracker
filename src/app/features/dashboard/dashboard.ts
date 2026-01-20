import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkoutService } from '../../services/workout.service';
import { Workout } from '../../models/workout.model';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { EXERCISE_METADATA } from '../../models/exercise-list.data';
import { FormsModule } from '@angular/forms';
import { SettingsModalComponent } from '../settings/settings-modal/settings-modal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FormsModule, SettingsModalComponent],
  templateUrl: './dashboard.html',
  styles: [`
        :host {
            display: block;
        }
    `]
})
export class DashboardComponent {
  private workoutService = inject(WorkoutService);
  workouts = this.workoutService.workouts;

  // Settings Modal State
  showSettings = signal(false);

  openSettings() {
    this.showSettings.set(true);
  }

  closeSettings() {
    this.showSettings.set(false);
  }

  // Stats
  totalWorkouts = computed(() => this.workouts().length);
  totalExercises = computed(() => this.workouts().reduce((acc: number, w: Workout) => acc + w.exercises.length, 0));
  totalSets = computed(() => this.workouts().reduce((acc: number, w: Workout) => acc + w.exercises.reduce((exAcc: number, ex: any) => exAcc + ex.sets.length, 0), 0));
  totalVolume = computed(() => {
    return this.workouts().reduce((acc: number, w: Workout) => {
      return acc + w.exercises.reduce((exAcc: number, ex: any) => {
        return exAcc + ex.sets.reduce((setAcc: number, set: any) => setAcc + (set.weight * set.reps), 0);
      }, 0);
    }, 0);
  });

  // --- Charts Logic ---

  // 1. Weekly Activity (Bar Chart)
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Workouts by Day of Week', color: '#9ca3af' }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af', stepSize: 1 },
        grid: { color: '#374151' }
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { display: false }
      }
    }
  };
  public barChartType: ChartType = 'bar';

  public barChartData = computed<ChartData<'bar'>>(() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun - Sat
    this.workouts().forEach((w: Workout) => {
      const day = new Date(w.date).getDay(); // 0 is Sunday
      // Use UTC day to avoid timezone shifts if strictly needed, but local usually fine for current user context
      // actually simple getDay() is local time, which is consistent for user perception
      dayCounts[day]++;
    });

    // Reorder to start from Monday for standard Euro/ISO view or keep Sun? Let's keep Standard Sun-Sat for now but label accordingly
    // Actually typical fitness weeks start Monday. Let's shift.
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Shift dayCounts: 0(Sun) moves to end.
    const monSat = dayCounts.slice(1);
    const sun = dayCounts[0];
    const data = [...monSat, sun];

    return {
      labels: labels,
      datasets: [
        {
          data: data,
          label: 'Workouts',
          backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue-500
          hoverBackgroundColor: 'rgba(59, 130, 246, 0.9)',
          borderRadius: 4
        }
      ]
    };
  });

  // 2. Muscle Group Distribution (Doughnut Chart)
  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#9ca3af' } },
      title: { display: true, text: 'Volume by Key Muscle Groups', color: '#9ca3af' }
    }
  };
  public doughnutChartType: ChartType = 'doughnut';

  public doughnutChartData = computed<ChartData<'doughnut'>>(() => {
    const muscleCounts: Record<string, number> = {
      'Chest': 0, 'Back': 0, 'Legs': 0, 'Shoulders': 0, 'Arms': 0, 'Core': 0, 'Other': 0
    };

    this.workouts().forEach((w: Workout) => {
      w.exercises.forEach((ex: any) => {
        const meta = EXERCISE_METADATA[ex.name];
        const group = meta ? meta.muscle : 'Other';
        // We can count sets or just raw exercise frequency. Let's count sets for "Volume" proxy.
        muscleCounts[group] = (muscleCounts[group] || 0) + ex.sets.length;
      });
    });

    return {
      labels: Object.keys(muscleCounts),
      datasets: [{
        data: Object.values(muscleCounts),
        backgroundColor: [
          '#EF4444', // Red (Chest)
          '#3B82F6', // Blue (Back)
          '#10B981', // Green (Legs)
          '#F59E0B', // Yellow (Shoulders)
          '#8B5CF6', // Purple (Arms)
          '#EC4899', // Pink (Core)
          '#6B7280'  // Gray (Other)
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  });

  // 3. Progress Chart (Line Chart)
  public selectedExercise = signal<string>('');

  // Get unique exercises from history for the dropdown
  public availableExercises = computed(() => {
    const set = new Set<string>();
    this.workouts().forEach((w: Workout) => w.exercises.forEach((e: any) => set.add(e.name)));
    const list = Array.from(set).sort();
    // Auto-select first if none selected or current selection invalid
    if (list.length > 0 && (!this.selectedExercise() || !set.has(this.selectedExercise()))) {
      // We can't set signal inside computed directly without untracked/hack, better to let effect handle or just derived state
      // But for ngModel we need a writeable signal.
      // We'll trust the user interaction or an effect.
    }
    return list;
  });

  constructor() {
    // Auto-select an exercise if available and none selected
    effect(() => {
      const list = this.availableExercises();
      if (list.length > 0 && !this.selectedExercise()) {
        this.selectedExercise.set(list[0]);
      }
    }, { allowSignalWrites: true });
  }

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Max Weight Progression (kg)', color: '#9ca3af' }
    },
    scales: {
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      }
    }
  };
  public lineChartType: ChartType = 'line';

  public lineChartData = computed<ChartData<'line'>>(() => {
    const exerciseName = this.selectedExercise();
    // Finds all logs of this exercise, get key date + max weight for that session
    const dataPoints: { date: Date, weight: number }[] = [];

    this.workouts().forEach((w: Workout) => {
      const matches = w.exercises.filter((e: any) => e.name === exerciseName);
      if (matches.length > 0) {
        // Find max weight in this session for this exercise
        let sessionMax = 0;
        matches.forEach((m: any) => {
          m.sets.forEach((s: any) => {
            if (s.weight > sessionMax) sessionMax = s.weight;
          });
        });
        if (sessionMax > 0) {
          dataPoints.push({ date: new Date(w.date), weight: sessionMax });
        }
      }
    });

    // Sort by date
    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      labels: dataPoints.map(d => d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [
        {
          data: dataPoints.map(d => d.weight),
          label: 'Max Weight',
          borderColor: '#10B981', // Emerald-500
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          pointBackgroundColor: '#10B981',
          fill: true,
          tension: 0.4 // Curve
        }
      ]
    };
  });

  // 4. Estimated 1RM Progression (Line Chart)
  public e1rmChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Estimated 1RM Progression (kg)', color: '#9ca3af' }
    },
    scales: {
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      }
    }
  };

  private calculateE1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    // Epley Formula: Weight * (1 + Reps / 30)
    return Math.round(weight * (1 + reps / 30));
  }

  public e1rmChartData = computed<ChartData<'line'>>(() => {
    const exerciseName = this.selectedExercise();
    const dataPoints: { date: Date, e1rm: number }[] = [];

    this.workouts().forEach((w: Workout) => {
      const matches = w.exercises.filter((e: any) => e.name === exerciseName);
      if (matches.length > 0) {
        let sessionBestE1RM = 0;
        matches.forEach((m: any) => {
          m.sets.forEach((s: any) => {
            const currentE1RM = this.calculateE1RM(s.weight, s.reps);
            if (currentE1RM > sessionBestE1RM) sessionBestE1RM = currentE1RM;
          });
        });
        if (sessionBestE1RM > 0) {
          dataPoints.push({ date: new Date(w.date), e1rm: sessionBestE1RM });
        }
      }
    });

    dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      labels: dataPoints.map(d => d.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets: [
        {
          data: dataPoints.map(d => d.e1rm),
          label: 'Estimated 1RM',
          borderColor: '#8B5CF6', // Purple-500
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          pointBackgroundColor: '#8B5CF6',
          fill: true,
          tension: 0.4
        }
      ]
    };
  });

  // 5. Strength Symmetry (Radar Chart)
  public radarChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Strength Symmetry (Total Sets)', color: '#9ca3af' }
    },
    scales: {
      r: {
        grid: { color: '#374151' },
        angleLines: { color: '#374151' },
        pointLabels: { color: '#9ca3af' },
        ticks: { backdropColor: 'transparent', color: '#9ca3af', display: false } // Hide numeric ticks for cleaner look
      }
    }
  };
  public radarChartType: ChartType = 'radar';

  public radarChartData = computed<ChartData<'radar'>>(() => {
    // 1. Initialize counts for the 6 axes
    const counts: Record<string, number> = {
      'Chest': 0, 'Back': 0, 'Legs': 0, 'Shoulders': 0, 'Arms': 0, 'Core': 0
    };

    // 2. Aggregate data
    this.workouts().forEach((w: Workout) => {
      w.exercises.forEach((ex: any) => {
        const meta = EXERCISE_METADATA[ex.name];
        if (meta && meta.muscle in counts) {
          counts[meta.muscle] += ex.sets.length;
        }
      });
    });

    // 3. Map to dataset
    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        label: 'Total Sets',
        backgroundColor: 'rgba(99, 102, 241, 0.2)', // Indigo
        borderColor: '#6366F1',
        pointBackgroundColor: '#6366F1',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#6366F1'
      }]
    };
  });
}
