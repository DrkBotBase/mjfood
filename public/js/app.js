// APP PRINCIPAL - Coordina todos los módulos
class RestaurantApp {
    constructor() {
        this.config = window.restaurantConfig;
        this.cart = [];
        this.isRestaurantOpen = false;
        
        this.init();
    }
    
    init() {
        // Inicializar módulos
        this.menu = new MenuManager(this.config.menu, this.addToCart.bind(this));
        this.cartManager = new CartManager(this.updateCartUI.bind(this));
        this.modals = new ModalManager();
        
        // Renderizar menú
        this.menu.render();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Verificar estado del restaurante
        this.checkRestaurantStatus();
        setInterval(() => this.checkRestaurantStatus(), 60000);
    }
    
    addToCart(item, quantity, observation) {
        const existingItem = this.cart.find(cartItem => 
            cartItem.name === item.name && 
            cartItem.category === item.category && 
            cartItem.observation === observation
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: Date.now(),
                ...item,
                quantity,
                observation
            });
        }
        
        this.updateCartUI();
    }
    
    updateCartUI() {
        this.cartManager.render(this.cart);
        this.checkRestaurantStatus();
    }
    
    checkRestaurantStatus() {
        const now = new Date();
        const currentHour = now.getHours();
        
        this.isRestaurantOpen = currentHour >= this.config.horario.apertura && 
                               currentHour < this.config.horario.cierre;
        
        document.getElementById('checkout-button').disabled = 
            this.cart.length === 0 || !this.isRestaurantOpen;
            
        const statusElement = document.getElementById('status-message');
        if (this.isRestaurantOpen) {
            statusElement.innerHTML = `<p class="text-emerald-400 font-semibold">✅ Abierto hasta las ${this.config.horario.cierre}:00</p>`;
        } else {
            statusElement.innerHTML = `<p class="text-red-400 font-semibold">❌ Cerrado en este momento</p><p class="text-xs text-gray-400">Nuestro horario es de ${this.config.horario.apertura}:00 a ${this.config.horario.cierre}:00.</p>`;
        }
    }
    
    setupEventListeners() {
        document.getElementById('checkout-button').addEventListener('click', () => {
            this.modals.openCheckoutModal();
        });
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RestaurantApp();
});