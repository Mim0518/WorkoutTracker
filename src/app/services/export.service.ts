import { Injectable } from '@angular/core';
import { Workout } from '../models/workout.model';
import * as XLSX from 'xlsx';

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    constructor() { }

    /**
     * Export workouts to a CSV file
     */
    exportToCsv(workouts: Workout[], filename: string = 'workout-history.csv') {
        if (!workouts || workouts.length === 0) return;

        // Flatten data: Date, Workout Name, Exercise, Set #, Weight, Reps
        const headers = ['Date', 'Workout Name', 'Exercise', 'Set', 'Weight (kg)', 'Reps'];
        const rows: string[] = [headers.join(',')];

        workouts.forEach(w => {
            const date = new Date(w.date).toISOString().split('T')[0];
            const workoutName = this.escapeCsv(w.name);

            w.exercises.forEach(ex => {
                const exName = this.escapeCsv(ex.name);
                ex.sets.forEach((set, index) => {
                    const row = [
                        date,
                        workoutName,
                        exName,
                        (index + 1).toString(),
                        set.weight.toString(),
                        set.reps.toString()
                    ];
                    rows.push(row.join(','));
                });
            });
        });

        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Export workouts to an Excel file (.xlsx)
     */
    exportToExcel(workouts: Workout[], filename: string = 'workout-history.xlsx') {
        if (!workouts || workouts.length === 0) return;

        // 1. Prepare Data for Sheet 1: Detailed Logs
        const data: any[] = [];
        workouts.forEach(w => {
            const date = new Date(w.date);
            // Determine day of week
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = days[date.getDay()];

            w.exercises.forEach(ex => {
                ex.sets.forEach((set, index) => {
                    data.push({
                        'Date': date,
                        'Day': dayName,
                        'Workout Name': w.name,
                        'Exercise': ex.name,
                        'Set': index + 1,
                        'Weight (kg)': set.weight,
                        'Reps': set.reps,
                        'Volume (kg)': set.weight * set.reps
                    });
                });
            });
        });

        // 2. Create Sheet
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

        // Auto-width columns (simple heuristic)
        const wscols = [
            { wch: 12 }, // Date
            { wch: 10 }, // Day
            { wch: 20 }, // Workout
            { wch: 20 }, // Exercise
            { wch: 5 },  // Set
            { wch: 10 }, // Weight
            { wch: 5 },  // Reps
            { wch: 12 }  // Volume
        ];
        ws['!cols'] = wscols;

        // 3. Create Workbook
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Workout Logs');

        // 4. Write File
        XLSX.writeFile(wb, filename);
    }

    private escapeCsv(str: string): string {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}
