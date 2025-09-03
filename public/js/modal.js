// GESTOR DE MODALES - Maneja los modales de la aplicación
class ModalManager {
    constructor() {
        this.currentItem = null;
        this.applyThemeColors();
        this.initModals();
    }
    
    initModals() {
        // Modal de añadir item
        this.addItemModal = document.getElementById('add-item-modal');
        this.modalContent = this.addItemModal.querySelector('.modal-content');
        this.modalItemName = document.getElementById('modal-item-name');
        this.modalItemPrice = document.getElementById('modal-item-price');
        this.quantityInput = document.getElementById('item-quantity');
        this.observationInput = document.getElementById('item-observation');
        
        // Botones del modal de añadir
        document.getElementById('confirm-add-item').addEventListener('click', () => this.confirmAddItem());
        document.getElementById('cancel-add-item').addEventListener('click', () => this.closeAddItemModal());
        document.getElementById('decrease-quantity').addEventListener('click', () => this.changeQuantity(-1));
        document.getElementById('increase-quantity').addEventListener('click', () => this.changeQuantity(1));
        
        // Modal de checkout
        this.checkoutModal = document.getElementById('checkout-modal');
        this.customerForm = document.getElementById('customer-form');
        
        // Botones del modal de checkout
        document.getElementById('cancel-button').addEventListener('click', () => this.closeCheckoutModal());
        this.customerForm.addEventListener('submit', (e) => this.handleCheckoutSubmit(e));
        
        // Mostrar detalles de pago en efectivo
        document.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('cash-payment-details').classList.toggle('hidden', e.target.value !== 'efectivo');
            });
        });
        
        // Cargar datos de usuario si existen
        this.loadUserData();
    }
    
    applyThemeColors() {
        if (!window.app?.config?.colores) return;
        
        const colors = window.app.config.colores;
        const root = document.documentElement;
        
        root.style.setProperty('--color-primary', colors.primario);
        root.style.setProperty('--color-secondary', colors.secundario);
        root.style.setProperty('--color-background', colors.fondo);
        root.style.setProperty('--color-text', colors.texto);
        
        // Aplicar fuente si está definida
        if (window.app.config.fuente) {
            document.body.classList.add(window.app.config.fuente);
        }
    }
    
    openAddItemModal(category, item) {
        this.currentItem = { ...item, category };
        this.modalItemName.textContent = `${category} - ${item.name}`;
        this.modalItemPrice.textContent = `$${item.price.toLocaleString('es-CO')}`;
        this.quantityInput.value = 1;
        this.observationInput.value = '';
        
        this.addItemModal.classList.remove('hidden');
        setTimeout(() => this.modalContent.classList.remove('scale-95'), 10);
    }
    
    closeAddItemModal() {
        this.modalContent.classList.add('scale-95');
        setTimeout(() => {
            this.addItemModal.classList.add('hidden');
            this.currentItem = null;
        }, 250);
    }
    
    changeQuantity(amount) {
        const newValue = parseInt(this.quantityInput.value) + amount;
        if (newValue >= 1) {
            this.quantityInput.value = newValue;
        }
    }
    
    confirmAddItem() {
        const quantity = parseInt(this.quantityInput.value);
        const observation = this.observationInput.value.trim();
        
        window.app.addToCart(this.currentItem, quantity, observation);
        this.closeAddItemModal();
    }
    
    openCheckoutModal() {
        this.checkoutModal.classList.remove('hidden');
    }
    
    closeCheckoutModal() {
        this.checkoutModal.classList.add('hidden');
    }
    
    handleCheckoutSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(this.customerForm);
      const customerData = {
          name: document.getElementById('name').value || 'Cliente',
          address: document.getElementById('address').value,
          phone: document.getElementById('phone').value,
          paymentMethod: formData.get('payment'),
          cashAmount: document.getElementById('cash-amount').value
      };
      
      // Guardar datos de usuario
      this.saveUserData(customerData);
      
      // Formatear mensaje para WhatsApp
      const message = this.formatOrderForWhatsApp(customerData);
      
      // ✅ Usar el teléfono del restaurante desde la configuración
      const restaurantPhoneNumber = window.app.config.restauranteConfig.telefonoWhatsApp;
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${restaurantPhoneNumber}&text=${encodeURIComponent(message)}`;
      
      // Abrir WhatsApp
      window.open(whatsappUrl, '_blank');
      
      // Limpiar carrito y cerrar modal
      window.app.cart = [];
      window.app.updateCartUI();
      this.closeCheckoutModal();
      this.customerForm.reset();
      document.getElementById('cash-payment-details').classList.add('hidden');
  }
    
    // Método para formatear el mensaje de WhatsApp
    formatOrderForWhatsApp(customerData) {
        const { cart, config } = window.app;
        const restaurantName = config.name;
        const now = new Date();
        const orderDate = now.toLocaleDateString('es-ES');
        const orderTime = now.toLocaleTimeString('es-ES');
        
        let message = `¡Hola! 👋\n`;
        message += `*NUEVO PEDIDO - ${restaurantName.toUpperCase()}*\n`;
        message += `📅 Fecha: ${orderDate} ⏰ Hora: ${orderTime}\n\n`;
        
        message += `*👤 DATOS DEL CLIENTE:*\n`;
        message += `Nombre: ${customerData.name}\n`;
        message += `Teléfono: ${customerData.phone}\n`;
        message += `Dirección: ${customerData.address}\n`;
        message += `Método de pago: ${customerData.paymentMethod === 'efectivo' ? 'Efectivo 💵' : 'Electrónico 💳'}\n`;
        
        if (customerData.paymentMethod === 'efectivo' && customerData.cashAmount) {
            message += `Paga con: $${parseInt(customerData.cashAmount).toLocaleString('es-CO')}\n`;
        }
        message += `\n`;
        
        message += `*🛒 PEDIDO:*\n`;
        let total = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            message += `${index + 1}. ${item.quantity}x ${item.name} - $${item.price.toLocaleString('es-CO')} c/u\n`;
            message += `   ${item.category} | Total: $${itemTotal.toLocaleString('es-CO')}\n`;
            
            if (item.observation) {
                message += `   📝 Observación: "${item.observation}"\n`;
            }
            message += `\n`;
        });
        
        message += `*💰 TOTAL: $${total.toLocaleString('es-CO')}*\n\n`;
        message += `¡Por favor confirmar recepción del pedido! ✅`;
        
        return message;
    }
    
    saveUserData(customer) {
        localStorage.setItem('customerName', customer.name);
        localStorage.setItem('customerAddress', customer.address);
        localStorage.setItem('customerPhone', customer.phone);
    }
    
    loadUserData() {
        document.getElementById('name').value = localStorage.getItem('customerName') || '';
        document.getElementById('address').value = localStorage.getItem('customerAddress') || '';
        document.getElementById('phone').value = localStorage.getItem('customerPhone') || '';
    }
}