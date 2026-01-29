class ChartsManager {
    constructor() {
        this.charts = {};
    }

    async renderAttendanceTrend(data) {
        const ctx = document.getElementById('attendanceTrendChart').getContext('2d');
        
        if (this.charts.trend) {
            this.charts.trend.destroy();
        }

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: [
                    {
                        label: 'Presentes',
                        data: data.present,
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Atrasados',
                        data: data.late,
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Faltas',
                        data: data.absent,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    }
                }
            }
        });
    }

    renderClassDistribution(data) {
        const ctx = document.getElementById('classDistributionChart').getContext('2d');
        
        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }

        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Membros por Turma',
                    data: data.values,
                    backgroundColor: [
                        '#3498db', '#2ecc71', '#e74c3c', '#f39c12', 
                        '#9b59b6', '#1abc9c', '#d35400'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderAttendanceRate(data) {
        const ctx = document.getElementById('attendanceRateChart').getContext('2d');
        
        if (this.charts.rate) {
            this.charts.rate.destroy();
        }

        this.charts.rate = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#27ae60', // Presente
                        '#f39c12', // Atrasado
                        '#e74c3c'  // Ausente
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async updateCharts() {
        try {
            // Obter dados dos últimos 7 dias
            const endDate = utils.getTodayDateKey();
            const startDate = this.getDateXDaysAgo(7);
            
            const summary = await db.getAttendanceSummary(startDate, endDate);
            const members = await db.getAllMembers();
            
            // Preparar dados para gráficos
            const trendData = this.prepareTrendData(summary);
            const distributionData = this.prepareDistributionData(members);
            const rateData = this.prepareRateData(summary);
            
            // Renderizar gráficos
            this.renderAttendanceTrend(trendData);
            this.renderClassDistribution(distributionData);
            this.renderAttendanceRate(rateData);
            
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }

    prepareTrendData(summary) {
        const dates = [];
        const present = [];
        const late = [];
        const absent = [];
        
        summary.forEach(day => {
            dates.push(utils.formatDate(new Date(day.date), 'DD/MM'));
            present.push(day.present);
            late.push(day.late);
            absent.push(day.absent);
        });
        
        return { dates, present, late, absent };
    }

    prepareDistributionData(members) {
        const classCount = {};
        
        members.forEach(member => {
            const className = member.class || 'Sem Turma';
            classCount[className] = (classCount[className] || 0) + 1;
        });
        
        return {
            labels: Object.keys(classCount),
            values: Object.values(classCount)
        };
    }

    prepareRateData(summary) {
        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;
        
        summary.forEach(day => {
            totalPresent += day.present;
            totalLate += day.late;
            totalAbsent += day.absent;
        });
        
        const total = totalPresent + totalLate + totalAbsent;
        
        return {
            labels: ['Presentes', 'Atrasados', 'Faltas'],
            values: [
                Math.round((totalPresent / total) * 100) || 0,
                Math.round((totalLate / total) * 100) || 0,
                Math.round((totalAbsent / total) * 100) || 0
            ]
        };
    }

    getDateXDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return utils.formatDate(date, 'YYYY-MM-DD');
    }
}

window.ChartsManager = ChartsManager;