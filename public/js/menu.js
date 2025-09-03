// GESTOR DEL MENÚ - Maneja la visualización del menú
class MenuManager {
    constructor(menuData, addToCartCallback) {
        this.menuData = menuData;
        this.addToCart = addToCartCallback;
    }
    
    render() {
        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer) {
            console.error('No se encontró el contenedor del menú');
            return;
        }
        
        menuContainer.innerHTML = '';
        
        Object.keys(this.menuData).forEach(category => {
            const categoryDiv = this.createCategoryElement(category);
            menuContainer.appendChild(categoryDiv);
        });
    }
    
    createCategoryElement(category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'bg-gray-800 rounded-lg shadow-md overflow-hidden';

        const categoryHeader = this.createCategoryHeader(category);
        const categoryContent = this.createCategoryContent(category);
        
        categoryDiv.appendChild(categoryHeader);
        categoryDiv.appendChild(categoryContent);
        
        // Configurar evento de acordeón
        categoryHeader.addEventListener('click', () => {
            this.toggleCategory(categoryHeader, categoryContent);
        });
        
        return categoryDiv;
    }
    
    createCategoryHeader(category) {
        const header = document.createElement('button');
        header.className = 'w-full text-left p-5 bg-gray-900 text-emerald-400 font-bold text-xl flex justify-between items-center transition-colors hover:bg-gray-700';
        header.innerHTML = `<span>${category}</span><i class="fas fa-chevron-down transition-transform duration-300"></i>`;
        return header;
    }
    
    createCategoryContent(category) {
        const content = document.createElement('div');
        content.className = 'space-y-2 accordion-content';
        
        this.menuData[category].forEach(item => {
            const itemElement = this.createMenuItemElement(category, item);
            content.appendChild(itemElement);
        });
        
        return content;
    }
    
    createMenuItemElement(category, item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center cursor-pointer p-3 rounded-md hover:bg-gray-700';
        itemDiv.innerHTML = `
            <p class="font-semibold flex-grow text-gray-200">${item.name}</p>
            <p class="text-gray-400 mr-4 text-sm">$${item.price?.toLocaleString('es-CO') || '0'}</p>
            <i class="fas fa-plus-circle text-emerald-400 text-2xl"></i>
        `;
        
        itemDiv.addEventListener('click', () => {
            if (window.app && window.app.modals) {
                window.app.modals.openAddItemModal(category, item);
            }
        });
        
        return itemDiv;
    }
    
    toggleCategory(header, content) {
        const icon = header.querySelector('i');
        const isExpanded = content.style.maxHeight;
        
        // Cerrar todos los acordeones primero
        document.querySelectorAll('.accordion-content').forEach(el => {
            el.style.maxHeight = null;
            el.classList.remove('p-5', 'pt-0');
        });
        
        document.querySelectorAll('.fa-chevron-down').forEach(i => {
            i.style.transform = 'rotate(0deg)';
        });
        
        // Abrir este acordeón si estaba cerrado
        if (!isExpanded) {
            content.classList.add('p-5', 'pt-0');
            content.style.maxHeight = content.scrollHeight + "px";
            icon.style.transform = 'rotate(180deg)';
        }
    }
}