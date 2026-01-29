class ThemeManager {
    constructor() {
        // Verificar preferência salva, do sistema ou usar light como padrão
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            this.theme = savedTheme;
        } else if (systemPrefersDark) {
            this.theme = 'dark';
        } else {
            this.theme = 'light';
        }
        
        this.init();
    }

    init() {
        this.applyTheme(this.theme);
        this.setupListeners();
        this.setupSystemPreferenceListener();
    }

    applyTheme(theme) {
        // Remover tema anterior
        document.documentElement.removeAttribute('data-theme');
        
        // Aplicar novo tema com delay para evitar transição brusca
        setTimeout(() => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            this.theme = theme;
            
            // Atualizar o toggle switch
            const toggle = document.getElementById('theme-switch');
            if (toggle) {
                toggle.checked = theme === 'dark';
            }
            
            // Atualizar meta tag theme-color para PWA
            this.updateThemeColorMeta(theme);
            
            // Disparar evento personalizado para que outros componentes saibam que o tema mudou
            window.dispatchEvent(new CustomEvent('themeChange', { detail: theme }));
            
            // Atualizar gráficos se existirem
            this.updateChartsTheme(theme);
        }, 10);
    }

    toggleTheme() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Feedback tátil (opcional)
        this.addToggleAnimation();
    }

    setupListeners() {
        const toggle = document.getElementById('theme-switch');
        if (toggle) {
            toggle.addEventListener('change', () => {
                this.toggleTheme();
            });
        }
        
        // Atalho de teclado (Alt+T) para alternar tema
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    setupSystemPreferenceListener() {
        // Ouvir mudanças na preferência do sistema
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Função para lidar com mudanças
        const handleSystemThemeChange = (e) => {
            // Só muda se não houver preferência salva manualmente
            if (!localStorage.getItem('theme')) {
                const newTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(newTheme);
            }
        };
        
        // Adicionar listener
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else {
            // Suporte para navegadores mais antigos
            mediaQuery.addListener(handleSystemThemeChange);
        }
    }

    updateChartsTheme(theme) {
        // Atualizar cores dos gráficos conforme o tema
        if (window.chartsManager && window.chartsManager.charts) {
            Object.values(window.chartsManager.charts).forEach(chart => {
                if (chart && chart.options) {
                    try {
                        // Configurar cores baseadas no tema
                        const textColor = theme === 'dark' ? '#e2e8f0' : '#2d3748';
                        const gridColor = theme === 'dark' ? '#2d3748' : '#e2e8f0';
                        const bgColor = theme === 'dark' ? 'rgba(26, 35, 50, 0.5)' : 'rgba(255, 255, 255, 0.8)';
                        
                        // Atualizar cores do gráfico
                        if (chart.options.scales) {
                            // Para gráficos com eixos
                            if (chart.options.scales.x && chart.options.scales.x.ticks) {
                                chart.options.scales.x.ticks.color = textColor;
                            }
                            if (chart.options.scales.x && chart.options.scales.x.grid) {
                                chart.options.scales.x.grid.color = gridColor;
                            }
                            if (chart.options.scales.y && chart.options.scales.y.ticks) {
                                chart.options.scales.y.ticks.color = textColor;
                            }
                            if (chart.options.scales.y && chart.options.scales.y.grid) {
                                chart.options.scales.y.grid.color = gridColor;
                            }
                        }
                        
                        // Para gráficos de pizza/doughnut
                        if (chart.options.plugins && chart.options.plugins.legend) {
                            chart.options.plugins.legend.labels.color = textColor;
                        }
                        
                        chart.update();
                    } catch (error) {
                        console.warn('Erro ao atualizar tema do gráfico:', error);
                    }
                }
            });
        }
        
        // Atualizar também gráficos criados com Chart.js diretamente
        if (window.Chart && window.Chart.instances) {
            Object.values(window.Chart.instances).forEach(chart => {
                if (chart && chart.options) {
                    try {
                        const textColor = theme === 'dark' ? '#e2e8f0' : '#2d3748';
                        const gridColor = theme === 'dark' ? '#2d3748' : '#e2e8f0';
                        
                        // Atualizar cores básicas
                        if (chart.options.scales) {
                            Object.keys(chart.options.scales).forEach(scaleKey => {
                                if (chart.options.scales[scaleKey].ticks) {
                                    chart.options.scales[scaleKey].ticks.color = textColor;
                                }
                                if (chart.options.scales[scaleKey].grid) {
                                    chart.options.scales[scaleKey].grid.color = gridColor;
                                }
                            });
                        }
                        
                        chart.update();
                    } catch (error) {
                        console.warn('Erro ao atualizar tema do Chart.js:', error);
                    }
                }
            });
        }
    }

    updateThemeColorMeta(theme) {
        // Atualizar meta tag theme-color para PWA
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        if (theme === 'dark') {
            themeColorMeta.content = '#121a2a'; // Cor do tema escuro
        } else {
            themeColorMeta.content = '#3498db'; // Cor do tema claro (azul do header)
        }
    }

    addToggleAnimation() {
        // Adicionar efeito de animação ao alternar
        const slider = document.querySelector('.theme-slider');
        if (slider) {
            slider.style.transform = 'scale(0.95)';
            setTimeout(() => {
                slider.style.transform = 'scale(1)';
            }, 150);
        }
    }

    // Métodos utilitários
    isDarkTheme() {
        return this.theme === 'dark';
    }

    getCurrentTheme() {
        return this.theme;
    }

    // Obter cor baseada no tema (para uso em JavaScript)
    getColor(colorName) {
        const colors = {
            light: {
                primary: '#2c3e50',
                secondary: '#3498db',
                success: '#27ae60',
                warning: '#f39c12',
                danger: '#e74c3c',
                bg: '#f5f7fa',
                text: '#2d3748',
                textSecondary: '#718096',
                card: '#ffffff',
                border: '#e2e8f0'
            },
            dark: {
                primary: '#63b3ed',
                secondary: '#4299e1',
                success: '#48bb78',
                warning: '#f6ad55',
                danger: '#fc8181',
                bg: '#121a2a',
                text: '#e2e8f0',
                textSecondary: '#a0aec0',
                card: '#1a2332',
                border: '#2d3748'
            }
        };
        
        return colors[this.theme][colorName] || colors.light[colorName];
    }

    // Aplicar tema específico (útil para testes)
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.applyTheme(theme);
        }
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
    
    // Adicionar classe para transições suaves após carregamento
    setTimeout(() => {
        document.body.classList.add('theme-transitions');
    }, 100);
});

// Suporte para PWA (Progressive Web App)
if ('serviceWorker' in navigator) {
    window.addEventListener('themeChange', (e) => {
        // Notificar service worker sobre mudança de tema (se necessário)
        navigator.serviceWorker.controller?.postMessage({
            type: 'THEME_CHANGE',
            theme: e.detail
        });
    });
}

// Exportar para uso em módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
