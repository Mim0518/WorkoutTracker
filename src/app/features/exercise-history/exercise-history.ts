import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PRService } from '../../services/pr.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

@Component({
    selector: 'app-exercise-history',
    standalone: true,
    imports: [CommonModule, BaseChartDirective, RouterLink],
    templateUrl: './exercise-history.html'
})
export class ExerciseHistoryComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private prService = inject(PRService);

    exerciseName = signal('');
    history = signal<{ date: Date, value: number, type: string }[]>([]);

    // Chart Config
    public lineChartData: ChartConfiguration['data'] = {
        datasets: [],
        labels: []
    };

    public lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: {
                tension: 0.4
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        },
        plugins: {
            legend: { display: false }
        }
    };

    public lineChartType: ChartType = 'line';

    async ngOnInit() {
        this.route.paramMap.subscribe(params => {
            const name = params.get('name');
            if (name) {
                this.exerciseName.set(name);
                this.loadHistory(name);
            }
        });
    }

    async loadHistory(name: string) {
        const data = await this.prService.getPRHistory(name);
        this.history.set(data);

        // Prepare Chart Data
        this.lineChartData = {
            datasets: [
                {
                    data: data.map(d => d.value),
                    label: 'Estimated 1RM (kg)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue-500
                    borderColor: '#3b82f6',
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(59, 130, 246, 1)',
                    fill: 'origin',
                }
            ],
            labels: data.map(d => new Date(d.date).toLocaleDateString())
        };
    }
}
