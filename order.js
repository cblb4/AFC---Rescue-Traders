// Order Management System - Complete Fixed Version
class OrderManager {
    // Store proof images for viewing (in memory)
    constructor() {
        this.cart = [];
        this.products = [];
        this.currentOrderNumber = 1;
        this.categories = [
            { id: 'rescue-gear', name: 'Rescue Gear', icon: 'shield-outline' },
            { id: 'medical-supplies', name: 'Medical Supplies', icon: 'medical-outline' }
        ];
        this.activeCategory = 'rescue-gear';
        
        this.taxRate = 0.12;
        this.manualDiscount = 0;
        this.cashReceived = 0;
        
        // GCash payment data
        this.gcashProofOfPayment = null;
        this.gcashCustomerName = '';
        this.gcashNumber = '';
        this.gcashProofFile = null;
        
        // Store proof images by transaction ID
        this.proofImages = new Map();
        
        this.init();
    }

async init() {
    await this.loadProducts();
    await this.loadNextOrderNumber(); 
    this.setupEventListeners();
    this.setInitialCategory();
    this.renderCategories();
    this.renderProducts();
    this.updateOrderDetails();
    this.syncWithProductManager();
}


    // NEW: Set initial category to one that has products
    setInitialCategory() {
        // Count products per category
        const categoryCounts = {};
        this.categories.forEach(cat => {
            categoryCounts[cat.id] = this.products.filter(p => p.category === cat.id).length;
        });

        // Find the first category with products
        const categoryWithProducts = this.categories.find(cat => categoryCounts[cat.id] > 0);
        
        if (categoryWithProducts) {
            this.activeCategory = categoryWithProducts.id;
            console.log(`🎯 Set initial category to "${categoryWithProducts.name}" (${categoryCounts[categoryWithProducts.id]} products)`);
        } else {
            // Keep default if no products found
            console.log('📝 No products found, keeping default category');
        }
    }

async loadProducts() {
    try {
        const response = await fetch('api/products.php');
        const result = await response.json();
        
        if (response.ok) {
            // Store previous stock levels for comparison
            const previousProducts = new Map(this.products.map(p => [p.id, p.stock]));
            
            this.products = result.products.map(product => ({
                id: product.id,
                name: product.name,
                category: product.category,
                price: parseFloat(product.price),
                stock: parseInt(product.stock),
                image: product.image || null
            }));
            
            // Check for stock changes
            this.products.forEach(product => {
                const previousStock = previousProducts.get(product.id);
                if (previousStock !== undefined && previousStock !== product.stock) {
                    console.log(`📦 Stock changed: ${product.name} | ${previousStock} → ${product.stock}`);
                    
                    if (product.stock === 0) {
                        console.log(`🚨 ${product.name} is now OUT OF STOCK`);
                    } else if (product.stock <= 5 && previousStock > 5) {
                        console.log(`⚠️ ${product.name} is now LOW STOCK`);
                    }
                }
            });
            
            console.log(`📦 Loaded ${this.products.length} products for order catalog`);
        } else {
            console.error('Failed to load products:', result.error);
            this.products = [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
        this.products = [];
    }
}
    syncWithProductManager() {
        // Listen for product updates
        document.addEventListener('productsUpdated', (event) => {
            console.log('🔄 Products updated, syncing with order catalog...');
            this.loadProducts();
            this.setInitialCategory(); // Update category selection
            this.renderCategories();
            this.renderProducts();
        });
        
        // Initial sync when both managers are ready
        const tryInitialSync = () => {
            if (window.productManager && window.productManager.products) {
                console.log('🔄 Initial product sync...');
                this.loadProducts();
                this.setInitialCategory(); // Update category selection
                this.renderCategories();
                this.renderProducts();
                return true;
            }
            return false;
        };
        
        // Try immediate sync
        if (!tryInitialSync()) {
            // If not ready, try again after a short delay
            setTimeout(() => {
                if (!tryInitialSync()) {
                    console.log('⚠️ ProductManager still not ready after delay');
                }
            }, 100);
        }
        
        // Periodic sync check (fallback)
        setInterval(() => {
            if (window.productManager) {
                const currentProductCount = this.products.length;
                const actualProductCount = window.productManager.products.length;
                
                if (currentProductCount !== actualProductCount) {
                    console.log(`🔄 Product count mismatch: ${currentProductCount} vs ${actualProductCount}, syncing...`);
                    this.loadProducts();
                    this.setInitialCategory(); // Update category selection
                    this.renderCategories();
                    this.renderProducts();
                }
            }
        }, 2000);
    }

    setupEventListeners() {
        const continueBtn = document.getElementById('continueToPayment');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.openPaymentModal());
        }

        const discountInput = document.getElementById('orderDiscountInput');
        if (discountInput) {
            discountInput.addEventListener('input', () => this.handleDiscountChange());
            discountInput.addEventListener('focus', (e) => this.handleInputFocus(e));
            discountInput.addEventListener('blur', (e) => this.handleInputBlur(e));
        }

        const cashInput = document.getElementById('orderCashInput');
        if (cashInput) {
            cashInput.addEventListener('input', () => this.handleCashChange());
            cashInput.addEventListener('focus', (e) => this.handleInputFocus(e));
            cashInput.addEventListener('blur', (e) => this.handleInputBlur(e));
        }

        const clearCalculatorBtn = document.getElementById('clearCalculatorBtn');
        if (clearCalculatorBtn) {
            clearCalculatorBtn.addEventListener('click', () => this.clearCalculator());
        }

        document.addEventListener('click', (e) => {
            if (e.target.id === 'paymentModal') {
                this.closePaymentModal();
            }
            if (e.target.id === 'successModal') {
                this.closeSuccessModal();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.payment-method')) {
                this.selectPaymentMethod(e.target.closest('.payment-method'));
            }
        });

        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processPayment();
            });
        }

        const confirmBtn = document.getElementById('confirmPayment');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => {
                if (!confirmBtn.disabled && e.target === confirmBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.processPayment();
                }
            });
        }

        const cancelPaymentBtn = document.getElementById('cancelPayment');
        if (cancelPaymentBtn) {
            cancelPaymentBtn.addEventListener('click', () => this.closePaymentModal());
        }

        const successOkBtn = document.getElementById('successOkBtn');
        if (successOkBtn) {
            successOkBtn.addEventListener('click', () => this.closeSuccessModal());
        }

        const exportBtn = document.getElementById('exportToExcel');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToExcel());
        }
    }

    renderCategories() {
        const container = document.getElementById('categoryTabs');
        if (!container) return;

        console.log(`🏷️ Rendering categories with ${this.products.length} total products`);
        
        // Debug: Log all products and their categories
        this.products.forEach(product => {
            console.log(`📦 Product: "${product.name}" | Category: "${product.category}" | Stock: ${product.stock}`);
        });

        container.innerHTML = this.categories.map(category => {
            const itemCount = this.products.filter(p => p.category === category.id).length;
            console.log(`🏷️ Category "${category.name}" (${category.id}): ${itemCount} items`);
            
            return `
                <div class="category-tab ${category.id === this.activeCategory ? 'active' : ''}" 
                     onclick="orderManager.switchCategory('${category.id}')">
                    <ion-icon name="${category.icon}" class="category-icon"></ion-icon>
                    <span>${category.name}</span>
                    <span class="item-count">${itemCount} items</span>
                </div>
            `;
        }).join('');
    }

    switchCategory(categoryId) {
        this.activeCategory = categoryId;
        this.renderCategories();
        this.renderProducts();
    }

    renderProducts() {
        const container = document.getElementById('itemsGrid');
        if (!container) return;

        const categoryProducts = this.products.filter(p => p.category === this.activeCategory);
        
        if (categoryProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #9ca3af;">
                    <ion-icon name="cube-outline" style="font-size: 48px; margin-bottom: 1rem;"></ion-icon>
                    <h3 style="color: #6b7280; margin-bottom: 0.5rem;">No items found</h3>
                    <p>No products available in this category</p>
                </div>
            `;
        } else {
            container.innerHTML = categoryProducts.map(product => {
                // Get actual stock from product manager if available
                let actualStock = product.stock || 0;
                if (window.productManager) {
                    const actualProduct = window.productManager.products.find(p => p.id === product.id);
                    if (actualProduct) {
                        actualStock = actualProduct.stock;
                    }
                }

                // Determine stock status
                const isOutOfStock = actualStock <= 0;
                const isLowStock = actualStock <= 5 && actualStock > 0;
                
                // Set up card classes and click handler
                let cardClass = 'item-card';
                let clickHandler = `orderManager.addToCart(${product.id})`;
                
                if (isOutOfStock) {
                    cardClass = 'item-card out-of-stock';
                    clickHandler = 'void(0)'; // Disable click
                }

                // Create stock badge
                let stockBadgeClass = '';
                let stockBadgeText = '';
                
                if (isOutOfStock) {
                    stockBadgeClass = 'stock-badge out-of-stock';
                    stockBadgeText = 'Out of Stock';
                } else if (isLowStock) {
                    stockBadgeClass = 'stock-badge low-stock';
                    stockBadgeText = `Low Stock (${actualStock})`;
                } else {
                    stockBadgeClass = 'stock-badge in-stock';
                    stockBadgeText = `In Stock (${actualStock})`;
                }

                // Create sold out overlay if needed
                const soldOutOverlay = isOutOfStock ? '<div class="sold-out-overlay">SOLD OUT</div>' : '';

                return `
                    <div class="${cardClass}" onclick="${clickHandler}">
                        <div class="item-image">
                            ${product.image ? 
                                `<img src="${product.image}" alt="${product.name}" />` : 
                                `<ion-icon name="cube-outline"></ion-icon>`
                            }
                            ${soldOutOverlay}
                        </div>
                        <div class="item-info">
                            <div class="item-name">${product.name}</div>
                            <div class="item-price">₱ ${product.price.toLocaleString()}</div>
                            <div class="${stockBadgeClass}">${stockBadgeText}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Check if product is available in product manager for stock verification
        let actualProduct = product;
        if (window.productManager) {
            actualProduct = window.productManager.products.find(p => p.id === productId) || product;
        }

        // Check current stock availability
        const existingItem = this.cart.find(item => item.id === productId);
        const currentCartQuantity = existingItem ? existingItem.quantity : 0;
        const availableStock = actualProduct.stock || 0;

        // Prevent adding if no stock available
        if (availableStock <= 0) {
            this.showNotification(`${product.name} is out of stock!`, 'error');
            return;
        }

        // Prevent adding if would exceed available stock
        if (currentCartQuantity >= availableStock) {
            this.showNotification(`Cannot add more ${product.name}. Only ${availableStock} in stock.`, 'error');
            return;
        }

        // Add to cart or increase quantity
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                ...product,
                quantity: 1
            });
        }

        this.updateOrderDetails();
        
        // Show stock warning if getting low
        const newCartQuantity = currentCartQuantity + 1;
        const remainingStock = availableStock - newCartQuantity;
        
        if (remainingStock <= 0) {
            this.showNotification(`${product.name} added! (Last one in stock)`, 'success');
        } else if (remainingStock <= 3) {
            this.showNotification(`${product.name} added! (${remainingStock} left in stock)`, 'success');
        } else {
            this.showNotification(`${product.name} added to order!`);
        }
    }

    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        const item = this.cart.find(item => item.id === productId);
        if (!item) return;

        // Check stock availability
        let availableStock = item.stock || 0;
        if (window.productManager) {
            const actualProduct = window.productManager.products.find(p => p.id === productId);
            if (actualProduct) {
                availableStock = actualProduct.stock;
            }
        }

        // Prevent exceeding available stock
        if (newQuantity > availableStock) {
            this.showNotification(`Cannot set quantity to ${newQuantity}. Only ${availableStock} in stock.`, 'error');
            
            // Set to maximum available stock instead
            item.quantity = availableStock;
            
            // Update the input field to reflect the corrected quantity
            const qtyInput = document.querySelector(`input[onchange*="${productId}"]`);
            if (qtyInput) {
                qtyInput.value = availableStock;
            }
        } else {
            item.quantity = newQuantity;
        }

        this.updateOrderDetails();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateOrderDetails();
    }

