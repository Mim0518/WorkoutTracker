import { Injectable } from '@angular/core';
import { Workout } from '../models/workout.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    constructor() { }

    /**
     * Generates a PDF report of the provided workouts
     */
    generateWorkoutReport(workouts: Workout[]) {
        if (!workouts || workouts.length === 0) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const today = new Date().toLocaleDateString();

        // -- Header --
        // Title
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text('Workout History Report', pageWidth / 2, 20, { align: 'center' });

        // Subtitle / Date
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${today}`, pageWidth / 2, 30, { align: 'center' });

        // -- Summary Section --
        const totalWorkouts = workouts.length;
        const totalVolume = workouts.reduce((acc, w) =>
            acc + w.exercises.reduce((eAcc, e) =>
                eAcc + e.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0)
                , 0)
            , 0);

        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text('Summary', 14, 45);

        autoTable(doc, {
            startY: 50,
            head: [['Total Workouts', 'Total Volume (kg)', 'Period']],
            body: [[
                totalWorkouts.toString(),
                Math.round(totalVolume).toLocaleString(),
                'All Time'
            ]],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] } // Blue header
        });

        // -- Detailed Logs Section --
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.text('Detailed Sessions', 14, finalY);

        // Prepare table data
        const rows: any[] = [];
        workouts.forEach(w => {
            const dateStr = new Date(w.date).toLocaleDateString();
            w.exercises.forEach(ex => {
                // Aggregate sets for cleaner table: "3 sets (100kg x 8, 100kg x 8...)" or just list distinct
                // Let's just list summary: "3 sets" and "Best Set" or "Avg Weight" to save space?
                // Or one row per exercise with set details in a string?
                const setDetails = ex.sets.map(s => `${s.weight}kg x ${s.reps}`).join(', ');
                rows.push([
                    dateStr,
                    w.name,
                    ex.name,
                    ex.sets.length,
                    setDetails
                ]);
            });
        });

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Date', 'Workout', 'Exercise', 'Sets', 'Details']],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [75, 85, 99] }, // Gray header
            columnStyles: {
                0: { cellWidth: 25 }, // Date
                1: { cellWidth: 35 }, // Workout
                2: { cellWidth: 40 }, // Exercise
                3: { cellWidth: 15 }, // Sets
                4: { cellWidth: 'auto' } // Details
            },
            styles: { fontSize: 8 }
        });

        // -- Footer --
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Workout Tracker | AFDevelopment', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        // Save
        doc.save(`workout_report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
}
