class AnimationManager {
    constructor() {
        this.loadingCount = 0;
    }

    showLoading(message = 'Carregando...') {
        this.loadingCount++;
        
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = this.createLoadingOverlay();
        }
        
        const messageEl = overlay.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        overlay.classList.add('active');
    }

    hideLoading() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        
        if (this.loadingCount === 0) {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
        }
    }

    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner" style="width: 40px; height: 40px; margin-bottom: 15px;"></div>
                <p class="loading-message">Carregando...</p>
            </div>
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger reflow
        toast.offsetHeight;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    createSkeleton(count, type = 'card') {
        const container = document.createElement('div');
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = `skeleton skeleton-${type}`;
            
            if (type === 'card') {
                skeleton.style.height = '120px';
                skeleton.style.marginBottom = '15px';
                skeleton.style.borderRadius = '8px';
            } else if (type === 'text') {
                skeleton.style.height = '16px';
                skeleton.style.marginBottom = '8px';
                skeleton.style.width = i % 2 === 0 ? '80%' : '60%';
            }
            
            container.appendChild(skeleton);
        }
        
        return container;
    }

    // Animação de confirmação
    animateConfirmation(element) {
        element.classList.add('animate__animated', 'animate__tada');
        setTimeout(() => {
            element.classList.remove('animate__animated', 'animate__tada');
        }, 1000);
    }

    // Progress bar animada
    animateProgress(progressBar, targetWidth, duration = 1000) {
        const progressFill = progressBar.querySelector('.progress-fill');
        if (!progressFill) return;
        
        progressFill.style.transition = `width ${duration}ms ease`;
        progressFill.style.width = `${targetWidth}%`;
        
        setTimeout(() => {
            progressFill.style.transition = '';
        }, duration);
    }

    // Efeito de digitação
    typewriter(element, text, speed = 50) {
        let i = 0;
        element.textContent = '';
        
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.animations = new AnimationManager();
    
    // Adicionar animações a elementos específicos
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar todos os cards
    document.querySelectorAll('.member-card, .summary-card').forEach(card => {
        observer.observe(card);
    });
});