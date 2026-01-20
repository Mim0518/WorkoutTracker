import { Component, Input, Output, EventEmitter, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkoutService } from '../../../services/workout.service';

@Component({
    selector: 'app-settings-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './settings-modal.html'
})
export class SettingsModalComponent {
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    private workoutService = inject(WorkoutService);

    closeModal() {
        this.close.emit();
    }

    confirmClear() {
        if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
            this.workoutService.clearDatabase();
        }
    }

    exportData() {
        this.workoutService.exportData();
    }

    triggerImport() {
        this.fileInput.nativeElement.click();
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            if (confirm('Importing data will OVERWRITE your current history. Continue?')) {
                this.workoutService.importData(file).catch(err => {
                    alert('Import failed: ' + err.message);
                });
            }
            // Reset input so same file can be selected again if needed
            event.target.value = '';
        }
    }

    loadDemoData() {
        if (confirm('This will OVERWRITE your current data with sample data. Continue?')) {
            this.workoutService.generateDemoData();
        }
    }
}
