// Product Management System - Fixed Sales Logic
class ProductManager {
    constructor() {
        this.products = [];
        this.currentEditId = null;
        this.init();
    }

    // Initialize the product manager
    init() {
        this.setupEventListeners();
        this.renderProducts();
        console.log('Product Manager initialized - Memory only, no persistence');
    }

    // Setup all event listeners
    setupEventListeners() {
        // Add product button
        const addBtn = document.getElementById('addProductBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openModal());
        }

        // Form submission
        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Image upload handling
        this.setupImageUpload();

        // Modal close buttons
        const closeBtn = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Delete modal buttons
        const closeDeleteBtn = document.getElementById('closeDeleteModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        // Search functionality
        const searchInput = document.getElementById('searchProducts');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchProducts(e.target.value));
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.filterByCategory(e.target.value));
        }

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.id === 'productModal') this.closeModal();
            if (e.target.id === 'deleteModal') this.closeDeleteModal();
        });
    }

    // Setup modern image upload with drag and drop
    setupImageUpload() {
        const uploadArea = document.getElementById('imageUploadArea');
        const fileInput = document.getElementById('productImage');

        if (!uploadArea || !fileInput) return;

        // Click to upload
        uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('.preview-overlay')) {
                fileInput.click();
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleImageUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });
    }

    // Generate new ID
    generateId() {
        return this.products.length > 0 ? Math.max(...this.products.map(p => p.id)) + 1 : 1;
    }

    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            'rescue-gear': 'shield-outline',
            'medical-supplies': 'medical-outline'
        };
        return icons[category] || 'cube-outline';
    }

    // Get stock status
    getStockStatus(stock) {
        if (stock === 0) return { class: 'out-of-stock', text: 'Out of Stock' };
        if (stock < 10) return { class: 'low-stock', text: 'Low Stock' };
        return { class: 'in-stock', text: 'In Stock' };
    }

    // Format price
    formatPrice(price) {
        return `₱ ${price.toLocaleString()}`;
    }

    // Render products
    renderProducts(productsToShow = this.products) {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (productsToShow.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <ion-icon name="cube-outline"></ion-icon>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or add a new product</p>
                </div>
            `;
        } else {
            grid.innerHTML = productsToShow.map(product => this.createProductCard(product)).join('');
        }

        this.updateCounts(productsToShow.length);
    }

    // Create product card HTML
    createProductCard(product) {
        const stockStatus = this.getStockStatus(product.stock);
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.name}" />` : 
                        `<ion-icon name="${this.getCategoryIcon(product.category)}"></ion-icon>`
                    }
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-category">${this.formatCategoryName(product.category)}</p>
                    <p class="product-price">${this.formatPrice(product.price)}</p>
                    <div class="product-stock">
                        <span class="stock-status ${stockStatus.class}">${stockStatus.text}</span>
                        <span class="stock-quantity">${product.stock} units</span>
                    </div>
                    ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
                    <div class="product-actions">
                        <button class="btn-small btn-edit" onclick="productManager.editProduct(${product.id})">
                            <ion-icon name="create-outline"></ion-icon>
                        </button>
                        <button class="btn-small btn-delete" onclick="productManager.deleteProduct(${product.id})">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Format category name
    formatCategoryName(category) {
        const names = {
            'rescue-gear': 'Rescue Gear',
            'medical-supplies': 'Medical Supplies'
        };
        return names[category] || category;
    }

    // Update counts
    updateCounts(displayCount = this.products.length) {
        const countElement = document.getElementById('productsCount');
        if (countElement) {
            countElement.textContent = displayCount;
        }

        // Update dashboard stats
        this.updateDashboard();
    }

    // FIXED: Update dashboard statistics - INVENTORY VALUE, NOT SALES
    updateDashboard() {
        // Calculate total inventory value (price × stock)
        const totalInventoryValue = this.products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        
        // Update ONLY the product count, NOT sales
        const productsElement = document.getElementById('dashboard-products');
        if (productsElement) {
            productsElement.textContent = this.products.length;
        }

        // Do NOT touch the sales element - it should only be updated by actual sales transactions
        // Sales should only be updated when customers complete purchases in the order system
        
        console.log(`📊 Dashboard updated: ${this.products.length} products, ₱${totalInventoryValue.toLocaleString()} inventory value`);
        console.log('💡 Note: Sales are only updated when customers make actual purchases');
    }

    // Open modal
    openModal(product = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('modalTitle');
        
        if (!modal || !title) return;

        if (product) {
            // Edit mode
            title.textContent = 'Edit Product';
            this.currentEditId = product.id;
            this.populateForm(product);
        } else {
            // Add mode
            title.textContent = 'Add Product';
            this.currentEditId = null;
            this.clearForm();
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            this.currentEditId = null;
            this.clearForm();
        }
    }

    // Populate form with product data
    populateForm(product) {
        document.getElementById('productName').value = product.name || '';
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productPrice').value = product.price || '';
        document.getElementById('productStock').value = product.stock || '';
        document.getElementById('productDescription').value = product.description || '';
        
        // Handle image preview for editing
        if (product.image) {
            this.showImagePreview(product.image);
        } else {
            this.resetImageUpload();
        }
    }

    // Clear form
    clearForm() {
        const form = document.getElementById('productForm');
        if (form) form.reset();
        
        this.resetImageUpload();
    }

    // Reset image upload area
    resetImageUpload() {
        const uploadArea = document.getElementById('imageUploadArea');
        const imagePreview = document.getElementById('imagePreview');
        
        if (uploadArea) {
            uploadArea.classList.remove('has-image', 'error', 'uploading');
            
            // Show the upload placeholder again
            const placeholder = uploadArea.querySelector('.upload-placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        }
        
        if (imagePreview) {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }
    }

    // Handle modern image upload
    handleImageUpload(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showImageError('Please select a valid image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            this.showImageError('Image size must be less than 5MB');
            return;
        }

        this.showImageLoading();

        const reader = new FileReader();
        reader.onload = (e) => {
            this.showImagePreview(e.target.result);
        };
        reader.onerror = () => {
            this.showImageError('Error reading image file');
        };
        reader.readAsDataURL(file);
    }

    // Show image loading state
    showImageLoading() {
        const uploadArea = document.getElementById('imageUploadArea');
        const imagePreview = document.getElementById('imagePreview');
        
        if (uploadArea) {
            uploadArea.classList.add('uploading');
            uploadArea.classList.remove('error');
        }
        
        if (imagePreview) {
            imagePreview.style.display = 'flex';
            imagePreview.innerHTML = `
                <div class="upload-loading">
                    <ion-icon name="refresh-outline"></ion-icon>
                    <span>Processing image...</span>
                </div>
            `;
        }
    }

    // Show image preview
    showImagePreview(imageSrc) {
        const uploadArea = document.getElementById('imageUploadArea');
        const imagePreview = document.getElementById('imagePreview');
        
        if (uploadArea) {
            uploadArea.classList.add('has-image');
            uploadArea.classList.remove('uploading', 'error');
            
            // Hide the upload placeholder
            const placeholder = uploadArea.querySelector('.upload-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
        
        if (imagePreview) {
            imagePreview.style.display = 'block';
            imagePreview.innerHTML = `
                <img src="${imageSrc}" alt="Product preview" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" />
                <div class="preview-overlay">
                    <button type="button" class="remove-image-btn" onclick="productManager.removeImage()">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                    <button type="button" class="change-image-btn" onclick="document.getElementById('productImage').click()">
                        <ion-icon name="camera-outline"></ion-icon>
                    </button>
                </div>
            `;
        }
    }

    // Show image error
    showImageError(message) {
        const uploadArea = document.getElementById('imageUploadArea');
        const imagePreview = document.getElementById('imagePreview');
        
        if (uploadArea) {
            uploadArea.classList.add('error');
            uploadArea.classList.remove('uploading', 'has-image');
        }
        
        if (imagePreview) {
            imagePreview.style.display = 'flex';
            imagePreview.innerHTML = `
                <div class="upload-error">
                    <ion-icon name="alert-circle-outline"></ion-icon>
                    <p>${message}</p>
                </div>
            `;
        }

        this.showNotification(message, 'error');
        
        // Reset after 3 seconds
        setTimeout(() => {
            this.resetImageUpload();
        }, 3000);
    }

    // Remove image
    removeImage() {
        const fileInput = document.getElementById('productImage');
        if (fileInput) {
            fileInput.value = '';
        }
        this.resetImageUpload();
        this.showNotification('Image removed successfully!');
    }

    // Handle form submission
    handleSubmit(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('productName').value.trim(),
            category: document.getElementById('productCategory').value,
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            stock: parseInt(document.getElementById('productStock').value) || 0,
            description: document.getElementById('productDescription').value.trim()
        };

        // Validation
        if (!formData.name || !formData.category) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Handle image upload
        const imageFile = document.getElementById('productImage').files[0];
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                formData.image = e.target.result;
                this.saveProduct(formData);
            };
            reader.readAsDataURL(imageFile);
        } else {
            // Keep existing image if editing and no new image selected
            if (this.currentEditId) {
                const existingProduct = this.products.find(p => p.id === this.currentEditId);
                if (existingProduct && existingProduct.image) {
                    formData.image = existingProduct.image;
                }
            }
            this.saveProduct(formData);
        }
    }

    // Save product (memory only)
    saveProduct(formData) {
        if (this.currentEditId) {
            // Update existing product
            const index = this.products.findIndex(p => p.id === this.currentEditId);
            if (index !== -1) {
                this.products[index] = { ...this.products[index], ...formData };
                this.showNotification('Product updated successfully!');
            }
        } else {
            // Add new product
            const newProduct = {
                id: this.generateId(),
                ...formData
            };
            this.products.push(newProduct);
            this.showNotification('Product added successfully!');
        }

        // Trigger sync events (no localStorage)
        this.triggerSyncEvents();
        this.renderProducts();
        this.closeModal();
    }

    // Trigger sync events for cross-component communication
    triggerSyncEvents() {
        // Trigger custom event for order catalog sync
        document.dispatchEvent(new CustomEvent('productsUpdated', {
            detail: { products: this.products }
        }));
        
        console.log('Product sync event triggered');
    }

    // Edit product
    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.openModal(product);
        }
    }

    // Delete product
    deleteProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        const deleteModal = document.getElementById('deleteModal');
        const productNameElement = document.getElementById('deleteProductName');
        
        if (deleteModal && productNameElement) {
            productNameElement.textContent = product.name;
            deleteModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.currentEditId = id;
        }
    }

    // Close delete modal
    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            this.currentEditId = null;
        }
    }

    // Confirm delete
    confirmDelete() {
        if (this.currentEditId) {
            this.products = this.products.filter(p => p.id !== this.currentEditId);
            this.triggerSyncEvents();
            this.renderProducts();
            this.showNotification('Product deleted successfully!');
            this.closeDeleteModal();
        }
    }

    // Search products
    searchProducts(query) {
        if (!query.trim()) {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
        );
        
        this.renderProducts(filtered);
    }

    // Filter by category
    filterByCategory(category) {
        if (!category) {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(product => product.category === category);
        this.renderProducts(filtered);
    }

    // Show notification
    showNotification(message, type = 'success') {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <ion-icon name="${type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}"></ion-icon>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => notification.remove(), 3000);
    }
}

// Navigation System
class Navigation {
    constructor() {
        this.init();
    }

    init() {
        const navItems = document.querySelectorAll('.nav-item[data-page]');
        const pages = document.querySelectorAll('.page');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetPage = item.getAttribute('data-page');
                
                // Update navigation
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update pages
                pages.forEach(page => page.classList.remove('active'));
                const targetPageElement = document.getElementById(targetPage + '-page');
                if (targetPageElement) {
                    targetPageElement.classList.add('active');
                }

                // Update dashboard when switching to it
                if (targetPage === 'dashboard' && window.productManager) {
                    window.productManager.updateDashboard();
                }
            });
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation
    new Navigation();
    
    // Initialize product manager and make it globally available
    window.productManager = new ProductManager();
    
    console.log('Product Management System initialized - No localStorage, memory only!');
});