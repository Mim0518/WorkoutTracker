import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
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

    private workoutService = inject(WorkoutService);

    closeModal() {
        this.close.emit();
    }

    confirmClear() {
        if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
            this.workoutService.clearDatabase();
        }
    }
}