updateOrderDetails() {
    this.updateOrderItems();
    this.updateOrderSummary();
    this.updateContinueButton();
    
    // Update order number display
    const orderNumberElement = document.querySelector('.order-number');
    if (orderNumberElement) {
        orderNumberElement.textContent = `Orders #${this.currentOrderNumber}`;
    }
}

    updateOrderItems() {
        const container = document.getElementById('orderItems');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-order">
                    <ion-icon name="bag-outline"></ion-icon>
                    <h3>Your order is empty</h3>
                    <p>Add items to get started</p>
                </div>
            `;
        } else {
            container.innerHTML = this.cart.map(item => `
                <div class="order-item">
                    <div class="order-item-image">
                        ${item.image ? 
                            `<img src="${item.image}" alt="${item.name}" />` : 
                            `<ion-icon name="cube-outline"></ion-icon>`
                        }
                    </div>
                    <div class="order-item-info">
                        <div class="order-item-name">${item.name}</div>
                        <div class="order-item-price">₱ ${item.price.toLocaleString()}</div>
                    </div>
                    <div class="order-item-controls">
                        <div class="qty-control">
                            <button class="qty-btn" onclick="orderManager.updateQuantity(${item.id}, ${item.quantity - 1})">
                                <ion-icon name="remove-outline"></ion-icon>
                            </button>
                            <input type="number" class="qty-input" value="${item.quantity}" 
                                   onchange="orderManager.updateQuantity(${item.id}, parseInt(this.value) || 0)" min="1">
                            <button class="qty-btn" onclick="orderManager.updateQuantity(${item.id}, ${item.quantity + 1})">
                                <ion-icon name="add-outline"></ion-icon>
                            </button>
                        </div>
                        <button class="remove-btn" onclick="orderManager.removeFromCart(${item.id})">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    handleInputFocus(e) {
        const input = e.target;
        if (input.value === '0' || input.value === '') {
            input.value = '';
        }
        input.style.textAlign = 'left';
    }

    handleInputBlur(e) {
        const input = e.target;
        if (!input.value || input.value === '') {
            input.value = '';
        } else {
            const value = parseFloat(input.value) || 0;
            if (value > 0) {
                input.value = value.toFixed(2);
            }
        }
        input.style.textAlign = 'right';
    }

    handleDiscountChange() {
        const discountInput = document.getElementById('orderDiscountInput');
        this.manualDiscount = parseFloat(discountInput.value) || 0;
        this.updateOrderSummary();
    }

    handleCashChange() {
        const cashInput = document.getElementById('orderCashInput');
        this.cashReceived = parseFloat(cashInput.value) || 0;
        this.calculateChange();
        this.updateContinueButton();
    }

    clearCalculator() {
        const discountInput = document.getElementById('orderDiscountInput');
        const cashInput = document.getElementById('orderCashInput');
        
        if (discountInput) {
            discountInput.value = '';
            this.manualDiscount = 0;
        }
        
        if (cashInput) {
            cashInput.value = '';
            this.cashReceived = 0;
        }
        
        this.updateOrderSummary();
        this.showNotification('Calculator cleared!');
    }

calculateChange() {
    const total = this.getCalculatedTotal();
    const change = this.cashReceived - total;
    
    const changeInput = document.getElementById('orderChangeInput');
    if (changeInput) {
        if (this.cashReceived > 0) {
            changeInput.value = Math.abs(change).toFixed(2);
            
            if (change < 0) {
                changeInput.classList.add('negative');
                changeInput.style.color = '#dc2626';
                changeInput.style.fontWeight = 'bold';
                changeInput.placeholder = `Need ₱${Math.abs(change).toFixed(2)} more`;
            } else {
                changeInput.classList.remove('negative');
                changeInput.style.color = '#059669';
                changeInput.style.fontWeight = 'bold';
                changeInput.placeholder = '₱ 0';
            }
        } else {
            changeInput.value = '';
            changeInput.style.color = '#6b7280';
            changeInput.style.fontWeight = 'normal';
            changeInput.placeholder = '₱ 0';
            changeInput.classList.remove('negative');
        }
    }
}

    getCalculatedSubtotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    getCalculatedTotal() {
        const subtotal = this.getCalculatedSubtotal();
        const discountedSubtotal = Math.max(0, subtotal - this.manualDiscount);
        const tax = discountedSubtotal * this.taxRate;
        return discountedSubtotal + tax;
    }

    updateCalculatorInput(elementId, amount) {
        const element = document.getElementById(elementId);
        if (element) {
            if (amount > 0) {
                element.value = amount.toFixed(2);
            } else {
                element.value = '';
                element.placeholder = '₱ 0';
            }
        }
    }

    updateOrderSummary() {
        const subtotal = this.getCalculatedSubtotal();
        const discountedSubtotal = Math.max(0, subtotal - this.manualDiscount);
        const tax = discountedSubtotal * this.taxRate;
        const total = discountedSubtotal + tax;

        this.updateCalculatorInput('orderSubtotalInput', subtotal);
        this.updateCalculatorInput('orderTaxInput', tax);
        this.updateCalculatorInput('orderTotalInput', total);

        this.calculateChange();
        this.updateDashboardStats(total);
    }

updateContinueButton() {
    const btn = document.getElementById('continueToPayment');
    if (!btn) return;

    // If cart is empty, disable button
    if (this.cart.length === 0) {
        btn.disabled = true;
        btn.className = 'continue-btn';
        btn.innerHTML = '<ion-icon name="bag-outline"></ion-icon> Add items to continue';
        return;
    }

    const total = this.getCalculatedTotal();
    const cashReceived = this.cashReceived;

    // STRICT CASH VALIDATION
    if (cashReceived === 0 || cashReceived === null || isNaN(cashReceived)) {
        // No cash entered - require cash input
        btn.disabled = true;
        btn.className = 'continue-btn no-cash';
        btn.innerHTML = '<ion-icon name="cash-outline"></ion-icon> Enter cash amount';
        return;
    }

    if (cashReceived < total) {
        // Insufficient cash - show shortage
        const shortage = total - cashReceived;
        btn.disabled = true;
        btn.className = 'continue-btn insufficient-cash';
        btn.innerHTML = `<ion-icon name="warning-outline"></ion-icon> Need ₱${shortage.toFixed(2)} more`;
        return;
    }

    // Sufficient cash - allow completion
    btn.disabled = false;
    btn.className = 'continue-btn complete-order';
    btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Complete Order';
}


    updateDashboardStats(orderTotal) {
        // Do NOT update sales here during order calculation
        // Sales should only be updated when order is actually completed
        // This method is called during cart updates, not final purchase
        
        console.log(`📊 Order total calculated: ₱${orderTotal.toLocaleString()}`);
        console.log('💡 Sales will only update when payment is completed');
    }

    openPaymentModal() {
    if (this.cart.length === 0) {
        this.showNotification('Your cart is empty. Add items first.', 'error');
        return;
    }

    const total = this.getCalculatedTotal();
    const cashReceived = this.cashReceived;
    
    // STRICT VALIDATION - No cash entered
    if (cashReceived === 0 || cashReceived === null || isNaN(cashReceived)) {
        this.showNotification('Please enter the cash amount before proceeding to payment.', 'error');
        
        // Focus on cash input
        const cashInput = document.getElementById('orderCashInput');
        if (cashInput) {
            cashInput.focus();
            cashInput.style.borderColor = '#dc2626';
            cashInput.style.backgroundColor = '#fef2f2';
        }
        return;
    }
    
    // STRICT VALIDATION - Insufficient cash
    if (cashReceived < total) {
        const shortage = total - cashReceived;
        this.showNotification(`Insufficient cash! You need ₱${shortage.toFixed(2)} more to complete this order.`, 'error');
        
        // Focus on cash input
        const cashInput = document.getElementById('orderCashInput');
        if (cashInput) {
            cashInput.focus();
            cashInput.select(); // Select all text for easy correction
        }
        return;
    }

    // All validations passed - proceed to payment
    this.renderPaymentConfirmation();
    this.resetPaymentForm();
    
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            this.setupProofUpload();
        }, 100);
    }
}

    closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    setupProofUpload() {
        const uploadArea = document.getElementById('proofUploadArea');
        const fileInput = document.getElementById('proofOfPayment');

        if (!uploadArea || !fileInput) {
            return;
        }

        uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('.proof-preview-overlay')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleProofUpload(e.target.files[0]);
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#10b981';
            uploadArea.style.backgroundColor = '#f0fdf4';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.backgroundColor = '#f8fafc';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#cbd5e1';
            uploadArea.style.backgroundColor = '#f8fafc';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleProofUpload(files[0]);
            }
        });
    }

    handleProofUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image size must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.showProofPreview(e.target.result);
        };
        reader.onerror = () => {
            this.showNotification('Error reading image file', 'error');
        };
        reader.readAsDataURL(file);
    }

    showProofPreview(imageSrc) {
        const uploadArea = document.getElementById('proofUploadArea');
        const proofPreview = document.getElementById('proofPreview');
        
        if (uploadArea) {
            uploadArea.classList.add('has-image');
            const placeholder = uploadArea.querySelector('.proof-upload-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
        
        if (proofPreview) {
            proofPreview.style.display = 'block';
            proofPreview.innerHTML = `
                <img src="${imageSrc}" alt="Proof of payment" />
                <div class="proof-preview-overlay">
                    <button type="button" class="proof-action-btn" onclick="orderManager.removeProof()">
                        <ion-icon name="trash-outline"></ion-icon>
                    </button>
                    <button type="button" class="proof-action-btn" onclick="document.getElementById('proofOfPayment').click()">
                        <ion-icon name="camera-outline"></ion-icon>
                    </button>
                </div>
            `;
        }
    }

    removeProof() {
        const fileInput = document.getElementById('proofOfPayment');
        const uploadArea = document.getElementById('proofUploadArea');
        const proofPreview = document.getElementById('proofPreview');
        
        if (!fileInput || !uploadArea || !proofPreview) {
            return;
        }
        
        if (fileInput) fileInput.value = '';
        
        if (uploadArea) {
            uploadArea.classList.remove('has-image');
            const placeholder = uploadArea.querySelector('.proof-upload-placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        }
        
        if (proofPreview) {
            proofPreview.style.display = 'none';
            proofPreview.innerHTML = '';
        }
        
        this.showNotification('Proof of payment removed');
    }

    renderPaymentConfirmation() {
        const container = document.getElementById('confirmationItems');
        const orderNumberEl = document.getElementById('confirmationOrderNumber');
        
        if (orderNumberEl) {
            orderNumberEl.textContent = `Orders #${this.currentOrderNumber}`;
        }

        if (container) {
            container.innerHTML = this.cart.map(item => `
                <div class="confirmation-item">
                    <div class="confirmation-item-image">
                        ${item.image ? 
                            `<img src="${item.image}" alt="${item.name}" />` : 
                            `<ion-icon name="cube-outline"></ion-icon>`
                        }
                    </div>
                    <div class="confirmation-item-details">
                        <div class="confirmation-item-name">${item.name}</div>
                        <div class="confirmation-item-price">₱ ${item.price.toLocaleString()}</div>
                    </div>
                    <div class="confirmation-item-qty">${item.quantity}</div>
                    <div class="confirmation-item-total">₱ ${(item.price * item.quantity).toLocaleString()}</div>
                </div>
            `).join('');
        }

        const subtotal = this.getCalculatedSubtotal();
        const discountedSubtotal = Math.max(0, subtotal - this.manualDiscount);
        const tax = discountedSubtotal * this.taxRate;
        const total = this.getCalculatedTotal();
        const cashReceived = this.cashReceived;
        const change = Math.max(0, cashReceived - total);

        const confSubtotalEl = document.getElementById('confirmationSubtotal');
        const confTaxEl = document.getElementById('confirmationTax');
        const confDiscountEl = document.getElementById('confirmationDiscount');
        const confCashReceivedEl = document.getElementById('confirmationCashReceived');
        const confTotalEl = document.getElementById('confirmationTotal');
        const confChangeEl = document.getElementById('confirmationChange');

        if (confSubtotalEl) confSubtotalEl.textContent = `₱ ${Math.round(subtotal).toLocaleString()}`;
        if (confTaxEl) confTaxEl.textContent = `₱ ${Math.round(tax).toLocaleString()}`;
        if (confDiscountEl) confDiscountEl.textContent = `₱ ${Math.round(this.manualDiscount).toLocaleString()}`;
        if (confCashReceivedEl) confCashReceivedEl.textContent = `₱ ${Math.round(cashReceived).toLocaleString()}`;
        if (confTotalEl) confTotalEl.textContent = `₱ ${Math.round(total).toLocaleString()}`;
        if (confChangeEl) confChangeEl.textContent = `₱ ${Math.round(change).toLocaleString()}`;
    }

    resetPaymentForm() {
        const form = document.getElementById('paymentForm');
        if (form) form.reset();

        document.querySelectorAll('.payment-method').forEach(method => {
            method.classList.remove('selected');
        });

        const customerDetails = document.getElementById('customerDetails');
        if (customerDetails) {
            customerDetails.classList.remove('active');
        }

        const confirmBtn = document.getElementById('confirmPayment');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Select Payment Method';
        }
    }

    selectPaymentMethod(methodElement) {
        document.querySelectorAll('.payment-method').forEach(method => {
            method.classList.remove('selected');
        });

        methodElement.classList.add('selected');
        
        const method = methodElement.dataset.method;
        const customerDetails = document.getElementById('customerDetails');
        const confirmBtn = document.getElementById('confirmPayment');

        if (method === 'cash') {
            if (customerDetails) {
                customerDetails.classList.remove('active');
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Confirm Payment';
            }
        } else if (method === 'gcash') {
            if (customerDetails) {
                customerDetails.classList.add('active');
            }
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Confirm Payment';
            }
        }
    }

    processPayment() {
    const selectedMethod = document.querySelector('.payment-method.selected');
    if (!selectedMethod) {
        this.showNotification('Please select a payment method', 'error');
        return;
    }

    const method = selectedMethod.dataset.method;
    const total = this.getCalculatedTotal();

    // CASH VALIDATION - Check if sufficient cash provided
    if (method === 'cash') {
        if (this.cashReceived < total) {
            const shortage = total - this.cashReceived;
            this.showNotification(`Insufficient cash! You need ₱${shortage.toFixed(2)} more to complete this order.`, 'error');
            return;
        }
        
        if (this.cashReceived === 0) {
            this.showNotification('Please enter the cash amount received from customer.', 'error');
            return;
        }
    }
    
    const confirmBtn = document.getElementById('confirmPayment');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<ion-icon name="refresh-outline"></ion-icon> Processing...';
    }
    
    if (method === 'gcash') {
        const customerNameEl = document.getElementById('customerName');
        const customerNumberEl = document.getElementById('customerNumber');
        const proofOfPaymentEl = document.getElementById('proofOfPayment');
        
        if (customerNameEl && customerNumberEl && proofOfPaymentEl) {
            const name = customerNameEl.value.trim();
            const number = customerNumberEl.value.trim();
            const hasProof = proofOfPaymentEl.files && proofOfPaymentEl.files[0];
            
            if (!name || !number) {
                this.showNotification('Please fill in customer name and GCash number', 'error');
                this.resetPaymentButton();
                return;
            }
            
            if (!hasProof) {
                this.showNotification('Please upload proof of payment for GCash transactions', 'error');
                this.resetPaymentButton();
                return;
            }
            
            this.gcashCustomerName = name;
            this.gcashNumber = number;
            this.gcashProofFile = proofOfPaymentEl.files[0];
            
            // Process image and store it for viewing
            const reader = new FileReader();
            reader.onload = (e) => {
                this.gcashProofOfPayment = e.target.result;
                this.tempProofImage = e.target.result;
                this.completeOrder(method);
            };
            reader.readAsDataURL(proofOfPaymentEl.files[0]);
            return;
        }
    }

    this.completeOrder(method);
}
handleCashChange() {
    const cashInput = document.getElementById('orderCashInput');
    const rawValue = cashInput.value.trim();
    
    // Handle empty input
    if (rawValue === '' || rawValue === null) {
        this.cashReceived = 0;
    } else {
        this.cashReceived = parseFloat(rawValue) || 0;
    }
    
    const total = this.getCalculatedTotal();
    
    // Update cash input styling based on validation
    if (cashInput) {
        if (this.cashReceived === 0) {
            // No cash entered
            cashInput.style.borderColor = '#e2e8f0';
            cashInput.style.backgroundColor = 'white';
        } else if (this.cashReceived >= total) {
            // Sufficient cash
            cashInput.style.borderColor = '#10b981';
            cashInput.style.backgroundColor = '#f0fdf4';
        } else {
            // Insufficient cash
            cashInput.style.borderColor = '#dc2626';
            cashInput.style.backgroundColor = '#fef2f2';
        }
    }
    
    this.calculateChange();
    this.updateContinueButton(); // This will now properly validate
}

    resetPaymentButton() {
        const confirmBtn = document.getElementById('confirmPayment');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Confirm Payment';
        }
    }

