import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkoutNotification } from '../../../services/prediction.service';

@Component({
  selector: 'app-notification-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-card.html',
  styleUrl: './notification-card.css'
})
export class NotificationCardComponent {
  @Input({ required: true }) notification!: WorkoutNotification;
  @Output() dismiss = new EventEmitter<void>();

  get icon(): string {
    switch (this.notification.type) {
      case 'progressive-overload': return '📈';
      case 'deload': return '🛌';
      case 'weight-suggestion': return '💡';
      default: return '📢';
    }
  }

  get colorClass(): string {
    switch (this.notification.type) {
      case 'progressive-overload': return 'bg-green-900/30 border-green-700/50 text-green-100';
      case 'deload': return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-100';
      case 'weight-suggestion': return 'bg-blue-900/30 border-blue-700/50 text-blue-100';
      default: return 'bg-gray-800 border-gray-700 text-gray-100';
    }
  }
}
