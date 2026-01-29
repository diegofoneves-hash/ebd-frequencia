document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se a API está configurada
    if (!window.db || typeof window.db.addMember !== 'function') {
        console.error('API Service não está carregado corretamente!');
        alert('Erro: O serviço de API não foi carregado. Verifique o console.');
        return;
    }

    const app = new App();
    await app.init();
    
    window.app = app;

    // Adicionar event listener depois que a UI estiver carregada
    setTimeout(() => {
        const membersList = document.getElementById('members-list');
        if (membersList) {
            membersList.addEventListener('click', function(e) {
                // Botão Editar
                if (e.target.closest('.edit-member')) {
                    const memberId = e.target.closest('.edit-member').dataset.id;
                    if (window.app && window.app.ui) {
                        window.app.ui.editMember(memberId);
                    }
                }
                
                // Botão Remover
                if (e.target.closest('.delete-member')) {
                    const memberId = e.target.closest('.delete-member').dataset.id;
                    if (window.app && window.app.ui) {
                        window.app.ui.deleteMember(memberId);
                    }
                }
            });
        } else {
            console.warn('Elemento members-list não encontrado no DOM');
        }
    }, 1000); // Aguardar 1 segundo para garantir carregamento
});

// Aplicação principal
class App {
    constructor() {
        this.ui = null;
        this.isEditing = false;
        this.editingMemberId = null; 
    }

    async init() {
    console.log('Inicializando aplicação...');
    
    // Carregar gerenciador de temas
    if (!window.themeManager) {
        window.themeManager = new ThemeManager();
        console.log('ThemeManager inicializado');
    }
    
    // Carregar animações
    if (!window.animations) {
        window.animations = new AnimationManager();
        console.log('AnimationManager inicializado');
    }
    
    // Carregar gráficos
    if (!window.chartsManager) {
        window.chartsManager = new ChartsManager();
        console.log('ChartsManager inicializado');
    }

    // Carregar exportação
    if (!window.exportManager) {
        window.exportManager = new ExportManager();
        console.log('ExportManager inicializado');
    }
    
    // Inicializar offline
    if (!window.offlineManager) {
        window.offlineManager = new OfflineManager();
        console.log('OfflineManager inicializado');
    }

    this.showLoading();
    
    try {
        console.log('Testando conexão com a API...');
        const isApiConnected = await this.checkApiConnection();
        
        if (!isApiConnected) {
            console.warn('API não está disponível');
            utils.showNotification('API não disponível. Trabalhando em modo offline.', 'warning');
        }
        
        // Inicializar API
        try {
            await db.getSettings();
            console.log('API conectada com sucesso');
        } catch (error) {
            console.warn('Não foi possível conectar à API, usando configurações padrão');
        }
        
        // Inicializar interface
        console.log('Inicializando UI...');
        this.ui = new UI();
        await this.ui.init();
        console.log('UI inicializada');
        
        // Configurar formulário de adicionar membro
        this.setupMemberForm();
        console.log('Formulário de membro configurado');
        
        // Configurar eventos globais
        this.setupGlobalEvents();
        console.log('Eventos globais configurados');
        
        // Carregar dados iniciais
        await this.loadInitialData();
        console.log('Dados iniciais carregados');

        this.hideLoading();
        console.log('Aplicação inicializada com sucesso!');
        
        // Mostrar notificação de sucesso
        setTimeout(() => {
            utils.showNotification('Sistema carregado com sucesso!', 'success');
        }, 500);
        
    } catch (error) {
        console.error('Erro ao inicializar aplicação:', error);
        this.showError(`Erro ao inicializar o sistema: ${error.message}`);
    }
}

    async checkApiConnection() {
        try {
            const response = await fetch('http://localhost:3215/health');
            return response.ok;
        } catch (error) {
            console.error('API não está disponível:', error);
            return false;
        }
    }

    showLoading() {
        console.log('Inicializando sistema...');
    }

    hideLoading() {
        console.log('Sistema inicializado!');
    }

