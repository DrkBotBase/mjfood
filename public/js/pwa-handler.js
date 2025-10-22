class PWAHandler {
    constructor() {
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        // Evento para detectar cuándo se puede instalar la PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPromotion();
        });

        // Evento para detectar cuándo la PWA se instaló correctamente
        window.addEventListener('appinstalled', () => {
            console.log('PWA fue instalada');
            this.hideInstallPromotion();
            this.deferredPrompt = null;
            
            // Enviar evento de analytics si está configurado
            if (typeof gtag !== 'undefined') {
                gtag('event', 'install', {
                    'event_category': 'PWA',
                    'event_label': 'App installed'
                });
            }
        });

        // Manejar el estado de la conexión
        this.handleNetworkStatus();

        // Inicializar notificaciones si están permitidas
        this.initNotifications();
    }

    // Mostrar promoción de instalación
    showInstallPromotion() {
        // Crear botón de instalación si no existe
        if (!document.getElementById('pwa-install-button')) {
            const installButton = document.createElement('button');
            installButton.id = 'pwa-install-button';
            installButton.className = 'pwa-install-btn';
            installButton.innerHTML = '📲 Instalar App';
            installButton.addEventListener('click', () => this.installApp());
            
            // Posicionar el botón según el tipo de página
            if (document.querySelector('.floating-action')) {
                document.querySelector('.floating-action').appendChild(installButton);
            } else {
                document.body.appendChild(installButton);
            }
            
            // Estilos para el botón
            this.styleInstallButton();
        }
    }

    // Estilizar el botón de instalación
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

    // Ocultar promoción de instalación
    hideInstallPromotion() {
        const installButton = document.getElementById('pwa-install-button');
        if (installButton) {
            installButton.remove();
        }
    }

    // Instalar la aplicación
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

    // Manejar el estado de la conexión
    handleNetworkStatus() {
        // Actualizar UI según estado de conexión
        const updateOnlineStatus = () => {
            if (!navigator.onLine) {
                this.showOfflineMessage();
            } else {
                this.hideOfflineMessage();
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Estado inicial
        updateOnlineStatus();
    }

    // Mostrar mensaje de desconexión
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

    // Ocultar mensaje de desconexión
    hideOfflineMessage() {
        const offlineMessage = document.getElementById('offline-message');
        if (offlineMessage) {
            offlineMessage.remove();
        }
    }

    // Inicializar notificaciones
    async initNotifications() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('Notificaciones permitidas');
                this.showWelcomeNotification();
            }
        }
    }

    // Mostrar notificación de bienvenida
    showWelcomeNotification() {
        // Solo mostrar si es la primera visita
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

    // Función para compartir la app
    async shareApp() {
        if (navigator.share) {
            try {
              await navigator.share({
                title: document.title,
                text: 'Entra al portal de la mejor comida\n',
                url: window.location.href
              });
                console.log('Contenido compartido exitosamente');
            } catch (error) {
                console.log('Error al compartir:', error);
            }
        } else {
            console.log('Web Share API no es compatible en este navegador');
            this.fallbackShare();
        }
    }

    // Alternativa para navegadores que no soportan Web Share API
    fallbackShare() {
        // Copiar URL al portapapeles
        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                alert('URL copiada al portapapeles. Puedes compartirla manualmente.');
            })
            .catch(err => {
                console.error('Error al copiar URL: ', err);
            });
    }

    // Agregar botón de compartir
    addShareButton() {
      if (navigator.share || navigator.clipboard) {
        const shareButton = document.createElement('button');
        shareButton.id = 'pwa-share-button';
        shareButton.className = 'pwa-share-btn';
          
        // --- CAMBIO AQUÍ: Usamos un icono SVG ---
        shareButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        `;
        
        shareButton.addEventListener('click', () => this.shareApp());
        
        // El resto de la función sigue igual...
        const installButton = document.getElementById('pwa-install-button');
        if (installButton) {
          installButton.insertAdjacentElement('afterend', shareButton);
        } else if (document.querySelector('.floating-action')) {
          document.querySelector('.floating-action').appendChild(shareButton);
        } else {
          document.body.appendChild(shareButton);
        }
        
        this.styleShareButton(); // Llama a la función de estilos que elijas
      }
    }

    // Estilizar el botón de compartir
  styleShareButton() {
    const style = document.createElement('style');
    style.textContent = `
      /* Definimos la animación de entrada */
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
        background: linear-gradient(45deg, #6a11cb 0%, #2575fc 100%); /* Gradiente llamativo */
        color: white;
        border: none;
        border-radius: 50px; /* Forma de píldora */
        font-weight: bold;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        animation: fadeInBottom 0.5s ease-out forwards; /* Aplicamos la animación */
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
      /* Opcional: Añadir texto junto al icono */
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
        /* Ocultamos el texto en móviles para que solo quede el icono */
        .pwa-share-btn::after {
          content: '';
          margin-left: 0;
        }
      }
      `;
      document.head.appendChild(style);
  }
}

// Inicializar el handler cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.pwaHandler = new PWAHandler();
    
    // Agregar botón de compartir después de un breve delay
    setTimeout(() => {
        window.pwaHandler.addShareButton();
    }, 1000);
});

// Funciones auxiliares globales
function checkPWAInstallation() {
    window.pwaHandler.showInstallPromotion();
}

function triggerShare() {
    window.pwaHandler.shareApp();
}