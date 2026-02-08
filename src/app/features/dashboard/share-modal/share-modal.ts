import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2canvas from 'html2canvas';

@Component({
    selector: 'app-share-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './share-modal.html'
})
export class ShareModalComponent {
    @Input() isOpen = false;
    @Input() stats: any = { workouts: 0, volume: 0, exercises: 0 };
    @Output() close = new EventEmitter<void>();
    @ViewChild('captureArea') captureArea!: ElementRef;

    isGenerating = false;

    closeModal() {
        this.close.emit();
    }

    async captureImage() {
        if (this.isGenerating) return;
        this.isGenerating = true;

        try {
            const canvas = await html2canvas(this.captureArea.nativeElement, {
                backgroundColor: '#1f2937', // Match bg-gray-800
                scale: 2, // Higher quality
                logging: false
            });

            const link = document.createElement('a');
            link.download = `workout-summary-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.closeModal();
        } catch (err) {
            console.error('Capture failed', err);
            alert('Failed to generate image. Please try again.');
        } finally {
            this.isGenerating = false;
        }
    }

    get currentDate(): string {
        return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
}
