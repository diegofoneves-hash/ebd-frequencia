const API_BASE_URL = 'http://localhost:3215/api';

class ApiService {
  constructor() {
    this.settings = {
      classHour: 9,
      classMinute: 0,
      classDuration: 60,
      toleranceMinutes: 15
    };
  }

  async request(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP ${response.status} em ${endpoint}:`, errorText);
      
      // Tentar parsear como JSON
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`Timeout na requisição para ${endpoint}`);
      throw new Error('Tempo esgotado. Verifique sua conexão com o servidor.');
    }
    
    console.error('API Request Error:', error);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
    
    throw error;
  }
}

  // Membros
  async getMembers(filter = {}) {
  const params = new URLSearchParams();
  
  // Aplicar filtros apenas se tiverem valores
  if (filter.search && filter.search.trim() !== '') {
    params.append('search', filter.search.trim());
  }
  
  if (filter.class && filter.class.trim() !== '') {
    params.append('class', filter.class.trim());
  }
  
  const queryString = params.toString();
  const endpoint = queryString ? `/members/active?${queryString}` : '/members/active';
  
  console.log('Buscando membros com filtros:', filter, 'Endpoint:', endpoint);
  
  try {
    const response = await this.request(endpoint);
    console.log('Membros retornados:', response.length);
    return response;
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    throw error;
  }
}

  async getAllMembers() {
    return await this.request('/members');
  }

  async getMember(id) {
    return await this.request(`/members/${id}`);
  }

  async addMember(memberData) {
    return await this.request('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    });
  }

  async updateMember(id, memberData) {
    return await this.request(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    });
  }

  async deleteMember(id) {
    return await this.request(`/members/${id}`, {
      method: 'DELETE',
    });
  }

  // Turmas
  async getClasses() {
    return await this.request('/classes');
  }

  async getActiveClasses() {
    return await this.request('/classes/active');
  }

  async getClass(id) {
    return await this.request(`/classes/${id}`);
  }

  async addClass(classData) {
    return await this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  }

  async updateClass(id, classData) {
    return await this.request(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(classData),
    });
  }

  async deleteClass(id) {
    return await this.request(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  // Frequência
  async markAttendance(memberId, date, status, checkInTime = null) {
    return await this.request('/attendance', {
      method: 'POST',
      body: JSON.stringify({ memberId, date, status, checkInTime }),
    });
  }

  async getDailyAttendance(date) {
    return await this.request(`/attendance/daily/${date}`);
  }

  async getAttendanceSummary(startDate, endDate) {
    return await this.request(`/attendance/summary/${startDate}/${endDate}`);
  }

  async clearAttendance(date) {
    return await this.request(`/attendance/${date}`, {
      method: 'DELETE',
    });
  }

  // Configurações
  async getSettings() {
    try {
      const settings = await this.request('/settings');
      if (settings.classHour) this.settings.classHour = parseInt(settings.classHour);
      if (settings.classMinute) this.settings.classMinute = parseInt(settings.classMinute);
      if (settings.classDuration) this.settings.classDuration = parseInt(settings.classDuration);
      if (settings.toleranceMinutes) this.settings.toleranceMinutes = parseInt(settings.toleranceMinutes);
      return settings;
    } catch (error) {
      console.warn('Não foi possível carregar configurações, usando padrões');
      return this.settings;
    }
  }

  async saveSettings(settings) {
    const promises = Object.entries(settings).map(([key, value]) =>
      this.request('/settings', {
        method: 'POST',
        body: JSON.stringify({ key, value: String(value) }),
      })
    );
    await Promise.all(promises);
    this.settings = { ...this.settings, ...settings };
  }

  async getDatabaseInfo() {
    // Implemente conforme necessário para seu backend
    return {
      membersCount: 0,
      activeMembersCount: 0,
      attendanceCount: 0,
      lastAttendanceDate: 'Nenhum',
      dbSize: 0,
    };
  }

  // Backup/Export (adaptar para backend)
  async exportData() {
    const [members, attendance] = await Promise.all([
      this.getAllMembers(),
      this.getAttendanceSummary('1900-01-01', '2100-12-31'),
    ]);
    
    return {
      members,
      attendance,
      settings: this.settings,
      exportDate: new Date().toISOString(),
      version: '2.0.0',
    };
  }

  async importData(data) {
    console.log('Importação via API não implementada');
    return false;
  }
}

// Substituir a instância global do banco de dados
window.db = new ApiService();

// Função de inicialização compatível
db.init = async function() {
  try {
    await this.getSettings();
    console.log('API conectada com sucesso');
  } catch (error) {
    console.error('Erro ao conectar à API:', error);
    throw error;
  }
};