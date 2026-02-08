import { Injectable } from '@angular/core';
import confetti from 'canvas-confetti';

@Injectable({
    providedIn: 'root'
})
export class ConfettiService {

    constructor() { }

    /**
     * Trigger a celebration confetti explosion
     */
    celebrate() {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            // launch a few confetti from the left edge
            confetti({
                particleCount: 7,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                zIndex: 9999
            });
            // and launch a few from the right edge
            confetti({
                particleCount: 7,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                zIndex: 9999
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    /**
     * Small burst for minor achievements
     */
    smallBurst() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 9999
        });
    }
}
