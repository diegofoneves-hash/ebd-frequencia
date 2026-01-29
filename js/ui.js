// Gerenciamento de interface do usuário
class UI {
    constructor() {
        this.currentFilter = {
            class: '',
            search: ''
        };
        this.currentlyEditingMember = null; // Para rastrear qual membro está sendo editado
    }

    async init() {
    this.setupTabs();
    this.setupEventListeners();
    this.updateDateTime(); // Chama apenas updateDateTime
    setInterval(() => this.updateDateTime(), 1000);
    
    // Configurar modais
    utils.setupModal('multi-member-modal');
    
    // Configurar ano atual
    const currentYear = document.getElementById('current-year');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }
    
    // Configurar eventos das turmas
    this.setupClassEvents();

    // Carregar turmas do servidor para popular os selects
    try {
        await this.updateClassSelects();
    } catch (err) {
        console.error('Falha ao carregar turmas na inicialização:', err);
    }

    // Inicializar gráficos
    this.initCharts();
}

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }

 switchTab(tabId) {
    console.log(`Mudando para aba: ${tabId}`);
    
    // Atualizar tabs visuais
    document.querySelectorAll('.tab').forEach(t => {
        const isActive = t.getAttribute('data-tab') === tabId;
        t.classList.toggle('active', isActive);
    });

    // Esconder todos os conteúdos primeiro
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    
    // Mostrar apenas o conteúdo da aba ativa
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.add('active');
        activeContent.style.display = 'block';
    }

    // Carregar dados específicos da tab
    switch(tabId) {
        case 'attendance':
            console.log('Carregando lista de presença...');
            this.loadAttendanceList();
            break;
        case 'members':
            console.log('Carregando lista de membros...');
            this.loadMembersList();
            break;
        case 'reports':
            console.log('Carregando relatórios...');
            this.loadReports();
            if (window.chartsManager) {
                window.chartsManager.updateCharts();
            }
            break;
        case 'classes':
            console.log('Carregando turmas...');
            this.loadClasses();
            break;
        case 'add-member':
            console.log('Aba de adicionar membro ativa');
            this.clearMemberForm();
            break;
        case 'settings':
            console.log('Carregando configurações...');
            this.loadSettings();
            break;
    }
}

   async loadAttendanceList() {
    const container = document.getElementById('attendance-list');
    if (!container) return;
    
    // Obter data selecionada
    const dateInput = document.getElementById('attendance-date');
    let selectedDate = dateInput ? dateInput.value : '';
    
    // Se não houver data selecionada, usar hoje e atualizar input
    if (!selectedDate) {
        selectedDate = utils.getTodayDateKey();
        if (dateInput) {
            dateInput.value = selectedDate;
            // Disparar evento change para atualizar status
            setTimeout(() => {
                dateInput.dispatchEvent(new Event('change'));
            }, 100);
        }
    }
    
    // Atualizar display da data
    this.updateDateStatus();
    
    // Mostrar loading
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
            <p>Carregando membros para ${selectedDate}...</p>
        </div>
    `;

    try {
        const members = await db.getMembers(this.currentFilter);
        const attendance = await db.getDailyAttendance(selectedDate);
        
        // Criar mapa de presença
        const attendanceMap = {};
        attendance.forEach(record => {
            attendanceMap[record.member_id] = record.status;
        });

        container.innerHTML = '';

        if (members.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 15px;"></i>
                    <h3>Nenhum membro encontrado</h3>
                    <p>${this.currentFilter.search || this.currentFilter.class ? 
                        'Tente alterar os filtros' : 
                        'Adicione membros na aba "Adicionar Membro"'}</p>
                </div>
            `;
            return;
        }

        members.forEach(member => {
            const status = attendanceMap[member.id] || 'absent';
            const memberCard = this.createMemberCard(member, status);
            container.appendChild(memberCard);
        });

        // Atualizar eventos dos botões
        this.setupAttendanceButtons();

    } catch (error) {
        console.error('Erro ao carregar lista:', error);
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <h3>Erro ao carregar dados</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

    createMemberCard(member, status) {
    const card = document.createElement('div');
    card.className = `member-card ${status}`;
    card.dataset.id = member.id;

    const age = member.birthdate ? utils.calculateAge(member.birthdate) : null;
    const ageText = age ? ` | ${age} anos` : '';

    card.innerHTML = `
        <div class="member-info">
            <h4>${member.name}</h4>
            <p>
                <i class="fas fa-users"></i> ${member.class || 'Não informado'} 
                ${ageText}
            </p>
            <p>
                <i class="fas fa-phone"></i> ${member.phone ? utils.formatPhone(member.phone) : 'Não informado'}
                ${member.email ? ` | <i class="fas fa-envelope"></i> ${member.email}` : ''}
            </p>
        </div>
        <div class="attendance-status">
            <button class="status-btn status-present ${status === 'present' ? 'active' : ''}" 
                    data-id="${member.id}" data-status="present">
                <i class="fas fa-check"></i> Presente
            </button>
            <button class="status-btn status-late ${status === 'late' ? 'active' : ''}" 
                    data-id="${member.id}" data-status="late">
                <i class="fas fa-clock"></i> Atrasado
            </button>
            <button class="status-btn status-absent ${status === 'absent' ? 'active' : ''}" 
                    data-id="${member.id}" data-status="absent">
                <i class="fas fa-times"></i> Ausente
            </button>
        </div>
    `;

    return card;
}


    getGenderIcon(gender) {
        switch(gender) {
            case 'M': return '<i class="fas fa-mars" style="color: #3498db;"></i>';
            case 'F': return '<i class="fas fa-venus" style="color: #e84393;"></i>';
            default: return '';
        }
    }

    setupAttendanceButtons() {
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const memberId = parseInt(e.currentTarget.dataset.id);
            const status = e.currentTarget.dataset.status;
            const dateInput = document.getElementById('attendance-date');
            const selectedDate = dateInput ? dateInput.value : utils.getTodayDateKey();
            
            try {
                await db.markAttendance(memberId, selectedDate, status, utils.formatTimeShort());
                this.loadAttendanceList();
                utils.showNotification(`Presença registrada: ${this.getStatusText(status)}`, 'success');
            } catch (error) {
                utils.showNotification(`Erro ao registrar presença: ${error.message}`, 'error');
            }
        });
    });
}

    async loadMembersList() {
        const container = document.getElementById('members-list');
        if (!container) return;
        
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Carregando lista de membros...</p>
            </div>
        `;

        try {
            const members = await db.getAllMembers();
            
            container.innerHTML = '';

            if (members.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <h3>Nenhum membro cadastrado</h3>
                        <p>Adicione membros usando o formulário na aba "Adicionar Membro".</p>
                    </div>
                `;
                return;
            }

            members.forEach(member => {
                const memberCard = this.createMemberListCard(member);
                container.appendChild(memberCard);
            });

        } catch (error) {
            console.error('Erro ao carregar membros:', error);
            utils.showNotification('Erro ao carregar lista de membros', 'error');
        }
    }

    createMemberListCard(member) {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.dataset.id = member.id;
        
        const age = member.birthdate ? utils.calculateAge(member.birthdate) : null;
        const ageText = age ? ` | ${age} anos` : '';
        const statusBadge = member.active ? 
            '<span style="color: #27ae60;"><i class="fas fa-circle"></i> Ativo</span>' : 
            '<span style="color: #e74c3c;"><i class="fas fa-circle"></i> Inativo</span>';
        const genderIcon = this.getGenderIcon(member.gender);

        card.innerHTML = `
            <div class="member-info">
                <h4>${member.name} ${genderIcon} ${statusBadge}</h4>
                <p>
                    <i class="fas fa-users"></i> ${member.class || 'Não informado'} 
                    ${ageText}
                </p>
                <p>
                    <i class="fas fa-phone"></i> ${member.phone ? utils.formatPhone(member.phone) : 'Não informado'}
                    ${member.email ? ` | <i class="fas fa-envelope"></i> ${member.email}` : ''}
                </p>
                <p style="font-size: 0.8rem; margin-top: 5px; color: #95a5a6;">
                    <i class="fas fa-id-card"></i> ID: ${member.id} | 
                    <i class="fas fa-calendar"></i> Cadastrado: ${new Date(member.created_at).toLocaleDateString('pt-BR')}
                </p>
            </div>
            <div>
                <button class="btn btn-outline edit-member" data-id="${member.id}" style="margin-bottom: 5px;">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger delete-member" data-id="${member.id}">
                    <i class="fas fa-trash"></i> Remover
                </button>
            </div>
        `;

        return card;
    }

    async loadReports() {
        const period = document.getElementById('report-period');
        if (!period) return;
        
        const { startDate, endDate } = this.getDateRangeFromPeriod(period.value);

        try {
            const summary = await db.getAttendanceSummary(startDate, endDate);
            this.updateReportSummary(summary, period.value);
            this.updateAttendanceHistory(summary);
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            utils.showNotification('Erro ao carregar relatórios', 'error');
        }
    }

    updateReportSummary(summary, period) {
        const container = document.getElementById('report-summary');
        if (!container) return;
        
        // Calcular totais
        let totalPresent = 0;
        let totalLate = 0;
        let totalAbsent = 0;
        let totalRecords = 0;
        
        summary.forEach(day => {
            totalPresent += day.present;
            totalLate += day.late;
            totalAbsent += day.absent;
            totalRecords += day.total;
        });
        
        const totalMembers = totalPresent + totalLate + totalAbsent;
        
        container.innerHTML = `
            <div class="summary-card present">
                <i class="fas fa-user-check"></i>
                <div class="summary-number">${totalPresent}</div>
                <p>Presentes</p>
                <small>${totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0}%</small>
            </div>
            
            <div class="summary-card late">
                <i class="fas fa-clock"></i>
                <div class="summary-number">${totalLate}</div>
                <p>Atrasados</p>
                <small>${totalRecords > 0 ? Math.round((totalLate / totalRecords) * 100) : 0}%</small>
            </div>
            
            <div class="summary-card absent">
                <i class="fas fa-user-times"></i>
                <div class="summary-number">${totalAbsent}</div>
                <p>Faltantes</p>
                <small>${totalRecords > 0 ? Math.round((totalAbsent / totalRecords) * 100) : 0}%</small>
            </div>
            
            <div class="summary-card total">
                <i class="fas fa-chart-line"></i>
                <div class="summary-number">${totalMembers}</div>
                <p>Total de Registros</p>
                <small>${summary.length} ${period === 'today' ? 'dia' : 'dias'}</small>
            </div>
        `;
    }

    updateAttendanceHistory(summary) {
        const container = document.getElementById('attendance-history');
        if (!container) return;
        
        if (summary.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #7f8c8d; background-color: white; border-radius: 10px;">
                    <i class="fas fa-history" style="font-size: 2.5rem; margin-bottom: 15px;"></i>
                    <h3>Nenhum registro no período</h3>
                    <p>Não há registros de frequência no período selecionado.</p>
                </div>
            `;
            return;
        }
        
        let historyHTML = '<div style="display: grid; gap: 15px;">';
        
        summary.forEach(day => {
            const [year, month, date] = day.date.split('-');
            const formattedDate = `${date}/${month}/${year}`;
            const dateObj = new Date(day.date);
            const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
            
            const attendanceRate = day.total > 0 ? Math.round(((day.present + day.late) / day.total) * 100) : 0;
            
            historyHTML += `
                <div style="background-color: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                        <div>
                            <h4 style="color: #2c3e50; margin: 0;">${formattedDate} - ${dayOfWeek}</h4>
                            <small style="color: #7f8c8d;">Taxa de presença: ${attendanceRate}%</small>
                        </div>
                        <span style="font-weight: 600; color: #3498db; font-size: 1.2rem;">${day.present + day.late}/${day.total}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.9rem;">
                        <div style="text-align: center; padding: 8px; background-color: rgba(39, 174, 96, 0.1); border-radius: 5px;">
                            <i class="fas fa-user-check" style="color: #27ae60;"></i><br>
                            <strong>${day.present}</strong><br>
                            <small>Presentes</small>
                        </div>
                        <div style="text-align: center; padding: 8px; background-color: rgba(243, 156, 18, 0.1); border-radius: 5px;">
                            <i class="fas fa-clock" style="color: #f39c12;"></i><br>
                            <strong>${day.late}</strong><br>
                            <small>Atrasados</small>
                        </div>
                        <div style="text-align: center; padding: 8px; background-color: rgba(149, 165, 166, 0.1); border-radius: 5px;">
                            <i class="fas fa-user-times" style="color: #95a5a6;"></i><br>
                            <strong>${day.absent}</strong><br>
                            <small>Faltantes</small>
                        </div>
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
        container.innerHTML = historyHTML;
    }

    async loadSettings() {
        // Carregar configurações atuais
        const settings = db.settings;
        
        document.getElementById('class-time-hour').value = settings.classHour;
        document.getElementById('class-time-minute').value = settings.classMinute;
        document.getElementById('class-duration').value = settings.classDuration;
        document.getElementById('tolerance-minutes').value = settings.toleranceMinutes;
        
        // Atualizar informações do banco de dados
        await this.updateDatabaseInfo();
    }

    async updateDatabaseInfo() {
        try {
            const info = await db.getDatabaseInfo();
            const dbInfoElement = document.getElementById('db-info');
            if (!dbInfoElement) return;
            
            const sizeInKB = (info.dbSize / 1024).toFixed(2);
            const lastDate = info.lastAttendanceDate !== 'Nenhum' ? 
                utils.formatDate(new Date(info.lastAttendanceDate), 'DD/MM/YYYY') : 
                'Nenhum registro';
            
            dbInfoElement.innerHTML = `
                Total de membros: ${info.membersCount}<br>
                Membros ativos: ${info.activeMembersCount}<br>
                Registros de frequência: ${info.attendanceCount}<br>
                Último registro: ${lastDate}<br>
                Tamanho do banco: ${sizeInKB} KB
            `;
        } catch (error) {
            console.error('Erro ao obter informações do banco:', error);
            const dbInfoElement = document.getElementById('db-info');
            if (dbInfoElement) {
                dbInfoElement.textContent = 'Erro ao carregar informações';
            }
        }
    }

    updateDateTime() {
    const now = new Date();
    
    // Formatar data
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = utils.formatDate(now, 'pt-BR');
    }
    
    // Atualizar relógio
    const timeString = utils.formatTime(now);
    const currentTimeElement = document.getElementById('current-time');
    const liveClockElement = document.getElementById('live-clock');
    
    if (currentTimeElement) currentTimeElement.textContent = timeString;
    if (liveClockElement) liveClockElement.textContent = utils.formatTimeShort(now);
    
    // Atualizar status da data
    this.updateDateStatus();
}


    // ========== MÉTODOS DE EXPORTAÇÃO ==========

    async exportReportToPDF() {
        try {
            utils.showNotification('Gerando PDF...', 'info');
            
            const period = document.getElementById('report-period').value;
            const { startDate, endDate } = this.getDateRangeFromPeriod(period);
            
            // Obter dados do relatório
            const summary = await db.getAttendanceSummary(startDate, endDate);
            const members = await db.getAllMembers();
            
            // Usar ExportManager
            if (window.exportManager) {
                await window.exportManager.exportToPDF({
                    summary,
                    members,
                    period,
                    startDate,
                    endDate
                }, 'summary');
                
                utils.showNotification('PDF gerado com sucesso!', 'success');
            } else {
                throw new Error('ExportManager não está disponível');
            }
            
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            utils.showNotification(`Erro ao gerar PDF: ${error.message}`, 'error');
        }
    }

    async exportReportToExcel() {
        try {
            utils.showNotification('Gerando Excel...', 'info');
            
            const period = document.getElementById('report-period').value;
            const { startDate, endDate } = this.getDateRangeFromPeriod(period);
            
            // Obter dados do relatório
            const summary = await db.getAttendanceSummary(startDate, endDate);
            
            // Usar ExportManager
            if (window.exportManager) {
                await window.exportManager.exportToExcel(summary, 'summary');
                
                utils.showNotification('Excel gerado com sucesso!', 'success');
            } else {
                throw new Error('ExportManager não está disponível');
            }
            
        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            utils.showNotification(`Erro ao gerar Excel: ${error.message}`, 'error');
        }
    }

    exportCurrentChart() {
        try {
            if (window.exportManager) {
                window.exportManager.exportChart('attendanceTrendChart', 'grafico_evolucao_presenca');
                utils.showNotification('Gráfico exportado com sucesso!', 'success');
            } else {
                throw new Error('ExportManager não está disponível');
            }
        } catch (error) {
            console.error('Erro ao exportar gráfico:', error);
            utils.showNotification(`Erro ao exportar gráfico: ${error.message}`, 'error');
        }
    }

    async exportCompleteReport() {
        try {
            utils.showNotification('Gerando relatório completo...', 'info');
            
            const period = document.getElementById('report-period').value;
            const { startDate, endDate } = this.getDateRangeFromPeriod(period);
            
            // Obter todos os dados
            const [summary, members, classes] = await Promise.all([
                db.getAttendanceSummary(startDate, endDate),
                db.getAllMembers(),
                db.getClasses()
            ]);
            
            // Criar objeto com todos os dados
            const reportData = {
                summary,
                members,
                classes,
                settings: db.settings,
                generatedAt: new Date().toISOString(),
                period: {
                    startDate,
                    endDate,
                    type: period
                }
            };
            
            // Exportar como JSON (fallback)
            const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_completo_${utils.getTodayDateKey()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            utils.showNotification('Relatório completo exportado!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            utils.showNotification(`Erro ao exportar relatório: ${error.message}`, 'error');
        }
    }

    async exportMembersList() {
        try {
            utils.showNotification('Exportando lista de membros...', 'info');
            
            const members = await db.getAllMembers();
            
            // Criar CSV
            const headers = ['ID', 'Nome', 'Turma', 'Telefone', 'Email', 'Data Nascimento', 'Gênero', 'Ativo', 'Data Cadastro'];
            const csvRows = [];
            
            // Adicionar cabeçalho
            csvRows.push(headers.join(','));
            
            // Adicionar dados
            members.forEach(member => {
                const row = [
                    member.id,
                    `"${member.name}"`,
                    `"${member.class || ''}"`,
                    `"${member.phone || ''}"`,
                    `"${member.email || ''}"`,
                    member.birthdate || '',
                    member.gender || '',
                    member.active ? 'Sim' : 'Não',
                    new Date(member.created_at).toLocaleDateString('pt-BR')
                ];
                csvRows.push(row.join(','));
            });
            
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lista_membros_${utils.getTodayDateKey()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            utils.showNotification('Lista de membros exportada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao exportar lista de membros:', error);
            utils.showNotification(`Erro ao exportar lista: ${error.message}`, 'error');
        }
    }

    // Método auxiliar para obter datas do período
    getDateRangeFromPeriod(period) {
        let startDate, endDate;
        const today = utils.getTodayDateKey();
        
        switch(period) {
            case 'today':
                startDate = today;
                endDate = today;
                break;
            case 'week':
                const weekDates = utils.getWeekDates();
                startDate = weekDates[0];
                endDate = weekDates[6];
                break;
            case 'month':
                const monthDates = utils.getMonthDates();
                startDate = monthDates[0];
                endDate = monthDates[monthDates.length - 1];
                break;
            case 'all':
                startDate = '1900-01-01';
                endDate = '2100-12-31';
                break;
            default:
                startDate = today;
                endDate = today;
        }
        
        return { startDate, endDate };
    }

   updateDateStatus() {
    const dateInput = document.getElementById('attendance-date');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const dateStatus = document.getElementById('date-status');
    
    if (!dateInput || !selectedDateDisplay || !dateStatus) return;
    
    const selectedDate = dateInput.value;
    const today = utils.getTodayDateKey();
    
    // Formatar a data para exibição
    let formattedDate = 'Hoje';
if (selectedDate) {
    formattedDate = utils.formatDate(selectedDate, 'DD/MM/YYYY');
}
    
    // Atualizar display
    if (selectedDate === today) {
        selectedDateDisplay.textContent = 'Hoje';
        dateStatus.innerHTML = '<i class="fas fa-calendar-day"></i> Registrando presença para hoje';
    } else {
        selectedDateDisplay.textContent = formattedDate;
        dateStatus.innerHTML = `<i class="fas fa-calendar-check"></i> Registrando presença para ${formattedDate}`;
    }
    
    console.log('Data selecionada:', selectedDate, 'Formatada:', formattedDate);
}

    isWithinTolerance(date) {
        const settings = db.settings;
        const classStartHour = settings.classHour;
        const classStartMinute = settings.classMinute;
        const toleranceMinutes = settings.toleranceMinutes;
        
        const totalCurrentMinutes = date.getHours() * 60 + date.getMinutes();
        const totalClassStartMinutes = classStartHour * 60 + classStartMinute;
        const totalToleranceEnd = totalClassStartMinutes + toleranceMinutes;
        
        return totalCurrentMinutes <= totalToleranceEnd;
    }

    getStatusText(status) {
        const texts = {
            present: 'Presente',
            late: 'Atrasado',
            absent: 'Faltou'
        };
        return texts[status] || status;
    }

    // ========== MÉTODOS PARA GERENCIAMENTO DE MEMBROS ==========

    async editMember(memberId) {
        try {
            const member = await db.getMember(memberId);
            if (!member) {
                utils.showNotification('Membro não encontrado', 'warning');
                return;
            }

            // Salvar ID do membro em edição
            this.currentlyEditingMember = memberId;

            // Preencher formulário na aba "Adicionar Membro"
            document.getElementById('member-name').value = member.name;
            
            // Tratar turma
            const memberClassSelect = document.getElementById('member-class');
            const customClassContainer = document.getElementById('custom-class-container');
            const customClassInput = document.getElementById('custom-class');
            
            if (member.class) {
                // Verificar se a turma existe no select
                let optionExists = false;
                for (let option of memberClassSelect.options) {
                    if (option.value === member.class) {
                        optionExists = true;
                        break;
                    }
                }
                
                if (optionExists) {
                    memberClassSelect.value = member.class;
                    customClassContainer.style.display = 'none';
                } else {
                    memberClassSelect.value = 'Outra';
                    customClassContainer.style.display = 'block';
                    customClassInput.value = member.class;
                }
            } else {
                memberClassSelect.value = '';
                customClassContainer.style.display = 'none';
            }
            
            document.getElementById('member-phone').value = member.phone || '';
            document.getElementById('member-email').value = member.email || '';
            document.getElementById('member-birthdate').value = member.birthdate || '';
            document.getElementById('member-gender').value = member.gender || '';
            document.getElementById('member-active').checked = member.active;
            
            // Mudar texto do botão
            const saveButton = document.getElementById('save-member');
            saveButton.innerHTML = '<i class="fas fa-save"></i> Atualizar Membro';
            saveButton.classList.add('btn-warning');
            saveButton.classList.remove('btn-success');
            
            // Mudar para aba de adicionar membro
            this.switchTab('add-member');
            
            utils.showNotification('Formulário preenchido com dados do membro. Faça as alterações necessárias e clique em "Atualizar Membro".', 'info');
            
        } catch (error) {
            console.error('Erro ao carregar membro para edição:', error);
            utils.showNotification('Erro ao carregar dados do membro', 'error');
        }
    }

    async deleteMember(memberId) {
        try {
            const member = await db.getMember(memberId);
            if (!member) {
                utils.showNotification('Membro não encontrado', 'warning');
                return;
            }
            
            if (confirm(`Tem certeza que deseja excluir o membro "${member.name}"?\n\nEsta ação não pode ser desfeita!`)) {
                await db.deleteMember(memberId);
                utils.showNotification(`Membro "${member.name}" excluído com sucesso!`, 'success');
                
                // Recarregar lista de membros
                await this.loadMembersList();
                
                // Recarregar lista de presença se estiver naquela aba
                if (document.getElementById('attendance').classList.contains('active')) {
                    this.loadAttendanceList();
                }
            }
        } catch (error) {
            console.error('Erro ao excluir membro:', error);
            utils.showNotification(`Erro ao excluir membro: ${error.message}`, 'error');
        }
    }

    // ========== MÉTODOS PARA GERENCIAMENTO DE TURMAS ==========

    async loadClasses() {
        const container = document.getElementById('classes-list');
        const formContainer = document.getElementById('class-form-container');
        
        if (!container) return;
        
        // Esconder formulário se estiver visível
        if (formContainer) {
            formContainer.style.display = 'none';
        }
        
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 15px;"></i>
                <p>Carregando turmas...</p>
            </div>
        `;

        try {
            const classes = await db.getClasses();
            
            container.innerHTML = '';

            if (classes.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-chalkboard-teacher" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <h3>Nenhuma turma cadastrada</h3>
                        <p>Clique no botão "Nova Turma" para começar.</p>
                    </div>
                `;
                return;
            }

            classes.forEach(classItem => {
                const classCard = this.createClassCard(classItem);
                container.appendChild(classCard);
            });

        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            utils.showNotification('Erro ao carregar turmas', 'error');
        }
    }

    createClassCard(classItem) {
        const card = document.createElement('div');
        card.className = 'member-card';
        card.dataset.id = classItem.id;
        
        const statusBadge = classItem.active ? 
            '<span style="color: #27ae60;"><i class="fas fa-circle"></i> Ativa</span>' : 
            '<span style="color: #e74c3c;"><i class="fas fa-circle"></i> Inativa</span>';

        let infoHTML = `
            <div class="member-info">
                <h4>${classItem.name} ${statusBadge}</h4>
                <p><i class="fas fa-user-tie"></i> Professor: ${classItem.teacher || 'Não definido'}</p>`;
        
        if (classItem.description) {
            infoHTML += `<p><i class="fas fa-info-circle"></i> ${classItem.description}</p>`;
        }
        
        if (classItem.room || classItem.schedule) {
            infoHTML += `<p><i class="fas fa-clock"></i> ${classItem.schedule || ''} ${classItem.room ? `| <i class="fas fa-door-open"></i> ${classItem.room}` : ''}</p>`;
        }
        
        infoHTML += `
                <p style="font-size: 0.8rem; margin-top: 5px; color: #95a5a6;">
                    <i class="fas fa-id-card"></i> ID: ${classItem.id} | 
                    <i class="fas fa-calendar"></i> Criada: ${new Date(classItem.created_at).toLocaleDateString('pt-BR')}
                </p>
            </div>`;
        
        card.innerHTML = infoHTML + `
            <div>
                <button class="btn btn-outline edit-class" data-id="${classItem.id}" style="margin-bottom: 5px;">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger delete-class" data-id="${classItem.id}">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        `;

        return card;
    }

    setupClassEvents() {
        // Botão para adicionar nova turma
        const addClassBtn = document.getElementById('add-class-btn');
        if (addClassBtn) {
            addClassBtn.addEventListener('click', () => {
                this.showClassForm();
            });
        }
        
        // Botão para salvar turma
        const saveClassBtn = document.getElementById('save-class');
        if (saveClassBtn) {
            saveClassBtn.addEventListener('click', async () => {
                await this.saveClass();
            });
        }
        
        // Botão para cancelar
        const cancelClassBtn = document.getElementById('cancel-class-form');
        if (cancelClassBtn) {
            cancelClassBtn.addEventListener('click', () => {
                this.hideClassForm();
            });
        }
        
        // Botão para excluir turma (no formulário)
        const deleteClassBtn = document.getElementById('delete-class');
        if (deleteClassBtn) {
            deleteClassBtn.addEventListener('click', async () => {
                const classId = deleteClassBtn.dataset.id;
                if (classId) {
                    await this.deleteClass(classId);
                }
            });
        }
        
        // Delegar eventos para elementos dinâmicos (edit-class e delete-class)
        document.addEventListener('click', async (e) => {
            // Editar turma
            if (e.target.closest('.edit-class')) {
                const button = e.target.closest('.edit-class');
                const classId = parseInt(button.dataset.id);
                await this.editClass(classId);
            }
            
            // Excluir turma
            if (e.target.closest('.delete-class')) {
                const button = e.target.closest('.delete-class');
                const classId = parseInt(button.dataset.id);
                await this.deleteClass(classId);
            }
        });
    }

    showClassForm(classId = null) {
        const formContainer = document.getElementById('class-form-container');
        const formTitle = document.getElementById('form-title');
        const deleteBtn = document.getElementById('delete-class');
        
        if (!formContainer || !formTitle) return;
        
        if (classId) {
            formTitle.textContent = 'Editar Turma';
            if (deleteBtn) {
                deleteBtn.style.display = 'inline-block';
                deleteBtn.dataset.id = classId;
            }
        } else {
            formTitle.textContent = 'Nova Turma';
            if (deleteBtn) {
                deleteBtn.style.display = 'none';
            }
            this.clearClassForm();
        }
        
        formContainer.style.display = 'block';
        const classNameInput = document.getElementById('class-name');
        if (classNameInput) classNameInput.focus();
        
        // Scroll para o formulário
        formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    hideClassForm() {
        const formContainer = document.getElementById('class-form-container');
        if (formContainer) {
            formContainer.style.display = 'none';
        }
        this.clearClassForm();
    }

    clearClassForm() {
        const classNameInput = document.getElementById('class-name');
        const classTeacherInput = document.getElementById('class-teacher');
        const classDescriptionInput = document.getElementById('class-description');
        const classRoomInput = document.getElementById('class-room');
        const classScheduleInput = document.getElementById('class-schedule');
        const classActiveInput = document.getElementById('class-active');
        const deleteClassBtn = document.getElementById('delete-class');
        
        if (classNameInput) classNameInput.value = '';
        if (classTeacherInput) classTeacherInput.value = '';
        if (classDescriptionInput) classDescriptionInput.value = '';
        if (classRoomInput) classRoomInput.value = '';
        if (classScheduleInput) classScheduleInput.value = '';
        if (classActiveInput) classActiveInput.checked = true;
        if (deleteClassBtn) deleteClassBtn.removeAttribute('data-id');
    }

    async saveClass() {
        const classNameInput = document.getElementById('class-name');
        const classTeacherInput = document.getElementById('class-teacher');
        const classDescriptionInput = document.getElementById('class-description');
        const classRoomInput = document.getElementById('class-room');
        const classScheduleInput = document.getElementById('class-schedule');
        const classActiveInput = document.getElementById('class-active');
        const deleteClassBtn = document.getElementById('delete-class');
        
        if (!classNameInput) return;
        
        const className = classNameInput.value.trim();
        const classTeacher = classTeacherInput ? classTeacherInput.value.trim() : '';
        const classDescription = classDescriptionInput ? classDescriptionInput.value.trim() : '';
        const classRoom = classRoomInput ? classRoomInput.value.trim() : '';
        const classSchedule = classScheduleInput ? classScheduleInput.value.trim() : '';
        const classActive = classActiveInput ? classActiveInput.checked : true;
        const classId = deleteClassBtn ? deleteClassBtn.dataset.id : null;
        
        // Validações
        if (!className) {
            utils.showNotification('Por favor, informe o nome da turma.', 'warning');
            classNameInput.focus();
            return;
        }
        
        try {
            const classData = {
                name: className,
                teacher: classTeacher || null,
                description: classDescription || null,
                room: classRoom || null,
                schedule: classSchedule || null,
                active: classActive
            };
            
            if (classId) {
                // Atualizar turma existente
                await db.updateClass(classId, classData);
                utils.showNotification(`Turma "${className}" atualizada com sucesso!`, 'success');
            } else {
                // Criar nova turma
                await db.addClass(classData);
                utils.showNotification(`Turma "${className}" criada com sucesso!`, 'success');
            }
            
            // Recarregar lista de turmas
            await this.loadClasses();
            this.hideClassForm();
            
            // Atualizar selects de turmas em outras partes do sistema
            await this.updateClassSelects();
            
        } catch (error) {
            console.error('Erro ao salvar turma:', error);
            utils.showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    async editClass(classId) {
        try {
            const classData = await db.getClass(classId);
            if (!classData) {
                utils.showNotification('Turma não encontrada', 'warning');
                return;
            }
            
            const classNameInput = document.getElementById('class-name');
            const classTeacherInput = document.getElementById('class-teacher');
            const classDescriptionInput = document.getElementById('class-description');
            const classRoomInput = document.getElementById('class-room');
            const classScheduleInput = document.getElementById('class-schedule');
            const classActiveInput = document.getElementById('class-active');
            
            if (classNameInput) classNameInput.value = classData.name;
            if (classTeacherInput) classTeacherInput.value = classData.teacher || '';
            if (classDescriptionInput) classDescriptionInput.value = classData.description || '';
            if (classRoomInput) classRoomInput.value = classData.room || '';
            if (classScheduleInput) classScheduleInput.value = classData.schedule || '';
            if (classActiveInput) classActiveInput.checked = classData.active;
            
            this.showClassForm(classId);
            
        } catch (error) {
            console.error('Erro ao carregar turma para edição:', error);
            utils.showNotification('Erro ao carregar dados da turma', 'error');
        }
    }

    async deleteClass(classId) {
        try {
            const classData = await db.getClass(classId);
            if (!classData) {
                utils.showNotification('Turma não encontrada', 'warning');
                return;
            }
            
            if (confirm(`Tem certeza que deseja excluir a turma "${classData.name}"? Esta ação não pode ser desfeita.`)) {
                await db.deleteClass(classId);
                utils.showNotification(`Turma "${classData.name}" excluída com sucesso!`, 'success');
                
                // Recarregar lista de turmas
                await this.loadClasses();
                this.hideClassForm();
                
                // Atualizar selects de turmas
                await this.updateClassSelects();
            }
        } catch (error) {
            console.error('Erro ao excluir turma:', error);
            utils.showNotification(`Erro: ${error.message}`, 'error');
        }
    }

    async updateClassSelects() {
  try {
    console.log('Atualizando selects de turmas...');
    const classes = await db.getActiveClasses();
    console.log('Classes carregadas do servidor:', classes);
    
    // Atualizar select no formulário de adicionar membro
    const memberClassSelect = document.getElementById('member-class');
    if (memberClassSelect) {
      const currentValue = memberClassSelect.value;
      memberClassSelect.innerHTML = `
        <option value="">Selecione uma turma</option>
        <option value="Outra">Outra</option>
      `;
      
      classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.name;
        option.textContent = classItem.name;
        if (option.value === currentValue) {
          option.selected = true;
        }
        memberClassSelect.appendChild(option);
      });
    }
    
    // Atualizar select no filtro de presença
    const filterClassSelect = document.getElementById('filter-class');
    if (filterClassSelect) {
      const currentValue = filterClassSelect.value;
      filterClassSelect.innerHTML = `<option value="">Todas as turmas</option>`;
      
      classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.name;
        option.textContent = classItem.name;
        if (option.value === currentValue) {
          option.selected = true;
        }
        filterClassSelect.appendChild(option);
      });
    }
    
    // Atualizar select no filtro de membros
    const filterMembersClass = document.getElementById('filter-members-class');
    if (filterMembersClass) {
      const currentValue = filterMembersClass.value;
      filterMembersClass.innerHTML = `<option value="">Todas as turmas</option>`;
      
      classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.name;
        option.textContent = classItem.name;
        if (option.value === currentValue) {
          option.selected = true;
        }
        filterMembersClass.appendChild(option);
      });
    }
    
    // Atualizar select no modal de múltiplos membros
    const multiMemberClassSelect = document.getElementById('multi-member-class');
    if (multiMemberClassSelect) {
      const currentValue = multiMemberClassSelect.value;
      multiMemberClassSelect.innerHTML = `<option value="">Selecione uma turma</option>`;
      
      classes.forEach(classItem => {
        const option = document.createElement('option');
        option.value = classItem.name;
        option.textContent = classItem.name;
        if (option.value === currentValue) {
          option.selected = true;
        }
        multiMemberClassSelect.appendChild(option);
      });
    }
    
    console.log('Selects de turmas atualizados com sucesso');
    
  } catch (error) {
    console.error('Erro ao atualizar selects de turmas:', error);
    
    // Criar opção padrão em caso de erro
    const defaultSelects = [
      'member-class',
      'filter-class', 
      'filter-members-class',
      'multi-member-class'
    ];
    
    defaultSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = `
          <option value="">Erro ao carregar turmas</option>
          <option value="Adultos">Adultos</option>
          <option value="Jovens">Jovens</option>
          <option value="Adolescentes">Adolescentes</option>
          <option value="Crianças">Crianças</option>
          <option value="Outra">Outra</option>
        `;
      }
    });
    
    utils.showNotification('Erro ao carregar turmas. Usando opções padrão.', 'warning');
  }
}

    // ========== GRÁFICOS E ANÁLISES ==========

    initCharts() {
        // Inicializar contêineres de gráficos se existirem
        if (document.getElementById('attendanceTrendChartContainer')) {
            this.renderAttendanceTrendChart();
        }
        if (document.getElementById('classComparisonChartContainer')) {
            this.renderClassComparisonChart();
        }
        if (document.getElementById('genderDistributionChartContainer')) {
            this.renderGenderDistributionChart();
        }
    }

    async loadChartData() {
        try {
            const period = document.getElementById('report-period').value;
            const { startDate, endDate } = this.getDateRangeFromPeriod(period);
            
            // Carregar dados para gráficos
            const [summary, members] = await Promise.all([
                db.getAttendanceSummary(startDate, endDate),
                db.getAllMembers()
            ]);
            
            // Atualizar gráficos com novos dados
            this.updateCharts(summary, members);
            
        } catch (error) {
            console.error('Erro ao carregar dados para gráficos:', error);
        }
    }

    updateCharts(summary, members) {
        // Atualizar gráfico de tendência
        this.updateAttendanceTrendChart(summary);
        
        // Atualizar gráfico de comparação por turma
        this.updateClassComparisonChart(members, summary);
        
        // Atualizar gráfico de distribuição por gênero
        this.updateGenderDistributionChart(members);
    }

    renderAttendanceTrendChart() {
        const ctx = document.getElementById('attendanceTrendChart');
        if (!ctx) return;
        
        window.attendanceTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Presentes',
                        data: [],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Atrasados',
                        data: [],
                        borderColor: '#f39c12',
                        backgroundColor: 'rgba(243, 156, 18, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Taxa de Presença',
                        data: [],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendência de Frequência'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        max: 100,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Taxa (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    updateAttendanceTrendChart(summary) {
        if (!window.attendanceTrendChart) return;
        
        const labels = [];
        const presentData = [];
        const lateData = [];
        const rateData = [];
        
        summary.forEach(day => {
            const [year, month, date] = day.date.split('-');
            labels.push(`${date}/${month}`);
            presentData.push(day.present);
            lateData.push(day.late);
            rateData.push(day.total > 0 ? Math.round(((day.present + day.late) / day.total) * 100) : 0);
        });
        
        window.attendanceTrendChart.data.labels = labels;
        window.attendanceTrendChart.data.datasets[0].data = presentData;
        window.attendanceTrendChart.data.datasets[1].data = lateData;
        window.attendanceTrendChart.data.datasets[2].data = rateData;
        window.attendanceTrendChart.update();
    }

    renderClassComparisonChart() {
        const ctx = document.getElementById('classComparisonChart');
        if (!ctx) return;
        
        window.classComparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Taxa de Presença',
                        data: [],
                        backgroundColor: 'rgba(52, 152, 219, 0.7)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Comparação por Turma'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Taxa (%)'
                        }
                    }
                }
            }
        });
    }

    async updateClassComparisonChart(members, summary) {
        if (!window.classComparisonChart) return;
        
        // Agrupar membros por turma
        const classMap = {};
        members.forEach(member => {
            if (member.class) {
                if (!classMap[member.class]) {
                    classMap[member.class] = {
                        total: 0,
                        present: 0
                    };
                }
                classMap[member.class].total++;
            }
        });
        
        // Calcular presença por turma
        summary.forEach(day => {
            // Esta parte seria implementada com dados mais detalhados
            // Por enquanto, usamos um cálculo simplificado
        });
        
        // Dados de exemplo (substituir com cálculo real)
        const labels = Object.keys(classMap);
        const data = labels.map(() => Math.floor(Math.random() * 30) + 70);
        
        window.classComparisonChart.data.labels = labels;
        window.classComparisonChart.data.datasets[0].data = data;
        window.classComparisonChart.update();
    }

    renderGenderDistributionChart() {
        const ctx = document.getElementById('genderDistributionChart');
        if (!ctx) return;
        
        window.genderDistributionChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Masculino', 'Feminino', 'Não informado'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        '#3498db',
                        '#e84393',
                        '#95a5a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Gênero'
                    }
                }
            }
        });
    }

    updateGenderDistributionChart(members) {
        if (!window.genderDistributionChart) return;
        
        let maleCount = 0;
        let femaleCount = 0;
        let unknownCount = 0;
        
        members.forEach(member => {
            if (member.gender === 'M') maleCount++;
            else if (member.gender === 'F') femaleCount++;
            else unknownCount++;
        });
        
        window.genderDistributionChart.data.datasets[0].data = [maleCount, femaleCount, unknownCount];
        window.genderDistributionChart.update();
    }

    // ========== CONFIGURAÇÃO DE EVENTOS ==========

    setupEventListeners() {
        // Filtros na aba de presença
        const filterClassSelect = document.getElementById('filter-class');
        if (filterClassSelect) {
            filterClassSelect.addEventListener('change', (e) => {
                this.currentFilter.class = e.target.value;
                this.loadAttendanceList();
            });
        }

        const searchMemberInput = document.getElementById('search-member');
        if (searchMemberInput) {
            searchMemberInput.addEventListener('input', 
                utils.debounce((e) => {
                    this.currentFilter.search = e.target.value;
                    this.loadAttendanceList();
                }, 300)
            );
        }
        

        // Botão para marcar todos como presentes
        const markAllPresentBtn = document.getElementById('mark-all-present');
        if (markAllPresentBtn) {
            markAllPresentBtn.addEventListener('click', async () => {
                if (confirm('Marcar TODOS os membros visíveis como presentes?')) {
                    const today = utils.getTodayDateKey();
                    const members = await db.getMembers(this.currentFilter);
                    
                    try {
                        for (const member of members) {
                            await db.markAttendance(member.id, today, 'present', utils.formatTimeShort());
                        }
                        
                        this.loadAttendanceList();
                        utils.showNotification(`Todos os ${members.length} membros marcados como presentes!`, 'success');
                    } catch (error) {
                        utils.showNotification('Erro ao marcar todos como presentes', 'error');
                    }
                }
            });
        }

        // Botão para resetar presença do dia
        const resetAllBtn = document.getElementById('reset-all');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', async () => {
                if (confirm('Isso irá remover TODOS os registros de presença de hoje. Continuar?')) {
                    const today = utils.getTodayDateKey();
                    
                    try {
                        await db.clearAttendance(today);
                        this.loadAttendanceList();
                        utils.showNotification('Presença do dia resetada com sucesso!', 'success');
                    } catch (error) {
                        utils.showNotification('Erro ao resetar presença', 'error');
                    }
                }
            });
        }

        // Adicionar múltiplos membros
        const addMultipleBtn = document.getElementById('add-multiple');
        if (addMultipleBtn) {
            addMultipleBtn.addEventListener('click', () => {
                utils.openModal('multi-member-modal');
            });
        }

        const saveMultiMembersBtn = document.getElementById('save-multi-members');
        if (saveMultiMembersBtn) {
            saveMultiMembersBtn.addEventListener('click', async () => {
                const namesText = document.getElementById('multi-member-names');
                const memberClass = document.getElementById('multi-member-class');
                
                if (!namesText || !memberClass) return;
                
                const namesTextValue = namesText.value;
                const memberClassValue = memberClass.value;
                
                if (!namesTextValue.trim()) {
                    utils.showNotification('Digite pelo menos um nome', 'warning');
                    return;
                }
                
                const names = namesTextValue.split('\n')
                    .map(name => name.trim())
                    .filter(name => name.length > 0);
                
                if (names.length === 0) {
                    utils.showNotification('Nenhum nome válido encontrado', 'warning');
                    return;
                }
                
                try {
                    let successCount = 0;
                    let errorCount = 0;
                    
                    for (const name of names) {
                        try {
                            await db.addMember({
                                name,
                                class: memberClassValue,
                                active: true
                            });
                            successCount++;
                        } catch (error) {
                            console.error(`Erro ao adicionar ${name}:`, error);
                            errorCount++;
                        }
                    }
                    
                    utils.closeModal('multi-member-modal');
                    namesText.value = '';
                    
                    if (successCount > 0) {
                        utils.showNotification(`${successCount} membro(s) adicionado(s) com sucesso!`, 'success');
                        this.loadMembersList();
                    }
                    
                    if (errorCount > 0) {
                        utils.showNotification(`${errorCount} membro(s) não puderam ser adicionados`, 'warning');
                    }
                    
                } catch (error) {
                    utils.showNotification('Erro ao adicionar membros', 'error');
                }
            });
        }

        // ========== EVENTOS PARA MEMBROS ==========
        
        // Delegar eventos para os botões de editar/excluir membros (porque são gerados dinamicamente)
        document.addEventListener('click', async (e) => {
            // Botão Editar Membro
            if (e.target.closest('.edit-member')) {
                const memberId = parseInt(e.target.closest('.edit-member').dataset.id);
                await this.editMember(memberId);
            }
            
            // Botão Remover Membro
            if (e.target.closest('.delete-member')) {
                const memberId = parseInt(e.target.closest('.delete-member').dataset.id);
                await this.deleteMember(memberId);
            }
        });

        // Botão Salvar Membro no formulário
        const saveMemberBtn = document.getElementById('save-member');
        if (saveMemberBtn) {
            saveMemberBtn.addEventListener('click', async () => {
                const memberName = document.getElementById('member-name').value.trim();
                const memberClassSelect = document.getElementById('member-class');
                let memberClass = memberClassSelect.value;
                const customClassInput = document.getElementById('custom-class');
                const memberPhone = document.getElementById('member-phone').value.trim();
                const memberEmail = document.getElementById('member-email').value.trim();
                const memberBirthdate = document.getElementById('member-birthdate').value;
                const memberGender = document.getElementById('member-gender').value;
                const memberActive = document.getElementById('member-active').checked;
                
                // Validação básica
                if (!memberName) {
                    utils.showNotification('Por favor, preencha o nome do membro.', 'warning');
                    return;
                }
                
                // Validação de email
                if (memberEmail && !utils.isValidEmail(memberEmail)) {
                    utils.showNotification('Por favor, insira um email válido.', 'warning');
                    document.getElementById('member-email').focus();
                    return;
                }
                
                // Se turma for "Outra", usar o valor do campo customizado
                if (memberClass === 'Outra' && customClassInput) {
                    memberClass = customClassInput.value.trim();
                }
                
                try {
                    const memberData = {
                        name: memberName,
                        class: memberClass || null,
                        phone: memberPhone || null,
                        email: memberEmail || null,
                        birthdate: memberBirthdate || null,
                        gender: memberGender || null,
                        active: memberActive
                    };
                    
                    if (this.currentlyEditingMember) {
                        // Atualizar membro existente
                        await db.updateMember(this.currentlyEditingMember, memberData);
                        utils.showNotification(`Membro "${memberName}" atualizado com sucesso!`, 'success');
                        
                        // Resetar estado de edição
                        this.currentlyEditingMember = null;
                        saveMemberBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Membro';
                        saveMemberBtn.classList.remove('btn-warning');
                        saveMemberBtn.classList.add('btn-success');
                    } else {
                        // Adicionar novo membro
                        await db.addMember(memberData);
                        utils.showNotification(`Membro "${memberName}" adicionado com sucesso!`, 'success');
                    }
                    
                    // Limpar formulário
                    document.getElementById('member-name').value = '';
                    document.getElementById('member-class').value = '';
                    if (customClassInput) {
                        customClassInput.value = '';
                        document.getElementById('custom-class-container').style.display = 'none';
                    }
                    document.getElementById('member-phone').value = '';
                    document.getElementById('member-email').value = '';
                    document.getElementById('member-birthdate').value = '';
                    document.getElementById('member-gender').value = '';
                    document.getElementById('member-active').checked = true;
                    
                    // Recarregar listas
                    this.loadMembersList();
                    this.loadAttendanceList();
                    
                    // Atualizar gráficos
                    this.loadChartData();
                    
                } catch (error) {
                    console.error('Erro ao salvar membro:', error);
                    utils.showNotification(`Erro: ${error.message}`, 'error');
                }
            });
        }

        // Botão Limpar Formulário
        const clearFormBtn = document.getElementById('clear-form');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => {
                // Limpar formulário
                document.getElementById('member-name').value = '';
                document.getElementById('member-class').value = '';
                const customClassInput = document.getElementById('custom-class');
                if (customClassInput) {
                    customClassInput.value = '';
                    document.getElementById('custom-class-container').style.display = 'none';
                }
                document.getElementById('member-phone').value = '';
                document.getElementById('member-email').value = '';
                document.getElementById('member-birthdate').value = '';
                document.getElementById('member-gender').value = '';
                document.getElementById('member-active').checked = true;
                
                // Resetar botão de salvar se estiver em modo edição
                const saveMemberBtn = document.getElementById('save-member');
                if (this.currentlyEditingMember) {
                    this.currentlyEditingMember = null;
                    saveMemberBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Membro';
                    saveMemberBtn.classList.remove('btn-warning');
                    saveMemberBtn.classList.add('btn-success');
                    utils.showNotification('Formulário limpo. Modo de adição reativado.', 'info');
                }
            });
        }

        // Mostrar/ocultar campo de turma customizada
        const memberClassSelect = document.getElementById('member-class');
        if (memberClassSelect) {
            memberClassSelect.addEventListener('change', () => {
                const customClassContainer = document.getElementById('custom-class-container');
                if (customClassContainer) {
                    customClassContainer.style.display = memberClassSelect.value === 'Outra' ? 'block' : 'none';
                }
            });
        }

        // Periodo do relatório
        const reportPeriodSelect = document.getElementById('report-period');
        if (reportPeriodSelect) {
            reportPeriodSelect.addEventListener('change', () => {
                this.loadReports();
                this.loadChartData();
            });
        }

        // Configurações
        const settingsInputs = document.querySelectorAll('#settings input');
        settingsInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.saveSettings();
            });
        });

        // Botões de gerenciamento de dados
        const backupDataBtn = document.getElementById('backup-data');
        if (backupDataBtn) {
            backupDataBtn.addEventListener('click', async () => {
                try {
                    const data = await db.exportData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-ebd-${utils.getTodayDateKey()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    utils.showNotification('Backup criado com sucesso!', 'success');
                } catch (error) {
                    utils.showNotification('Erro ao criar backup', 'error');
                }
            });
        }

        const restoreDataBtn = document.getElementById('restore-data');
        if (restoreDataBtn) {
            restoreDataBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    if (!confirm('ATENÇÃO: Isso irá substituir todos os dados atuais. Continuar?')) {
                        return;
                    }
                    
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        
                        const success = await db.importData(data);
                        if (success) {
                            utils.showNotification('Dados restaurados com sucesso!', 'success');
                            this.loadMembersList();
                            this.loadAttendanceList();
                            this.loadReports();
                            this.updateDatabaseInfo();
                            this.loadChartData();
                        } else {
                            utils.showNotification('Erro ao restaurar dados', 'error');
                        }
                    } catch (error) {
                        utils.showNotification('Arquivo inválido ou corrompido', 'error');
                    }
                };
                
                input.click();
            });
        }

        const clearDataBtn = document.getElementById('clear-data');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', async () => {
                if (confirm('ATENÇÃO: Isso irá apagar TODOS os dados do sistema. Esta ação não pode ser desfeita. Continuar?')) {
                    try {
                        localStorage.clear();
                        await db.init();
                        
                        utils.showNotification('Todos os dados foram apagados', 'success');
                        this.loadMembersList();
                        this.loadAttendanceList();
                        this.loadReports();
                        this.updateDatabaseInfo();
                        this.loadChartData();
                    } catch (error) {
                        utils.showNotification('Erro ao limpar dados', 'error');
                    }
                }
            });
        }

        // ========== EVENTOS DE EXPORTAÇÃO ==========
    
        // Botão Exportar PDF
        const exportPdfBtn = document.getElementById('export-pdf-btn');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', async () => {
                await this.exportReportToPDF();
            });
        }
        
        // Botão Exportar Excel
        const exportExcelBtn = document.getElementById('export-excel-btn');
        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', async () => {
                await this.exportReportToExcel();
            });
        }
        
        // Botão Exportar Gráfico
        const exportChartBtn = document.getElementById('export-chart-btn');
        if (exportChartBtn) {
            exportChartBtn.addEventListener('click', () => {
                this.exportCurrentChart();
            });
        }
        
        // Botão Exportar Relatório Completo
        const exportReportBtn = document.getElementById('export-report');
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', async () => {
                await this.exportCompleteReport();
            });
        }
        
        // Botão Exportar Lista de Membros
        const exportMembersBtn = document.getElementById('export-members');
        if (exportMembersBtn) {
            exportMembersBtn.addEventListener('click', async () => {
                await this.exportMembersList();
            });
        }
        
        // Botão Gerar Relatório Detalhado
        const generateDetailedReportBtn = document.getElementById('generate-detailed-report');
        if (generateDetailedReportBtn) {
            generateDetailedReportBtn.addEventListener('click', async () => {
                await this.generateDetailedReport();
            });
        }

        // Evento para alteração da data de presença
