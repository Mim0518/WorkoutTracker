# Developer Guide

Welcome to the WorkoutTracker developer documentation! This guide provides an in-depth look at the potential architecture, state management, and key components of the application.

## Architecture Overview

WorkoutTracker is a **client-side only** Progressive Web App (PWA) built with **Angular (v19+)**.

- **Offline-First**: The app is designed to work fully offline. There is no backend API.
- **Standalone Components**: The application uses Angular's standalone components for better tree-shaking and simplified architecture (no `NgModule` clutter).
- **Signals**: We use Angular Signals for reactive state management, providing fine-grained updates and better performance than traditional Zone.js change detection.

## Data Layer

Data persistence is handled by **IndexedDB**, wrapped by **Dexie.js** for a friendlier API.

### Database Schema
The database configuration is located in `src/app/db/workout-db.ts`.

**Tables:**
- `workouts`: Stores the `Workout` objects.

### Data Models
Models are defined in `src/app/models/`.

```typescript
// workout.model.ts
export interface Workout {
  id: string;      // UUID
  date: Date;
  name: string;
  exercises: Exercise[];
}

export interface Exercise {
  name: string;
  sets: Set[];
}

export interface Set {
  reps: number;
  weight: number;
}
```

## State Management

The application uses **Service-based State Management** with Signals.

### `WorkoutService`
Located in `src/app/services/workout.service.ts`.

- **Source of Truth**: Manages the `workoutsSignal` which holds the current list of workouts.
- **Computed Signals**: Exposes derived state (e.g., specific workouts, filtered lists) via `computed()`.
- **Actions**: Methods like `addWorkout`, `updateWorkout`, `deleteWorkout` update the IndexedDB first, then refresh the signal.

## Features

### Dashboard
Located in `src/app/features/dashboard`.
- Displays analytics and charts.
- Uses `ng2-charts` (Chart.js wrapper) for visualization.
- **Sub-components**:
    - `VolumeChartComponent`: Line chart of volume over time.
    - `ConsistencyHeatmapComponent`: GitHub-style contribution graph for workouts.

### Workout Logger
Located in `src/app/features/workout-logger`.
- The core interface for recording workouts.
- **Components**:
    - `WorkoutListComponent`: Displays history of workouts.
    - `WorkoutDetailComponent`: Form for adding/editing a workout.

## Internationalization (i18n)

We use Angular's built-in i18n tools.

- **Source Language**: English (`en-US`).
- **Translations**: Located in `src/locale/`.
    - `messages.es-MX.xlf`: Spanish (Mexico) translations.

### Workflow for adding/updating translations:
1. Add `i18n` attribute to HTML templates:
   ```html
   <h1 i18n="@@homeTitle">Welcome</h1>
   ```
2. Extract source strings:
   ```bash
   ng extract-i18n --output-path src/locale
   ```
3. Update specific locale files (e.g., `messages.es-MX.xlf`) with new translations.
4. Serve/Build with the specific configuration.

## Testing

- **Unit Tests**: `ng test` (using Vitest).
- **End-to-End**: `ng e2e` (configured provider).

## Deployment

Since this is a client-side app, it can be deployed to any static host (GitHub Pages, Netlify, Vercel, Firebase Hosting).

Remember to configure your web server to handle the i18n subdirectories (`/en-US/`, `/es-MX/`) if deploying multiple languages.
