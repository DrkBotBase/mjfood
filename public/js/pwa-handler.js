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
        if (!document.getElementById('pwa-install-button')) {
            const installButton = document.createElement('button');
            installButton.id = 'pwa-install-button';
            installButton.className = 'pwa-install-btn';
            installButton.innerHTML = '📲 Instalar App';
            installButton.addEventListener('click', () => this.installApp());
            
            if (document.querySelector('.floating-action')) {
                document.querySelector('.floating-action').appendChild(installButton);
            } else {
                document.body.appendChild(installButton);
            }
            this.styleInstallButton();
        }
    }
    styleInstallButton() {
        const style = document.createElement('style');
        style.textContent = `
            .pwa-install-btn {
                position: fixed;
                bottom: 100px;
                right: 20px;
                padding: 12px 20px;
                background: var(--color-primary, #2563EB);
                color: white;
                border: none;
                border-radius: 50px;
                font-weight: bold;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                cursor: pointer;
                z-index: 1000;
                transition: all 0.3s ease;
            }
            
            .pwa-install-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 14px rgba(0, 0, 0, 0.4);
            }
            
            @media (max-width: 768px) {
                .pwa-install-btn {
                    bottom: 70px;
                    right: 15px;
                    padding: 10px 16px;
                    font-size: 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    hideInstallPromotion() {
        const installButton = document.getElementById('pwa-install-button');
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
                background: #ff9800;
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
        
        const installButton = document.getElementById('pwa-install-button');
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