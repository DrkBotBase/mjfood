class PWAHandler {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPromotion();
        });
        window.addEventListener('appinstalled', () => {
            this.hideInstallPromotion();
            this.deferredPrompt = null;
          
            if (typeof gtag !== 'undefined') {
                gtag('event', 'install', {
                    'event_category': 'PWA',
                    'event_label': 'App installed'
                });
            }
        });
        this.handleNetworkStatus();
        this.initNotifications();
    }
    showInstallPromotion() {
    // 1. Verificamos que no exista ya el banner
    if (!document.getElementById('pwa-install-banner')) {
        
        // 2. Crear el contenedor principal
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-banner';
        
        // 3. Definir el contenido HTML interno (Icono + Texto + Botones)
        banner.innerHTML = `
            <div class="pwa-content">
                <div class="pwa-icon">📱</div>
                <div class="pwa-info">
                    <h3>Instalar App</h3>
                    <p>Agrega nuestra app a tu inicio para una experiencia más rápida y fluida.</p>
                </div>
            </div>
            <div class="pwa-actions">
                <button id="pwa-close-btn" class="btn-text">Ahora no</button>
                <button id="pwa-accept-btn" class="btn-primary">Instalar</button>
            </div>
        `;

        // 4. Agregar al body
        document.body.appendChild(banner);

        // 5. Agregar los eventos (Listeners)
        
        // Botón de Instalar
        const installBtn = banner.querySelector('#pwa-accept-btn');
        installBtn.addEventListener('click', () => {
            this.installApp();
            banner.remove(); // Opcional: cerrar banner tras instalar
        });

        // Botón de Cerrar (Solo elimina el elemento del DOM actual)
        const closeBtn = banner.querySelector('#pwa-close-btn');
        closeBtn.addEventListener('click', () => {
            // Animación de salida antes de remover
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(20px)';
            setTimeout(() => banner.remove(), 300);
        });

        // 6. Inyectar estilos
        this.styleInstallBanner();
    }
}

