class OfflineManager {
    constructor() {
        this.db = null;
        this.initDB();
        this.setupNetworkListener();
    }

    async initDB() {
        this.db = await this.openDatabase();
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EBD_Attendance', 3);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para membros
                if (!db.objectStoreNames.contains('members')) {
                    const store = db.createObjectStore('members', { keyPath: 'id' });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('class', 'class', { unique: false });
                }
                
                // Store para frequência
                if (!db.objectStoreNames.contains('attendance')) {
                    const store = db.createObjectStore('attendance', { keyPath: ['memberId', 'date'] });
                    store.createIndex('date', 'date', { unique: false });
                }
                
                // Store para turmas
                if (!db.objectStoreNames.contains('classes')) {
                    db.createObjectStore('classes', { keyPath: 'id' });
                }
                
                // Store para dados pendentes
                if (!db.objectStoreNames.contains('pending')) {
                    const store = db.createObjectStore('pending', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    setupNetworkListener() {
        window.addEventListener('online', () => {
            this.syncPendingData();
            utils.showNotification('Conexão restaurada. Sincronizando dados...', 'success');
        });
        
        window.addEventListener('offline', () => {
            utils.showNotification('Modo offline ativado. Trabalhando localmente...', 'warning');
        });
        
        // Verificar status inicial
        if (!navigator.onLine) {
            utils.showNotification('Você está offline. Alterações serão salvas localmente.', 'info');
        }
    }

    async saveOffline(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getOffline(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllOffline(storeName, index = null, range = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const target = index ? store.index(index) : store;
            const request = range ? target.getAll(range) : target.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addPendingData(type, data) {
        const pendingItem = {
            type,
            data,
            timestamp: new Date().toISOString(),
            attempts: 0
        };
        
        return this.saveOffline('pending', pendingItem);
    }

    async syncPendingData() {
        if (!navigator.onLine) return;
        
        const pendingItems = await this.getAllOffline('pending');
        
        for (const item of pendingItems) {
            try {
                // Tenta sincronizar cada item pendente
                const result = await this.syncItem(item);
                
                if (result.success) {
                    await this.removePendingData(item.id);
                    console.log(`Item ${item.id} sincronizado com sucesso`);
                } else {
                    item.attempts += 1;
                    await this.saveOffline('pending', item);
                    
                    if (item.attempts > 3) {
                        console.warn(`Item ${item.id} falhou após 3 tentativas`);
                    }
                }
            } catch (error) {
                console.error(`Erro ao sincronizar item ${item.id}:`, error);
            }
        }
    }

    async syncItem(item) {
        switch (item.type) {
            case 'attendance':
                return await db.markAttendance(
                    item.data.memberId,
                    item.data.date,
                    item.data.status,
                    item.data.checkInTime
                );
            case 'member':
                return await db.addMember(item.data);
            // Outros tipos...
            default:
                return { success: false };
        }
    }

    async removePendingData(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pending'], 'readwrite');
            const store = transaction.objectStore('pending');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Verificar se há dados pendentes
    async hasPendingData() {
        const pending = await this.getAllOffline('pending');
        return pending.length > 0;
    }

    // Obter contagem de dados pendentes
    async getPendingCount() {
        const pending = await this.getAllOffline('pending');
        return pending.length;
    }
}

// Substituir chamadas da API para funcionar offline
const originalApiRequest = window.db.request.bind(window.db);

window.db.request = async function(endpoint, options = {}) {
    const offlineManager = window.offlineManager || new OfflineManager();
    
    if (!navigator.onLine) {
        // Verificar se temos os dados offline
        if (endpoint.includes('/members/active')) {
            const members = await offlineManager.getAllOffline('members');
            return members.filter(m => m.active);
        }
        
        // Para outras requisições, salvar offline
        if (options.method === 'POST') {
            const type = this.getRequestType(endpoint);
            const data = JSON.parse(options.body);
            
            // Salvar localmente
            await offlineManager.addPendingData(type, data);
            
            // Retornar simulação de sucesso
            return { 
                id: Date.now(),
                ...data,
                _offline: true 
            };
        }
        
        return [];
    }
    
    try {
        return await originalApiRequest(endpoint, options);
    } catch (error) {
        // Se falhar, tentar offline
        if (options.method === 'POST') {
            const type = this.getRequestType(endpoint);
            const data = JSON.parse(options.body);
            
            await offlineManager.addPendingData(type, data);
            return { 
                id: Date.now(),
                ...data,
                _offline: true 
            };
        }
        
        throw error;
    }
};

// Inicializar quando o app carregar
document.addEventListener('DOMContentLoaded', () => {
    window.offlineManager = new OfflineManager();
    
    // Verificar dados pendentes periodicamente
    setInterval(() => {
        if (navigator.onLine) {
            window.offlineManager.syncPendingData();
        }
    }, 30000); // A cada 30 segundos
});