// Replace your existing completeOrder method in order.js with this updated version

async completeOrder(paymentMethod) {
    console.log(`🎉 === COMPLETING ORDER ===`);
    console.log(`Payment method: ${paymentMethod}`);
    
    try {
        // Prepare order data
        const orderData = {
            items: this.cart.map(item => ({
                product_id: item.id,
                product_name: item.name,
                product_price: item.price,
                quantity: item.quantity
            })),
            subtotal: this.getCalculatedSubtotal(),
            tax: this.getCalculatedSubtotal() * this.taxRate,
            discount: this.manualDiscount,
            total: this.getCalculatedTotal(),
            payment_method: paymentMethod,
            cash_received: this.cashReceived,
            change_given: Math.max(0, this.cashReceived - this.getCalculatedTotal())
        };

        // Add customer info if selected
        const customerSelect = document.getElementById('customerSelect');
        if (customerSelect && customerSelect.value) {
            orderData.customer_id = parseInt(customerSelect.value);
        }

        // Add GCash payment details
        if (paymentMethod === 'gcash') {
            orderData.gcash_customer_name = this.gcashCustomerName;
            orderData.gcash_number = this.gcashNumber;
            orderData.proof_of_payment = this.gcashProofOfPayment;
        }

        // Save order to database (this automatically deducts stock in the backend)
        const response = await fetch('api/orders.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Order saved to database:', result.order_number);
            
            // 🔥 IMPORTANT: Deduct stock from frontend after successful database save
            this.deductStockFromFrontend();
            
            // Update dashboard stats
            this.updateActualSales(orderData.total, 1);
            
            // Clear cart and reset
            this.cart = [];
            
            // INCREMENT the order number for the next order
            this.currentOrderNumber++;
            
            this.updateOrderDetails();
            
            // Store proof image with the actual order ID from database
            if (paymentMethod === 'gcash' && this.tempProofImage) {
                this.proofImages.set(result.order.id.toString(), this.tempProofImage);
                console.log(`📸 Stored proof image for order ID: ${result.order.id}`);
                this.tempProofImage = null;
            }
            
            // Reset payment data
            this.gcashProofOfPayment = null;
            this.gcashCustomerName = '';
            this.gcashNumber = '';
            this.gcashProofFile = null;
            
            // Close modals and show success
            this.closePaymentModal();
            this.showSuccessModal(paymentMethod);
            
// 🔄 Reload products from database to get updated stock
await this.loadProducts();
this.renderProducts();

await window.productManager.loadProducts();
window.productManager.renderProducts();
            
            // Trigger events
            document.dispatchEvent(new CustomEvent('orderCompleted', {
                detail: { 
                    paymentMethod, 
                    orderNumber: result.order_number,
                    orderId: result.order.id
                }
            }));
            
        } else {
            throw new Error(result.error || 'Failed to save order');
        }
        
    } catch (error) {
        console.error('Error completing order:', error);
        this.showNotification('Failed to complete order: ' + error.message, 'error');
        this.resetPaymentButton();
    }
}