styleInstallBanner() {
    const style = document.createElement('style');
    style.textContent = `
        /* Contenedor del Banner */
        .pwa-banner {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 400px;
            background: #ffffff; /* Fondo blanco limpio */
            padding: 16px;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15); /* Sombra suave y moderna */
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 15px;
            font-family: system-ui, -apple-system, sans-serif;
            animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Parte superior: Icono y Texto */
        .pwa-content {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .pwa-icon {
            font-size: 24px;
            background: #F3F4F6;
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
        }

        .pwa-info h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #111827;
            font-weight: 700;
        }

        .pwa-info p {
            margin: 0;
            font-size: 13px;
            color: #6B7280;
            line-height: 1.4;
        }

        /* Botones */
        .pwa-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .pwa-actions button {
            cursor: pointer;
            border: none;
            padding: 10px 18px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s;
        }

        /* Estilo Botón "Ahora no" */
        .btn-text {
            background: transparent;
            color: #6B7280;
        }
        .btn-text:hover {
            background: #F3F4F6;
            color: #374151;
        }

        /* Estilo Botón "Instalar" */
        .btn-primary {
            background: var(--primary-color, #2563EB); /* Usa tu variable de color */
            color: white;
        }
        .btn-primary:hover {
            filter: brightness(110%);
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        /* Animación de entrada */
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translate(-50%, 50px);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }

        /* Ajustes para Móviles */
        @media (max-width: 480px) {
            .pwa-banner {
                width: 100%;
                bottom: 0;
                left: 0;
                transform: none; /* Quitamos el centrado */
                border-radius: 16px 16px 0 0; /* Solo bordes superiores redondos */
                animation: slideUpMobile 0.4s ease-out;
            }
            
            @keyframes slideUpMobile {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
        }
    `;
    document.head.appendChild(style);
}

    hideInstallPromotion() {
        const installButton = document.getElementById('pwa-install-banner');
        if (installButton) {
            installButton.remove();
        }
    }
    async installApp() {
        if (!this.deferredPrompt) {
            return;
        }
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('Usuario aceptó instalar la PWA');
        } else {
            console.log('Usuario rechazó instalar la PWA');
        }
        
        this.deferredPrompt = null;
        this.hideInstallPromotion();
    }

    handleNetworkStatus() {
        const updateOnlineStatus = () => {
            if (!navigator.onLine) {
                this.showOfflineMessage();
            } else {
                this.hideOfflineMessage();
            }
        };
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }
    showOfflineMessage() {
        if (!document.getElementById('offline-message')) {
            const offlineMessage = document.createElement('div');
            offlineMessage.id = 'offline-message';
            offlineMessage.innerHTML = '⚠️ Estás trabajando sin conexión';
            offlineMessage.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #f93f3f;
                color: white;
                text-align: center;
                padding: 10px;
                z-index: 2000;
                font-weight: bold;
            `;
            document.body.appendChild(offlineMessage);
        }
    }
    hideOfflineMessage() {
        const offlineMessage = document.getElementById('offline-message');
        if (offlineMessage) {
            offlineMessage.remove();
        }
    }
    async initNotifications() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.showWelcomeNotification();
            }
        }
    }
    showWelcomeNotification() {
        if (!localStorage.getItem('welcomeNotificationShown')) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('¡Bienvenido!', {
                        body: 'Ahora puedes recibir actualizaciones de nuestros menús',
                        icon: '/assets/icon.png',
                        badge: '/assets/icon.png',
                        vibrate: [200, 100, 200],
                        tag: 'welcome-notification'
                    });
                    
                    localStorage.setItem('welcomeNotificationShown', 'true');
                });
            }
        }
    }
    async shareApp() {
        if (navigator.share) {
            try {
              await navigator.share({
                title: document.title,
                text: 'Entra al portal de la mejor comida\n',
                url: window.location.href
              });
            } catch (error) {
              console.log('Error al compartir:', error);
            }
        } else {
            console.log('Web Share API no es compatible en este navegador');
            this.fallbackShare();
        }
    }
    fallbackShare() {
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                alert('URL copiada al portapapeles. Puedes compartirla manualmente.');
            })
            .catch(err => {
                console.error('Error al copiar URL: ', err);
            });
    }
    addShareButton() {
      if (navigator.share || navigator.clipboard) {
        const shareButton = document.createElement('button');
        shareButton.id = 'pwa-share-button';
        shareButton.className = 'pwa-share-btn';
        shareButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        `;
        
        shareButton.addEventListener('click', () => this.shareApp());
        
        const installButton = document.getElementById('pwa-install-banner');
        if (installButton) {
          installButton.insertAdjacentElement('afterend', shareButton);
        } else if (document.querySelector('.floating-action')) {
          document.querySelector('.floating-action').appendChild(shareButton);
        } else {
          document.body.appendChild(shareButton);
        }
        
        this.styleShareButton();
      }
    }

  styleShareButton() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInBottom {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .pwa-share-btn {
        position: fixed;
        bottom: 25px;
        right: 25px;
        padding: 15px;
        background: linear-gradient(45deg, #6a11cb 0%, #2575fc 100%);
        color: white;
        border: none;
        border-radius: 50px;
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        animation: fadeInBottom 0.5s ease-out forwards;
      }
      .pwa-share-btn:hover {
        transform: scale(1.05) translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        filter: brightness(1.1);
      }
      .pwa-share-btn:active {
        transform: scale(0.98);
      }
      .pwa-share-btn svg {
        width: 22px;
        height: 22px;
      }
      .pwa-share-btn::after {
        content: 'Compartir';
        margin-left: 8px;
        font-size: 16px;
      }
      @media (max-width: 768px) {
        .pwa-share-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          padding: 0;
        }
        .pwa-share-btn::after {
          content: '';
          margin-left: 0;
        }
      }
      `;
      document.head.appendChild(style);
  }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pwaHandler = new PWAHandler();
    
    setTimeout(() => {
        window.pwaHandler.addShareButton();
    }, 1000);
});

function checkPWAInstallation() {
    window.pwaHandler.showInstallPromotion();
}
function triggerShare() {
    window.pwaHandler.shareApp();
}