    showError(message) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #e74c3c;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; margin-bottom: 20px;"></i>
                <h2>Erro ao carregar o sistema</h2>
                <p>${message}</p>
                <div style="margin-top: 20px;">
                    <button onclick="location.reload()" class="btn btn-primary">
                        <i class="fas fa-redo"></i> Recarregar Página
                    </button>
                    <button onclick="app.checkBackendStatus()" class="btn btn-outline" style="margin-left: 10px;">
                        <i class="fas fa-server"></i> Verificar Backend
                    </button>
                </div>
                <p style="margin-top: 20px; font-size: 0.9em; color: #95a5a6;">
                    Certifique-se que o servidor backend está rodando na porta 3215
                </p>
            </div>
        `;
    }

    checkBackendStatus() {
        alert('Verifique se:\n1. O PostgreSQL está rodando\n2. O servidor Node.js está rodando (npm start)\n3. Acesse: http://localhost:3215/health');
    }

    setupMemberForm() {
        // Remover event listeners antigos para evitar duplicação
        const saveButton = document.getElementById('save-member');
        const clearButton = document.getElementById('clear-form');
        const memberClassSelect = document.getElementById('member-class');
        const phoneInput = document.getElementById('member-phone');
        
        // Clonar elementos para remover listeners
        const newSaveButton = saveButton.cloneNode(true);
        const newClearButton = clearButton.cloneNode(true);
        saveButton.parentNode.replaceChild(newSaveButton, saveButton);
        clearButton.parentNode.replaceChild(newClearButton, clearButton);
        
        // Mostrar/ocultar campo de turma personalizada
        if (memberClassSelect) {
            memberClassSelect.addEventListener('change', function() {
                const customClassContainer = document.getElementById('custom-class-container');
                if (customClassContainer) {
                    customClassContainer.style.display = this.value === 'Outra' ? 'block' : 'none';
                }
            });
        }
        
        // Formatar telefone enquanto digita
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length > 11) value = value.substring(0, 11);
                
                if (value.length > 0) {
                    if (value.length <= 2) {
                        value = `(${value}`;
                    } else if (value.length <= 7) {
                        value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
                    } else if (value.length <= 11) {
                        value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
                    }
                }
                
                e.target.value = value;
            });
        }
        
        // Salvar membro - com prevenção de clique duplo
        let isSaving = false;
        newSaveButton.addEventListener('click', async () => {
            if (isSaving) {
                console.log('Já está salvando, aguarde...');
                return;
            }
            
            isSaving = true;
            newSaveButton.disabled = true;
            newSaveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
            
            try {
                await this.saveMember();
            } finally {
                setTimeout(() => {
                    isSaving = false;
                    newSaveButton.disabled = false;
                    newSaveButton.innerHTML = '<i class="fas fa-save"></i> Salvar Membro';
                }, 1000);
            }
        });
        
        // Limpar formulário
        newClearButton.addEventListener('click', () => {
            this.clearMemberForm();
        });
    }

    async saveMember() {
        // Verificar se está em modo de edição
        const saveButton = document.getElementById('save-member');
        if (saveButton.dataset.editingId) {
            console.log('Está em modo de edição, atualizando...');
            await this.updateMember(saveButton.dataset.editingId);
            return;
        }
        
        const nameInput = document.getElementById('member-name');
        const classSelect = document.getElementById('member-class');
        const customClassInput = document.getElementById('custom-class');
        const phoneInput = document.getElementById('member-phone');
        const emailInput = document.getElementById('member-email');
        const birthdateInput = document.getElementById('member-birthdate');
        const activeInput = document.getElementById('member-active');
        
        const name = nameInput.value.trim();
        let memberClass = classSelect.value;
        const phone = phoneInput.value.trim();
        const email = emailInput.value.trim();
        const birthdate = birthdateInput.value;
        const active = activeInput.checked;
        
        // Validações
        if (!name) {
            utils.showNotification('Por favor, informe o nome do membro.', 'warning');
            nameInput.focus();
            return;
        }
        
        if (memberClass === 'Outra') {
            memberClass = customClassInput.value.trim();
            if (!memberClass) {
                utils.showNotification('Por favor, informe o nome da turma.', 'warning');
                customClassInput.focus();
                return;
            }
        }
        
        if (email && !utils.validateEmail(email)) {
            utils.showNotification('Por favor, informe um email válido.', 'warning');
            emailInput.focus();
            return;
        }
        
        try {
            // Criar objeto do membro
            const memberData = {
                name,
                class: memberClass || '',
                phone: phone || '',
                email: email || '',
                birthdate: birthdate || null,
                active
            };
            
            console.log('Salvando novo membro com dados:', memberData);
            
            // Salvar no banco de dados (criar novo)
            const savedMember = await db.addMember(memberData);
            
            console.log('Membro salvo com sucesso:', savedMember);
            
            // Feedback e limpeza
            utils.showNotification(`Membro "${name}" adicionado com sucesso!`, 'success');
            this.clearMemberForm();
            
            // Recarregar listas se necessário
            if (this.ui) {
                await this.ui.loadMembersList();
                await this.ui.loadAttendanceList();
            }
            
            // Mudar para aba de presença
            const attendanceTab = document.querySelector('.tab[data-tab="attendance"]');
            if (attendanceTab) {
                attendanceTab.click();
            }
            
        } catch (error) {
            console.error('Erro ao salvar membro:', error);
            
            if (error.message && (error.message.includes('already exists') || error.message.includes('duplicate'))) {
                utils.showNotification('Este membro já está cadastrado no sistema.', 'error');
            } else {
                utils.showNotification('Erro ao salvar membro. Por favor, tente novamente.', 'error');
            }
        }
    }

    clearMemberForm() {
        const nameInput = document.getElementById('member-name');
        const classSelect = document.getElementById('member-class');
        const customClassInput = document.getElementById('custom-class');
        const phoneInput = document.getElementById('member-phone');
        const emailInput = document.getElementById('member-email');
        const birthdateInput = document.getElementById('member-birthdate');
        const activeInput = document.getElementById('member-active');
        
        if (nameInput) nameInput.value = '';
        if (classSelect) classSelect.value = '';
        if (customClassInput) {
            customClassInput.value = '';
            customClassInput.style.display = 'none';
        }
        if (phoneInput) phoneInput.value = '';
        if (emailInput) emailInput.value = '';
        if (birthdateInput) birthdateInput.value = '';
        if (activeInput) activeInput.checked = true;
        
        // Remover modo edição se existir
        const saveButton = document.getElementById('save-member');
        if (saveButton.dataset.editingId) {
            delete saveButton.dataset.editingId;
            saveButton.innerHTML = '<i class="fas fa-save"></i> Salvar Membro';
        }
    }

    async updateMember(memberId) {
        // Implementar atualização de membro
        console.log('Atualizando membro:', memberId);
        // TODO: Implementar lógica de atualização
    }

    setupGlobalEvents() {
        // Configurar eventos globais se necessário
    }

    async loadInitialData() {
        // Carregar dados iniciais se necessário
    }
}