deductStockFromFrontend() {
    console.log('🔄 Deducting stock from frontend...');
    
    // Update stock in the order manager's product list
    this.cart.forEach(cartItem => {
        const product = this.products.find(p => p.id === cartItem.id);
        if (product) {
            const originalStock = product.stock;
            const orderedQuantity = cartItem.quantity;
            const newStock = Math.max(0, originalStock - orderedQuantity);
            
            product.stock = newStock;
            
            console.log(`📦 Frontend Stock: ${product.name} | ${originalStock} → ${newStock} (ordered: ${orderedQuantity})`);
            
            if (newStock === 0) {
                console.log(`🚨 ${product.name} is now OUT OF STOCK`);
            } else if (newStock <= 5) {
                console.log(`⚠️ ${product.name} is now LOW STOCK (${newStock} remaining)`);
            }
        }
    });
    
    // Update the product manager if it exists
    if (window.productManager) {
        // Sync the stock with product manager
        this.cart.forEach(cartItem => {
            const pmProduct = window.productManager.products.find(p => p.id === cartItem.id);
            if (pmProduct) {
                pmProduct.stock = Math.max(0, pmProduct.stock - cartItem.quantity);
            }
        });
        
        // Re-render product manager UI
        window.productManager.renderProducts();
        window.productManager.updateDashboard();
    }
}

