# WorkoutTracker

Privacy-focused, offline-first workout tracking application built with Angular.

## Overview

WorkoutTracker is a modern web application designed to help users track their strength training progress without the need for an active internet connection or account creation. All data is stored locally on your device, ensuring complete privacy and ownership of your workout logs.

## Key Features

- **Workout Logging**: Easily record exercises, sets, reps, and weights.
- **Analytics Dashboard**: Visualize your progress with charts for volume, consistency, and intensity.
- **Offline First**: Works completely offline using local storage (IndexedDB).
- **Data Management**: Export your data to JSON for backup or import it to restore.
- **Localization**: Fully localized for English (en-US) and Spanish (es-MX).
- **Dark Mode**: Sleek dark theme optimized for gym environments.

## Tech Stack

- **Framework**: [Angular](https://angular.dev/) (v19+)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (Wrapper for IndexedDB)
- **Charts**: [Chart.js](https://www.chartjs.org/) / [Ng2-Charts](https://valor-software.com/ng2-charts/)

## Quick Start
### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Mim0518/WorkoutTracker.git
   ```

2. Install dependencies:
   ```bash
   cd WorkoutTracker
   npm install
   ```

3. Start the development server:
   ```bash
   ng serve
   ```
   Navigate to `http://localhost:4200/`.

## Localization (i18n)

This application is localized for **English (en-US)** and **Spanish (es-MX)**.

### Running Locally
```bash
# Run in English (default)
ng serve

# Run in Spanish
ng serve --configuration=es-MX
```

### Building
```bash
# Build for Spanish
ng build --configuration=es-MX

# Build for Production (all locales if configured)
ng build
```

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit pull requests and report issues.

## License
MIT
