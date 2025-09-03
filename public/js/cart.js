// GESTOR DEL CARRITO - Maneja las operaciones del carrito
class CartManager {
    constructor(updateCallback) {
        this.updateCallback = updateCallback;
    }
    
    render(cart) {
        const cartItemsContainer = document.getElementById('cart-items');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        
        cartItemsContainer.innerHTML = '';
        
        if (cart.length === 0) {
            cartItemsContainer.appendChild(emptyCartMessage);
            emptyCartMessage.style.display = 'block';
        } else {
            emptyCartMessage.style.display = 'none';
            cart.forEach(item => {
                const cartItemElement = this.createCartItemElement(item);
                cartItemsContainer.appendChild(cartItemElement);
            });
        }
        
        this.updateTotal(cart);
        this.updateCallback();
    }
    
    createCartItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-start';
        itemDiv.innerHTML = `
            <div>
                <p class="font-semibold">${item.quantity}x ${item.category} - ${item.name}</p>
                ${item.observation ? `<p class="text-sm text-gray-400 italic">"${item.observation}"</p>` : ''}
            </div>
            <div class="text-right flex-shrink-0 ml-4">
                <p class="font-semibold">$${(item.price * item.quantity).toLocaleString('es-CO')}</p>
                <button class="remove-from-cart-btn text-red-500 text-sm hover:text-red-400" data-id="${item.id}">Quitar</button>
            </div>
        `;
        
        // Evento para eliminar item
        itemDiv.querySelector('.remove-from-cart-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeFromCart(item.id);
        });
        
        return itemDiv;
    }
    
    removeFromCart(itemId) {
        window.app.cart = window.app.cart.filter(item => item.id !== itemId);
        this.render(window.app.cart);
    }
    
    updateTotal(cart) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cart-total').textContent = `Total: $${total.toLocaleString('es-CO')}`;
    }
}