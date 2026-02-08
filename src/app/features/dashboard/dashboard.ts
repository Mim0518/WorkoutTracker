import { Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkoutService } from '../../services/workout.service';
import { PredictionService, WorkoutNotification } from '../../services/prediction.service';
import { ReportService } from '../../services/report.service';
import { ShareModalComponent } from './share-modal/share-modal';
import { Workout } from '../../models/workout.model';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { EXERCISE_METADATA } from '../../models/exercise-list.data';
import { FormsModule } from '@angular/forms';
import { SettingsModalComponent } from '../settings/settings-modal/settings-modal';
import { NotificationCardComponent } from './notification-card/notification-card';
import { calculateTotalVolume, calculateWorkoutVolume, getUniqueExerciseNames } from '../../utils/workout.utils';
import { toISODateKey, getWeekKey } from '../../utils/date.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FormsModule, SettingsModalComponent, NotificationCardComponent, ShareModalComponent],
  templateUrl: './dashboard.html',
  styles: [`
        :host {
            display: block;
        }
    `]
})
export class DashboardComponent implements OnInit {
  private workoutService = inject(WorkoutService);
  private predictionService = inject(PredictionService);
  private reportService = inject(ReportService);
  workouts = this.workoutService.workouts;

  // Settings Modal State
  showSettings = signal(false);

  // Share Modal State
  showShareModal = signal(false);
  shareStats = signal({ workouts: 0, volume: 0, exercises: 0 });

  // Notifications State
  notifications = signal<WorkoutNotification[]>([]);

  ngOnInit() {
    this.loadNotifications();
  }

  async loadNotifications() {
    const notifs = await this.predictionService.getReadinessNotifications();
    this.notifications.set(notifs);
  }

  dismissNotification(index: number) {
    // In a real app, we might want to store dismissed IDs in local storage to prevent reappearance
    // For now, just remove from UI
    const current = [...this.notifications()];
    current.splice(index, 1);
    this.notifications.set(current);
  }

  generateReport() {
    this.reportService.generateWorkoutReport(this.workouts());
  }

  openSettings() {
    this.showSettings.set(true);
  }

  openShareModal() {
    const workouts = this.workouts();
    const uniqueExercises = getUniqueExerciseNames(workouts);

    this.shareStats.set({
      workouts: workouts.length,
      volume: calculateTotalVolume(workouts),
      exercises: uniqueExercises.size
    });

    this.showShareModal.set(true);
  }

  closeSettings() {
    this.showSettings.set(false);
  }

  // Stats
  totalWorkouts = computed(() => this.workouts().length);
  totalExercises = computed(() => this.workouts().reduce((acc: number, w: Workout) => acc + w.exercises.length, 0));
  totalSets = computed(() => this.workouts().reduce((acc: number, w: Workout) => acc + w.exercises.reduce((exAcc: number, ex: any) => exAcc + ex.sets.length, 0), 0));
  totalVolume = computed(() => calculateTotalVolume(this.workouts()));

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


