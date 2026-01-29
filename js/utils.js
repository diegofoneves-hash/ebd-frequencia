// Utilitários gerais

class Utils {
    static formatDate(date = new Date(), format = 'pt-BR') {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }

        if (format === 'pt-BR') {
            return date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'YYYY-MM-DD') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } else if (format === 'DD/MM/YYYY') {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${day}/${month}/${year}`;
        }

        return date.toLocaleDateString();
    }

    static formatTime(date = new Date()) {
        if (!(date instanceof Date)) {
            date = new Date();
        }
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    static formatTimeShort(date = new Date()) {
        if (!(date instanceof Date)) {
            date = new Date();
        }
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static getTodayDateKey() {
        return this.formatDate(new Date(), 'YYYY-MM-DD');
    }

    static getWeekDates() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(this.formatDate(date, 'YYYY-MM-DD'));
        }
        
        return dates;
    }

    static getMonthDates() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const dates = [];
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            dates.push(this.formatDate(new Date(d), 'YYYY-MM-DD'));
        }
        
        return dates;
    }

    static parseCSV(csvText) {
        const lines = csvText.split('\n');
        const result = [];
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const obj = {};
            const currentline = lines[i].split(',');

            for (let j = 0; j < headers.length; j++) {
                obj[headers[j].trim()] = currentline[j] ? currentline[j].trim() : '';
            }

            result.push(obj);
        }

        return result;
    }

    static downloadCSV(filename, csvContent) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    static showNotification(message, type = 'info', duration = 3000) {
        // Remover notificação anterior se existir
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Criar nova notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Remover após o tempo especificado
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    static getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    static validatePhone(phone) {
        const regex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/;
        return regex.test(phone);
    }

    static validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    static formatPhone(phone) {
        // Remove tudo que não é número
        const numbers = phone.replace(/\D/g, '');
        
        if (numbers.length === 11) {
            return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
        } else if (numbers.length === 10) {
            return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
        }
        
        return phone;
    }

    static calculateAge(birthdate) {
        if (!birthdate) return null;
        
        const birthDate = new Date(birthdate);
        const today = new Date();
        
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    static setupModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const closeBtn = modal.querySelector('.close');
        const closeModalBtn = modal.querySelector('.close-modal');

        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal(modalId);
        }

        if (closeModalBtn) {
            closeModalBtn.onclick = () => this.closeModal(modalId);
        }

        // Fechar modal ao clicar fora
        modal.onclick = (event) => {
            if (event.target === modal) {
                this.closeModal(modalId);
            }
        };
    }
}

// Tornar disponível globalmente
window.utils = Utils;