// Add these methods to your OrderManager class in order.js

async loadNextOrderNumber() {
    try {
        const response = await fetch('api/orders.php?action=next_order_number');
        const result = await response.json();
        
        if (response.ok) {
            this.currentOrderNumber = result.next_order_number;
            console.log(`📋 Next order number loaded: ${this.currentOrderNumber}`);
        } else {
            console.error('Failed to load next order number:', result.error);
            // Fallback: use timestamp-based order number
            this.currentOrderNumber = Date.now();
        }
    } catch (error) {
        console.error('Error loading next order number:', error);
        // Fallback: use timestamp-based order number
        this.currentOrderNumber = Date.now();
    }
}

    // NEW: Update actual sales only when orders are completed
    updateActualSales(orderTotal, orderCount) {
        const salesElement = document.getElementById('dashboard-sales');
        const ordersElement = document.getElementById('dashboard-orders');
        
        // Update sales with actual completed order total
        if (salesElement && orderTotal > 0) {
            const currentSales = parseFloat(salesElement.textContent.replace(/[₱,\s]/g, '')) || 0;
            const newSales = currentSales + orderTotal;
            salesElement.textContent = `₱ ${Math.round(newSales).toLocaleString()}`;
            console.log(`💰 Sales updated: ₱${currentSales.toLocaleString()} → ₱${newSales.toLocaleString()}`);
        }
        
        // Update order count with actual completed orders
        if (ordersElement && orderCount > 0) {
            const currentOrders = parseInt(ordersElement.textContent) || 0;
            const newOrderCount = currentOrders + orderCount;
            ordersElement.textContent = newOrderCount.toString();
            console.log(`📦 Orders updated: ${currentOrders} → ${newOrderCount}`);
        }
    }

    // NEW: Deduct stock from products when order is completed
    deductStock() {
        if (!window.productManager) {
            console.log('⚠️ Product manager not found, cannot deduct stock');
            return;
        }

        let stockDeductions = [];

        // Process each item in the cart
        this.cart.forEach(cartItem => {
            // Find the corresponding product in the product manager
            const product = window.productManager.products.find(p => p.id === cartItem.id);
            
            if (product) {
                const originalStock = product.stock;
                const orderedQuantity = cartItem.quantity;
                const newStock = Math.max(0, originalStock - orderedQuantity);
                
                // Update the stock
                product.stock = newStock;
                
                stockDeductions.push({
                    productName: product.name,
                    originalStock: originalStock,
                    orderedQuantity: orderedQuantity,
                    newStock: newStock,
                    outOfStock: newStock === 0
                });
                
                console.log(`📦 Stock updated: ${product.name} | ${originalStock} → ${newStock} (ordered: ${orderedQuantity})`);
            } else {
                console.log(`⚠️ Product not found for stock deduction: ${cartItem.name}`);
            }
        });

        // Trigger product update events to sync the UI
        if (window.productManager.renderProducts) {
            window.productManager.renderProducts();
        }
        
        // Update dashboard stats
        if (window.productManager.updateDashboard) {
            window.productManager.updateDashboard();
        }

        // Trigger sync event for other components
        document.dispatchEvent(new CustomEvent('productsUpdated', {
            detail: { 
                products: window.productManager.products,
                stockDeductions: stockDeductions
            }
        }));

        // Show stock deduction notification
        this.showStockDeductionNotification(stockDeductions);
    }

    // NEW: Show notification about stock changes
    showStockDeductionNotification(stockDeductions) {
        if (stockDeductions.length === 0) return;

        const outOfStockItems = stockDeductions.filter(item => item.outOfStock);
        const lowStockItems = stockDeductions.filter(item => !item.outOfStock && item.newStock < 5);

        let message = `Stock updated for ${stockDeductions.length} item(s)`;
        let type = 'success';

        if (outOfStockItems.length > 0) {
            message = `⚠️ ${outOfStockItems.length} item(s) now out of stock!`;
            type = 'error';
        } else if (lowStockItems.length > 0) {
            message = `⚠️ ${lowStockItems.length} item(s) running low on stock`;
            type = 'error';
        }

        // Show the main notification
        this.showNotification(message, type);

        // Log detailed stock information
        stockDeductions.forEach(item => {
            if (item.outOfStock) {
                console.log(`🚨 OUT OF STOCK: ${item.productName}`);
            } else if (item.newStock < 5) {
                console.log(`⚠️ LOW STOCK: ${item.productName} (${item.newStock} remaining)`);
            }
        });
    }

    addToTransactionHistory(paymentMethod) {
        const tableBody = document.querySelector('.table-body');
        if (!tableBody) return;

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const mainProduct = this.cart[0]?.name || 'Multiple Items';
        
        const customerSelect = document.getElementById('customerSelect');
        let customerInfo = {
            name: 'Walk-in Customer',
            contact: 'N/A',
            address: 'N/A'
        };
        
        if (customerSelect && customerSelect.value && window.customerManager) {
            const selectedCustomer = window.customerManager.getCustomerById(customerSelect.value);
            if (selectedCustomer) {
                customerInfo = {
                    name: selectedCustomer.name,
                    contact: selectedCustomer.contact,
                    address: selectedCustomer.address
                };
            }
        }

        const paymentDisplay = paymentMethod === 'gcash' ? 'GCash' : 'Cash';
        const transactionDate = new Date();
        const dateString = transactionDate.toLocaleDateString();
        const timeString = transactionDate.toLocaleTimeString();
        
        const newRow = document.createElement('div');
        newRow.className = 'table-row-container';
        newRow.setAttribute('data-transaction-id', this.currentOrderNumber);
        newRow.setAttribute('data-payment-method', paymentMethod);
        newRow.setAttribute('data-amount', total);
        newRow.setAttribute('data-product', mainProduct);
        newRow.setAttribute('data-date', transactionDate.toISOString().split('T')[0]);
        
        let proofOfPaymentSection = '';
        if (paymentMethod === 'gcash') {
            proofOfPaymentSection = `
                <div class="detail-item">
                    <div class="detail-label">GCash Customer Name</div>
                    <div class="detail-value">${this.gcashCustomerName || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">GCash Number</div>
                    <div class="detail-value">${this.gcashNumber || 'N/A'}</div>
                </div>
                <div class="detail-item proof-of-payment-item">
                    <div class="detail-label">Proof of Payment</div>
                    <div class="detail-value">
                        <button onclick="dashboardManager.viewProofOfPayment('${this.currentOrderNumber}')" 
                                style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="eye-outline"></ion-icon>
                            View Proof of Payment
                        </button>
                    </div>
                </div>
            `;
        }
        
        newRow.innerHTML = `
            <div class="table-row">
                <div>#${this.currentOrderNumber}</div>
                <div>${mainProduct}</div>
                <div>₱ ${Math.round(total).toLocaleString()}</div>
                <div>
                    <span class="payment-method-badge ${paymentMethod}">
                        <ion-icon name="${paymentMethod === 'gcash' ? 'card-outline' : 'cash-outline'}"></ion-icon>
                        ${paymentDisplay}
                    </span>
                </div>
                <div>
                    <span class="status-badge success">
                        Success
                    </span>
                </div>
                <div>
                    <button class="details-toggle-btn" onclick="dashboardManager.toggleTransactionDetails(this, '${this.currentOrderNumber}')">
                        <ion-icon name="chevron-down-outline"></ion-icon>
                    </button>
                </div>
            </div>
            <div class="transaction-details" id="details-${this.currentOrderNumber}">
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Date & Time</div>
                        <div class="detail-value">${dateString} at ${timeString}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Name</div>
                        <div class="detail-value">${customerInfo.name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Contact</div>
                        <div class="detail-value">${customerInfo.contact}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Address</div>
                        <div class="detail-value">${customerInfo.address}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Items Purchased</div>
                        <div class="detail-value">${this.cart.map(item => `${item.name} (${item.quantity}x)`).join(', ')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Subtotal</div>
                        <div class="detail-value">₱ ${Math.round(this.getCalculatedSubtotal()).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tax (12%)</div>
                        <div class="detail-value">₱ ${Math.round(this.getCalculatedSubtotal() * 0.12).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Discount Applied</div>
                        <div class="detail-value">₱ ${Math.round(this.manualDiscount).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Cash Received</div>
                        <div class="detail-value">₱ ${Math.round(this.cashReceived).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Change Given</div>
                        <div class="detail-value">₱ ${Math.round(Math.max(0, this.cashReceived - total)).toLocaleString()}</div>
                    </div>
                    ${proofOfPaymentSection}
                </div>
            </div>
        `;
        
        tableBody.insertBefore(newRow, tableBody.firstChild);
        
        // Hide empty state since we now have a transaction
        if (window.dashboardManager) {
            window.dashboardManager.hideEmptyState();
        }
        
        console.log(`✅ Added transaction #${this.currentOrderNumber} with ${paymentMethod} payment`);
    }

    exportToExcel() {
        const transactions = [];
        const tableRows = document.querySelectorAll('.table-body .table-row-container');
        
        if (tableRows.length === 0) {
            this.showNotification('No transactions to export', 'error');
            return;
        }

        tableRows.forEach(container => {
            const row = container.querySelector('.table-row');
            const details = container.querySelector('.transaction-details');
            
            const transactionId = container.getAttribute('data-transaction-id') || 'N/A';
            const product = container.getAttribute('data-product') || 'N/A';
            const amount = container.getAttribute('data-amount') || '0';
            const paymentMethod = container.getAttribute('data-payment-method') || 'cash';
            const date = container.getAttribute('data-date') || new Date().toISOString().split('T')[0];
            
            let customerName = 'Walk-in Customer';
            let customerContact = 'N/A';
            let customerAddress = 'N/A';
            let dateTime = date;
            let itemsPurchased = 'N/A';
            let subtotal = '0';
            let tax = '0';
            let discount = '0';
            let cashReceived = '0';
            let changeGiven = '0';
            
            if (details) {
                const detailItems = details.querySelectorAll('.detail-item');
                detailItems.forEach(item => {
                    const label = item.querySelector('.detail-label')?.textContent.trim();
                    const value = item.querySelector('.detail-value')?.textContent.trim();
                    
                    switch(label) {
                        case 'Date & Time':
                            dateTime = value || date;
                            break;
                        case 'Customer Name':
                            customerName = value || 'Walk-in Customer';
                            break;
                        case 'Customer Contact':
                            customerContact = value || 'N/A';
                            break;
                        case 'Customer Address':
                            customerAddress = value || 'N/A';
                            break;
                        case 'Items Purchased':
                            itemsPurchased = value || 'N/A';
                            break;
                        case 'Subtotal':
                            subtotal = value || '₱ 0';
                            break;
                        case 'Tax (12%)':
                            tax = value || '₱ 0';
                            break;
                        case 'Discount Applied':
                            discount = value || '₱ 0';
                            break;
                        case 'Cash Received':
                            cashReceived = value || '₱ 0';
                            break;
                        case 'Change Given':
                            changeGiven = value || '₱ 0';
                            break;
                    }
                });
            }
            
            const cleanValue = (str) => {
                return str.replace(/"/g, '""').replace(/,/g, ';');
            };
            
            transactions.push({
                'Transaction ID': `#${transactionId}`,
                'Date Time': cleanValue(dateTime),
                'Product': cleanValue(product),
                'Customer Name': cleanValue(customerName),
                'Customer Contact': cleanValue(customerContact),
                'Customer Address': cleanValue(customerAddress),
                'Items Purchased': cleanValue(itemsPurchased),
                'Subtotal': subtotal,
                'Tax 12%': tax,
                'Discount Applied': discount,
                'Total Amount': `₱${parseFloat(amount).toLocaleString()}`,
                'Payment Method': paymentMethod === 'gcash' ? 'GCash' : 'Cash',
                'Cash Received': cashReceived,
                'Change Given': changeGiven,
                'Status': 'Success'
            });
        });

        const headers = Object.keys(transactions[0]);
        const csvRows = [
            headers.join(','),
            ...transactions.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ];
        
        const csvContent = csvRows.join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `transaction_details_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showNotification(`Exported ${transactions.length} transactions successfully!`);
    }

    showSuccessModal(paymentMethod) {
        const modal = document.getElementById('successModal');
        const messageEl = document.getElementById('successMessage');
        
        if (messageEl) {
            let methodText = '';
            if (paymentMethod === 'gcash') {
                methodText = 'GCash';
            } else if (paymentMethod === 'cash') {
                methodText = 'Cash';
            } else {
                methodText = paymentMethod;
            }
            
            messageEl.textContent = `Your order has been successfully placed using ${methodText} payment.`;
        }
        
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeSuccessModal() {
        const modal = document.getElementById('successModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    showNotification(message, type = 'success') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <ion-icon name="${type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}"></ion-icon>
                <span>${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Global function to refresh order catalog
window.refreshOrderCatalog = function() {
    if (window.orderManager) {
        window.orderManager.loadProducts();
        window.orderManager.renderCategories();
        window.orderManager.renderProducts();
        console.log('Order catalog refreshed!');
    }
    
};
// Initialize OrderManager - THIS SHOULD BE IN ORDER.JS
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 DOM loaded, checking for order page elements...');
    
    const itemsGrid = document.getElementById('itemsGrid');
    
    if (itemsGrid) {
        console.log('✅ Initializing OrderManager...');
        try {
            window.orderManager = new OrderManager();
            console.log('🎉 Order Management System initialized successfully!');
        } catch (error) {
            console.error('❌ Error initializing OrderManager:', error);
        }
    } else {
        console.log('❌ itemsGrid not found, skipping OrderManager initialization');
    }
});