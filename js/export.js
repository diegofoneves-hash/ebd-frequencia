class ExportManager {
    constructor() {
        this.jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
        this.XLSX = window.XLSX;
    }

    async exportToPDF(data, type = 'summary') {
        if (!this.jsPDF) {
            this.loadPDFLibrary();
            return;
        }

        const doc = new this.jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Cabeçalho
        doc.setFontSize(20);
        doc.text('Relatório de Frequência - EBD', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Data: ${utils.formatDate(new Date())}`, 20, 35);
        doc.text(`Período: ${document.getElementById('start-date').value} a ${document.getElementById('end-date').value}`, 20, 45);
        
        // Dados
        let yPos = 60;
        
        if (type === 'summary') {
            doc.setFontSize(14);
            doc.text('Resumo Geral', 20, yPos);
            yPos += 10;
            
            // Adicionar tabela de resumo
            const summaryData = this.prepareSummaryData(data);
            doc.autoTable({
                startY: yPos,
                head: [['Data', 'Presentes', 'Atrasados', 'Faltas', 'Total']],
                body: summaryData,
                theme: 'striped',
                headStyles: { fillColor: [52, 152, 219] }
            });
        } else if (type === 'detailed') {
            // Relatório detalhado
            doc.setFontSize(14);
            doc.text('Relatório Detalhado por Membro', 20, yPos);
            yPos += 10;
            
            const detailedData = this.prepareDetailedData(data);
            doc.autoTable({
                startY: yPos,
                head: [['Membro', 'Turma', 'Presentes', 'Atrasos', 'Faltas', 'Taxa']],
                body: detailedData,
                theme: 'striped',
                headStyles: { fillColor: [46, 204, 113] }
            });
        }
        
        // Rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
            doc.text('Sistema de Frequência EBD © 2024', 20, pageHeight - 10);
        }
        
        doc.save(`relatorio_frequencia_${utils.getTodayDateKey()}.pdf`);
    }

    async exportToExcel(data, type = 'summary') {
        if (!this.XLSX) {
            console.error('Biblioteca XLSX não carregada');
            return;
        }

        const wb = this.XLSX.utils.book_new();
        
        if (type === 'summary') {
            const wsData = [
                ['Relatório de Frequência - EBD'],
                [''],
                ['Data:', utils.formatDate(new Date())],
                ['Período:', `${document.getElementById('start-date').value} a ${document.getElementById('end-date').value}`],
                [''],
                ['Data', 'Presentes', 'Atrasados', 'Faltas', 'Total', 'Taxa (%)']
            ];
            
            data.forEach(day => {
                const total = day.present + day.late + day.absent;
                const rate = total > 0 ? ((day.present / total) * 100).toFixed(1) : 0;
                
                wsData.push([
                    day.date,
                    day.present,
                    day.late,
                    day.absent,
                    total,
                    rate
                ]);
            });
            
            const ws = this.XLSX.utils.aoa_to_sheet(wsData);
            this.XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
        }
        
        // Salvar arquivo
        this.XLSX.writeFile(wb, `relatorio_frequencia_${utils.getTodayDateKey()}.xlsx`);
    }

    exportChart(chartId, fileName) {
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = `${fileName}_${utils.getTodayDateKey()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    prepareSummaryData(data) {
        return data.map(day => {
            const total = day.present + day.late + day.absent;
            const rate = total > 0 ? ((day.present / total) * 100).toFixed(1) : 0;
            return [
                day.date,
                day.present,
                day.late,
                day.absent,
                total,
                `${rate}%`
            ];
        });
    }

    prepareDetailedData(data) {
        // Preparar dados detalhados por membro
        const membersData = [];
        // Implementar lógica específica
        return membersData;
    }

    loadPDFLibrary() {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            this.jsPDF = window.jspdf.jsPDF;
            // Carregar autoTable plugin se necessário
            const autoTableScript = document.createElement('script');
            autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            document.head.appendChild(autoTableScript);
        };
        document.head.appendChild(script);
    }
}

window.ExportManager = ExportManager;