const attendanceDateInput = document.getElementById('attendance-date');
if (attendanceDateInput) {
    // Definir data atual como padrão se estiver vazia
    if (!attendanceDateInput.value) {
        attendanceDateInput.value = utils.getTodayDateKey();
    }
    
    attendanceDateInput.addEventListener('change', () => {
        console.log('Data alterada para:', attendanceDateInput.value);
        this.updateDateStatus();
        this.loadAttendanceList();
    });
    
    // Atualizar status inicial
    this.updateDateStatus();
}
    }

    async generateDetailedReport() {
        try {
            utils.showNotification('Gerando relatório detalhado...', 'info');
            
            const period = document.getElementById('report-period').value;
            const { startDate, endDate } = this.getDateRangeFromPeriod(period);
            
            // Obter dados detalhados
            const [summary, members, attendanceRecords] = await Promise.all([
                db.getAttendanceSummary(startDate, endDate),
                db.getAllMembers(),
                db.getAttendanceRecords(startDate, endDate)
            ]);
            
            // Criar relatório detalhado
            const detailedReport = {
                periodo: {
                    inicio: startDate,
                    fim: endDate,
                    tipo: period
                },
                resumo: summary,
                membros: members.map(member => {
                    const memberRecords = attendanceRecords.filter(record => record.member_id === member.id);
                    return {
                        id: member.id,
                        nome: member.name,
                        turma: member.class,
                        total_presencas: memberRecords.filter(r => r.status === 'present').length,
                        total_atrasos: memberRecords.filter(r => r.status === 'late').length,
                        total_faltas: memberRecords.filter(r => r.status === 'absent').length,
                        taxa_presenca: memberRecords.length > 0 ? 
                            Math.round(((memberRecords.filter(r => r.status === 'present' || r.status === 'late').length) / memberRecords.length) * 100) : 0
                    };
                }),
                gerado_em: new Date().toISOString()
            };
            
            // Exportar como JSON
            const blob = new Blob([JSON.stringify(detailedReport, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_detalhado_${utils.getTodayDateKey()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            utils.showNotification('Relatório detalhado gerado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao gerar relatório detalhado:', error);
            utils.showNotification(`Erro ao gerar relatório: ${error.message}`, 'error');
        }
    }

    saveSettings() {
        db.settings.classHour = parseInt(document.getElementById('class-time-hour').value) || 9;
        db.settings.classMinute = parseInt(document.getElementById('class-time-minute').value) || 0;
        db.settings.classDuration = parseInt(document.getElementById('class-duration').value) || 60;
        db.settings.toleranceMinutes = parseInt(document.getElementById('tolerance-minutes').value) || 15;
        
        db.saveSettings();
        
        // Atualizar interface
        this.updateToleranceStatus(new Date());
        utils.showNotification('Configurações salvas!', 'success');
    }
}



// Inicializar UI quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.ui = new UI();
});