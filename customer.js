// Customer Management System
class CustomerManager {
    constructor() {
        this.customers = [];
        this.currentEditId = null;
        this.init();
    }

    // Initialize the customer manager
    init() {
        this.setupEventListeners();
        this.renderCustomers();
        console.log('Customer Manager initialized - Memory only, no persistence');
    }

    // Setup all event listeners
    setupEventListeners() {
        // Add customer button
        const addBtn = document.getElementById('addCustomerBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openModal());
        }

        // Form submission
        const form = document.getElementById('customerForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Modal close buttons
        const closeBtn = document.getElementById('closeCustomerModal');
        const cancelBtn = document.getElementById('cancelCustomerBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

        // Delete modal buttons
        const closeDeleteBtn = document.getElementById('closeDeleteCustomerModal');
        const cancelDeleteBtn = document.getElementById('cancelDeleteCustomerBtn');
        const confirmDeleteBtn = document.getElementById('confirmDeleteCustomerBtn');
        
        if (closeDeleteBtn) closeDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());

        // Search functionality
        const searchInput = document.getElementById('searchCustomers');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchCustomers(e.target.value));
        }

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.id === 'customerModal') this.closeModal();
            if (e.target.id === 'deleteCustomerModal') this.closeDeleteModal();
        });
    }

    // Generate new ID
    generateId() {
        return this.customers.length > 0 ? Math.max(...this.customers.map(c => c.id)) + 1 : 1;
    }

    // Get customer initials for avatar
    getCustomerInitials(name) {
        return name.split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // Format phone number
    formatPhoneNumber(phone) {
        // Simple formatting for Philippine numbers
        if (phone.length === 11 && phone.startsWith('09')) {
            return `${phone.substring(0, 4)}-${phone.substring(4, 7)}-${phone.substring(7)}`;
        }
        return phone;
    }

    // Render customers
    renderCustomers(customersToShow = this.customers) {
        const grid = document.getElementById('customersGrid');
        if (!grid) return;

        if (customersToShow.length === 0) {
            grid.innerHTML = `
                <div class="customer-empty-state">
                    <ion-icon name="people-outline"></ion-icon>
                    <h3>No customers found</h3>
                    <p>Try adjusting your search or add a new customer</p>
                </div>
            `;
        } else {
            grid.innerHTML = customersToShow.map(customer => this.createCustomerCard(customer)).join('');
        }

        this.updateCounts(customersToShow.length);
        this.updateCustomerDropdown();
    }

    // Create customer card HTML
    createCustomerCard(customer) {
        return `
            <div class="customer-card" data-id="${customer.id}">
                <div class="customer-header">
                    <div style="display: flex; align-items: center;">
                        <div class="customer-avatar">
                            ${this.getCustomerInitials(customer.name)}
                        </div>
                        <div class="customer-info">
                            <h3 class="customer-name">${customer.name}</h3>
                            <p class="customer-id">ID: #${customer.id.toString().padStart(4, '0')}</p>
                        </div>
                    </div>
                    <div class="customer-actions">
                        <button class="btn-small btn-edit" onclick="customerManager.editCustomer(${customer.id})">
                            <ion-icon name="create-outline"></ion-icon>
                        </button>
                        <button class="btn-small btn-delete" onclick="customerManager.deleteCustomer(${customer.id})">
                            <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                </div>
                <div class="customer-contact">
                    <ion-icon name="call-outline"></ion-icon>
                    <span>${this.formatPhoneNumber(customer.contact)}</span>
                </div>
                <div class="customer-address">
                    <ion-icon name="location-outline"></ion-icon>
                    <span>${customer.address}</span>
                </div>
            </div>
        `;
    }

    // Update counts
    updateCounts(displayCount = this.customers.length) {
        const countElement = document.getElementById('customersCount');
        if (countElement) {
            countElement.textContent = displayCount;
        }

        // Update dashboard stats
        this.updateDashboard();
    }

    // Update dashboard statistics
    updateDashboard() {
        const customersElement = document.getElementById('dashboard-customers');
        if (customersElement) {
            customersElement.textContent = this.customers.length;
        }
    }

    // Update customer dropdown in order page
    updateCustomerDropdown() {
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect) return;

        // Keep the current selection
        const currentValue = customerSelect.value;

        // Clear existing options except the first one
        customerSelect.innerHTML = '<option value="">Customers</option>';

        // Add customer options
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} - ${this.formatPhoneNumber(customer.contact)}`;
            customerSelect.appendChild(option);
        });

        // Restore selection if it still exists
        if (currentValue && this.customers.find(c => c.id == currentValue)) {
            customerSelect.value = currentValue;
        }
    }

    // Get customer by ID
    getCustomerById(id) {
        return this.customers.find(customer => customer.id == id);
    }

    // Open modal
    openModal(customer = null) {
        const modal = document.getElementById('customerModal');
        const title = document.getElementById('customerModalTitle');
        
        if (!modal || !title) return;

        if (customer) {
            // Edit mode
            title.textContent = 'Edit Customer';
            this.currentEditId = customer.id;
            this.populateForm(customer);
        } else {
            // Add mode
            title.textContent = 'Add Customer';
            this.currentEditId = null;
            this.clearForm();
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('customerModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            this.currentEditId = null;
            this.clearForm();
        }
    }

    // Populate form with customer data
    populateForm(customer) {
        document.getElementById('customerFormName').value = customer.name || '';
        document.getElementById('customerFormContact').value = customer.contact || '';
        document.getElementById('customerFormAddress').value = customer.address || '';
    }

    // Clear form
    clearForm() {
        const form = document.getElementById('customerForm');
        if (form) form.reset();
    }

    // Handle form submission
    handleSubmit(e) {
        e.preventDefault();

        const formData = {
            name: document.getElementById('customerFormName').value.trim(),
            contact: document.getElementById('customerFormContact').value.trim(),
            address: document.getElementById('customerFormAddress').value.trim()
        };

        // Validation
        if (!formData.name || !formData.contact || !formData.address) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate phone number format (simple validation for Philippine numbers)
        if (!/^09\d{9}$/.test(formData.contact)) {
            this.showNotification('Please enter a valid Philippine mobile number (09XXXXXXXXX)', 'error');
            return;
        }

        this.saveCustomer(formData);
    }

    // Save customer (memory only)
    saveCustomer(formData) {
        if (this.currentEditId) {
            // Update existing customer
            const index = this.customers.findIndex(c => c.id === this.currentEditId);
            if (index !== -1) {
                this.customers[index] = { ...this.customers[index], ...formData };
                this.showNotification('Customer updated successfully!');
            }
        } else {
            // Add new customer
            const newCustomer = {
                id: this.generateId(),
                ...formData
            };
            this.customers.push(newCustomer);
            this.showNotification('Customer added successfully!');
        }

        this.renderCustomers();
        this.closeModal();
    }

    // Edit customer
    editCustomer(id) {
        const customer = this.customers.find(c => c.id === id);
        if (customer) {
            this.openModal(customer);
        }
    }

    // Delete customer
    deleteCustomer(id) {
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        const deleteModal = document.getElementById('deleteCustomerModal');
        const customerNameElement = document.getElementById('deleteCustomerName');
        
        if (deleteModal && customerNameElement) {
            customerNameElement.textContent = customer.name;
            deleteModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.currentEditId = id;
        }
    }

    // Close delete modal
    closeDeleteModal() {
        const modal = document.getElementById('deleteCustomerModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
            this.currentEditId = null;
        }
    }

    // Confirm delete
    confirmDelete() {
        if (this.currentEditId) {
            this.customers = this.customers.filter(c => c.id !== this.currentEditId);
            this.renderCustomers();
            this.showNotification('Customer deleted successfully!');
            this.closeDeleteModal();
        }
    }

    // Search customers
    searchCustomers(query) {
        if (!query.trim()) {
            this.renderCustomers();
            return;
        }

        const filtered = this.customers.filter(customer =>
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            customer.contact.includes(query) ||
            customer.address.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderCustomers(filtered);
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

        // Add notification styles
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

        // Auto remove after 3 seconds
        setTimeout(() => notification.remove(), 3000);
    }
}

// Receipt Manager - handles receipt generation and printing
class ReceiptManager {
    constructor() {
        this.lastOrderData = null;
        this.setupPrintButton();
    }

    // Setup print button functionality
    setupPrintButton() {
        const printBtn = document.getElementById('printLastReceiptBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printLastReceipt());
        }

        // Listen for order completion events
        document.addEventListener('orderCompleted', (event) => {
            this.saveOrderData(event.detail);
        });
    }

    // Save order data for receipt printing
    saveOrderData(orderData) {
        this.lastOrderData = {
            orderNumber: orderData.orderNumber,
            paymentMethod: orderData.paymentMethod,
            items: orderData.items || [],
            customer: orderData.customer,
            timestamp: new Date(),
            amountReceived: orderData.amountReceived || 0
        };

        console.log('Order data saved for receipt:', this.lastOrderData);
    }

    // Get selected customer from order page
    getSelectedCustomer() {
        const customerSelect = document.getElementById('customerSelect');
        if (!customerSelect || !customerSelect.value) return null;

        return window.customerManager?.getCustomerById(customerSelect.value) || null;
    }

    // Generate receipt content
    generateReceiptContent(orderData) {
        const receipt = document.getElementById('receiptTemplate');
        if (!receipt || !orderData) return;

        // Calculate totals
        const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;

        // Format date and time
        const date = orderData.timestamp.toLocaleDateString();
        const time = orderData.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Update receipt data
        const receiptDate = document.getElementById('receiptDate');
        const receiptTime = document.getElementById('receiptTime');
        const receiptOrderNumber = document.getElementById('receiptOrderNumber');
        
        if (receiptDate) receiptDate.textContent = date;
        if (receiptTime) receiptTime.textContent = time;
        if (receiptOrderNumber) receiptOrderNumber.textContent = orderData.orderNumber;

        // Customer info
        const customerInfo = document.getElementById('receiptCustomerInfo');
        if (customerInfo) {
            if (orderData.customer) {
                customerInfo.innerHTML = `
                    <div><strong>Customer:</strong> ${orderData.customer.name}</div>
                    <div><strong>Contact:</strong> ${orderData.customer.contact}</div>
                `;
                customerInfo.style.display = 'block';
            } else {
                customerInfo.innerHTML = '<div><strong>Customer:</strong> Walk-in</div>';
                customerInfo.style.display = 'block';
            }
        }

        // Items
        const itemsContainer = document.getElementById('receiptItems');
        if (itemsContainer) {
            itemsContainer.innerHTML = orderData.items.map(item => `
                <div class="receipt-item">
                    <div class="receipt-item-name">${item.name} x${item.quantity}</div>
                    <div>₱${(item.price * item.quantity).toLocaleString()}</div>
                </div>
            `).join('');
        }

        // Totals
        const receiptSubtotal = document.getElementById('receiptSubtotal');
        const receiptTax = document.getElementById('receiptTax');
        const receiptTotal = document.getElementById('receiptTotal');
        const receiptPaymentMethod = document.getElementById('receiptPaymentMethod');
        const receiptAmountReceived = document.getElementById('receiptAmountReceived');
        const receiptChange = document.getElementById('receiptChange');
        
        if (receiptSubtotal) receiptSubtotal.textContent = `₱${Math.round(subtotal).toLocaleString()}`;
        if (receiptTax) receiptTax.textContent = `₱${Math.round(tax).toLocaleString()}`;
        if (receiptTotal) receiptTotal.textContent = `₱${Math.round(total).toLocaleString()}`;
        if (receiptPaymentMethod) receiptPaymentMethod.textContent = orderData.paymentMethod === 'gcash' ? 'GCash' : 'Cash';
        
        // Payment details
        const amountReceived = orderData.amountReceived || total;
        const change = Math.max(0, amountReceived - total);
        
        if (receiptAmountReceived) receiptAmountReceived.textContent = `₱${Math.round(amountReceived).toLocaleString()}`;
        if (receiptChange) receiptChange.textContent = `₱${Math.round(change).toLocaleString()}`;
    }

    // Print last receipt
    printLastReceipt() {
        if (!this.lastOrderData) {
            this.showNotification('No recent order found to print', 'error');
            return;
        }

        this.printReceipt(this.lastOrderData);
    }

    // Print receipt
    printReceipt(orderData) {
        this.generateReceiptContent(orderData);
        
        // Show receipt temporarily
        const receipt = document.getElementById('receiptTemplate');
        if (receipt) {
            receipt.style.display = 'block';
            
            // Trigger print
            setTimeout(() => {
                window.print();
                receipt.style.display = 'none';
            }, 100);
        }

        this.showNotification('Receipt sent to printer!');
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

        // Add notification styles
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

        // Auto remove after 3 seconds
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize customer manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page with customer elements
    if (document.getElementById('customersGrid')) {
        window.customerManager = new CustomerManager();
        window.receiptManager = new ReceiptManager();
        console.log('Customer Management System initialized successfully!');
    }
});