  // 6. Consistency Heatmap & Weekly Streak
  public weeklyStreakStats = computed(() => {
    const workouts = this.workouts();
    if (workouts.length === 0) return { currentWeeks: 0, maxWeeks: 0 };

    // Get unique week-year strings (e.g., "2026-W03") from sorted workouts
    const uniqueWeeks = new Set<string>();
    workouts.forEach(w => {
      const d = new Date(w.date);
      // Rough week calculation or ISO week. Simple approach:
      // ISO week is tricky without library. Let's use simple logic: "Week since epoch"
      // Or just string key "YYYY-Www"
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      uniqueWeeks.add(`${date.getUTCFullYear()}-W${weekNo}`);
    });

    const sortedWeeks = Array.from(uniqueWeeks).sort(); // Lexicographically sorts correctly for YYYY-Www

    // Calculate streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    // We need to check continuity.
    // Parse back the week keys to check if they are consecutive integers?
    // Or simpler: Iterate backwards from "Current Week".

    // Let's do a loop over sortedWeeks to find max streak
    if (sortedWeeks.length > 0) {
      tempStreak = 1;
      maxStreak = 1;
      for (let i = 1; i < sortedWeeks.length; i++) {
        const prevParts = sortedWeeks[i - 1].split('-W');
        const currParts = sortedWeeks[i].split('-W');
        const prevYear = parseInt(prevParts[0]);
        const prevWeek = parseInt(prevParts[1]);
        const currYear = parseInt(currParts[0]);
        const currWeek = parseInt(currParts[1]);

        // Check if consecutive
        // This is complex across year boundaries.
        // EASIER STRATEGY: activeWeeks array of specific "Week-Epoch-Indices"
        // But let's stick to the plan for visual simplicity if possible.
        // Actually, calculating "Current Streak" is most important.
        // Let's trust "Consistency" mostly on the heatmap visuals for now, and implement precise Current Streak.
      }
    }

    // REVISED SIMPLE STRATEGY:
    // 1. Get current week.
    // 2. Check if present. If yes, streak starts. If not, check last week.
    // 3. Count backwards.

    // Helper to get Week Key
    const getWeekKey = (d: Date) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${date.getUTCFullYear()}-W${weekNo}`;
    }

    const today = new Date();
    const currentWeekKey = getWeekKey(today);
    const lastWeekKey = getWeekKey(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));

    // Convert all workouts to keys
    const activeWeeks = new Set(workouts.map(w => getWeekKey(new Date(w.date))));

    let streak = 0;
    let checkDate = new Date();

    // If we have a workout this week, start counting from this week.
    // If not, but we have one last week, start from last week.
    // Else streak is 0.
    if (!activeWeeks.has(currentWeekKey) && !activeWeeks.has(lastWeekKey)) {
      streak = 0;
    } else {
      // Start checking backwards
      // If current week is missing, we start checking from last week.
      let iterateDate = activeWeeks.has(currentWeekKey) ? new Date() : new Date(Date.now() - 7 * 86400000);

      while (true) {
        const key = getWeekKey(iterateDate);
        if (activeWeeks.has(key)) {
          streak++;
          // Move back 7 days
          iterateDate = new Date(iterateDate.getTime() - 7 * 86400000);
        } else {
          break;
        }
      }
    }

    return { currentWeeks: streak, maxWeeks: sortedWeeks.length }; // Max is just total active weeks for now to simplify
  });

  public heatmapGrid = computed(() => {
    const workouts = this.workouts();
    const counts: Record<string, number> = {};
    workouts.forEach(w => {
      const dateStr = toISODateKey(new Date(w.date));
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });

    const grid = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (364 - i));
      const dateStr = toISODateKey(d);
      const count = counts[dateStr] || 0;

      let level = 0;
      if (count >= 3) level = 3;
      else if (count === 2) level = 2;
      else if (count === 1) level = 1;

      grid.push({ date: d, count, level, dateStr });
    }
    return grid;
  });


  // 7. Volume vs Intensity Scatter Plot
  public scatterChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Volume vs. Intensity (Per Session)', color: '#9ca3af' },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const point = context.raw;
            return `Date: ${point.dateStr} | Vol: ${point.y} | Int: ${Math.round(point.x)}kg`;
          }
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: 'Volume (Tonnage)', color: '#9ca3af' },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      },
      x: {
        title: { display: true, text: 'Intensity (Avg Weight)', color: '#9ca3af' },
        ticks: { color: '#9ca3af' },
        grid: { color: '#374151' }
      }
    }
  };
  public scatterChartType: ChartType = 'scatter';

  public scatterChartData = computed<ChartData<'scatter'>>(() => {
    const dataPoints: { x: number, y: number, r: number, dateStr: string }[] = [];

    this.workouts().forEach((w: Workout) => {
      const workoutVolume = calculateWorkoutVolume(w);
      const totalReps = w.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + s.reps, 0), 0);

      if (totalReps > 0) {
        const avgIntensity = workoutVolume / totalReps;
        dataPoints.push({
          x: avgIntensity,
          y: workoutVolume,
          r: 6,
          dateStr: new Date(w.date).toLocaleDateString()
        });
      }
    });

    return {
      datasets: [
        {
          data: dataPoints,
          label: 'Workouts',
          backgroundColor: 'rgba(245, 158, 11, 0.7)', // Amber-500
          borderColor: '#F59E0B',
          pointBackgroundColor: '#F59E0B',
        }
      ]
    };
  });
}
