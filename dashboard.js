document.addEventListener('DOMContentLoaded', async function() {
    // Initialize DashboardManager first
    window.dashboardManager = new DashboardManager();
    console.log('Dashboard Manager initialized with database connection!');

    // Navigation functionality
    const navItems = document.querySelectorAll('.nav-item[data-page]');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = this.getAttribute('data-page');
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Hide all pages
            pages.forEach(page => page.classList.remove('active'));
            
            // Show target page
            const targetPageElement = document.getElementById(targetPage + '-page');
            if (targetPageElement) {
                targetPageElement.classList.add('active');
            }

            // Load dashboard stats when switching to dashboard
            if (targetPage === 'dashboard' && window.dashboardManager) {
                window.dashboardManager.loadDashboardStats();
            }
        });
    });
});

// Dashboard Manager - Database Integration
class DashboardManager {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadDashboardStats(); // Load real data from database
    }

    setupEventListeners() {
        const monthFilter = document.getElementById('monthFilter');
        if (monthFilter) {
            monthFilter.addEventListener('change', (e) => this.filterByMonth(e.target.value));
        }

        const searchInput = document.getElementById('searchTransactions');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchTransactions(e.target.value));
        }

        const refreshBtn = document.getElementById('refreshTransactions');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshTransactions());
        }
    }

    // NEW: Load dashboard statistics from database
    async loadDashboardStats() {
        try {
            const response = await fetch('api/dashboard.php');
            const result = await response.json();
            
            if (response.ok) {
                // Update dashboard stats
                const salesElement = document.getElementById('dashboard-sales');
                const ordersElement = document.getElementById('dashboard-orders');
                const customersElement = document.getElementById('dashboard-customers');
                
                if (salesElement) salesElement.textContent = `₱ ${result.stats.total_sales}`;
                if (ordersElement) ordersElement.textContent = result.stats.total_orders;
                if (customersElement) customersElement.textContent = result.stats.total_customers;
                
                // Load recent transactions
                this.loadRecentTransactions(result.recent_transactions);
                
                console.log('📊 Dashboard stats loaded from database');
            } else {
                console.error('Failed to load dashboard stats:', result.error);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showEmptyState();
        }
    }

    // NEW: Load recent transactions from database
    loadRecentTransactions(transactions) {
        const tableBody = document.getElementById('transactionTableBody');
        if (!tableBody) return;
        
        // Clear existing transactions
        tableBody.innerHTML = '';
        
        if (transactions.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Add each transaction
        transactions.forEach(transaction => {
            const row = this.createTransactionRow(transaction);
            tableBody.appendChild(row);
        });
        
        this.hideEmptyState();
    }

    // NEW: Create transaction row from database data
    createTransactionRow(transaction) {
        const row = document.createElement('div');
        row.className = 'table-row-container';
        row.setAttribute('data-transaction-id', transaction.id);
        row.setAttribute('data-payment-method', transaction.payment_method);
        row.setAttribute('data-amount', transaction.total);
        row.setAttribute('data-date', transaction.created_at.split(' ')[0]);
        
        const paymentDisplay = transaction.payment_method === 'gcash' ? 'GCash' : 'Cash';
        const date = new Date(transaction.created_at);
        const dateString = date.toLocaleDateString();
        const timeString = date.toLocaleTimeString();
        
        // Handle proof of payment for GCash
        let proofOfPaymentSection = '';
        if (transaction.payment_method === 'gcash' && transaction.proof_of_payment) {
            proofOfPaymentSection = `
                <div class="detail-item proof-of-payment-item">
                    <div class="detail-label">Proof of Payment</div>
                    <div class="detail-value">
                        <button onclick="dashboardManager.viewProofOfPayment('${transaction.id}')" 
                                style="background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
                            <ion-icon name="eye-outline"></ion-icon>
                            View Proof of Payment
                        </button>
                    </div>
                </div>
            `;
        }
        
        row.innerHTML = `
            <div class="table-row">
        <div>#${transaction.id}</div>  
        <div>${transaction.items_summary || 'Order Items'}</div>
        <div>₱ ${Math.round(parseFloat(transaction.total)).toLocaleString()}</div>
                <div>
                    <span class="payment-method-badge ${transaction.payment_method}">
                        <ion-icon name="${transaction.payment_method === 'gcash' ? 'card-outline' : 'cash-outline'}"></ion-icon>
                        ${paymentDisplay}
                    </span>
                </div>
                <div>
                    <span class="status-badge success">Success</span>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
    <button class="details-toggle-btn" onclick="dashboardManager.toggleTransactionDetails(this, '${transaction.id}')">
        <ion-icon name="chevron-down-outline"></ion-icon>
    </button>
    <button class="delete-transaction-btn" onclick="dashboardManager.deleteTransaction(${transaction.id})" 
            style="background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; padding: 0.5rem; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; transition: all 0.2s ease;">
        <ion-icon name="trash-outline" style="font-size: 16px;"></ion-icon>
    </button>
</div>
            </div>
            <div class="transaction-details" id="details-${transaction.id}">
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Date & Time</div>
                        <div class="detail-value">${dateString} at ${timeString}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Name</div>
                        <div class="detail-value">${transaction.customer_name || 'Walk-in Customer'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Contact</div>
                        <div class="detail-value">${transaction.customer_contact || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Customer Address</div>
                        <div class="detail-value">${transaction.customer_address || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Subtotal</div>
                        <div class="detail-value">₱ ${Math.round(parseFloat(transaction.subtotal)).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tax (12%)</div>
                        <div class="detail-value">₱ ${Math.round(parseFloat(transaction.tax)).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Discount Applied</div>
                        <div class="detail-value">₱ ${Math.round(parseFloat(transaction.discount || 0)).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Total Amount</div>
                        <div class="detail-value">₱ ${Math.round(parseFloat(transaction.total)).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Cash Received</div>
                        <div class="detail-value">₱ ${Math.round(parseFloat(transaction.cash_received || 0)).toLocaleString()}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Change Given</div>
                        <div class="detail-value">₱ ${Math.round(parseFloat(transaction.change_given || 0)).toLocaleString()}</div>
                    </div>
                    ${proofOfPaymentSection}
                </div>
            </div>
        `;
        
        return row;
    }

    toggleTransactionDetails(button, transactionId) {
        const detailsRow = document.getElementById(`details-${transactionId}`);
        const icon = button.querySelector('ion-icon');
        
        if (!detailsRow) return;

        if (detailsRow.classList.contains('active')) {
            detailsRow.classList.remove('active');
            button.classList.remove('active');
            icon.setAttribute('name', 'chevron-down-outline');
        } else {
            detailsRow.classList.add('active');
            button.classList.add('active');
            icon.setAttribute('name', 'chevron-up-outline');
        }
    }

    async filterByMonth(monthValue) {
        try {
            const url = monthValue ? `api/dashboard.php?month=${monthValue}` : 'api/dashboard.php';
            const response = await fetch(url);
            const result = await response.json();
            
            if (response.ok) {
                this.loadRecentTransactions(result.recent_transactions);
                
                if (result.recent_transactions.length === 0 && monthValue) {
                    this.showFilteredEmptyState(`No transactions found for ${this.getMonthName(monthValue)}`);
                }
            }
        } catch (error) {
            console.error('Error filtering transactions:', error);
        }
    }

    async searchTransactions(query) {
        if (!query.trim()) {
            await this.loadDashboardStats();
            return;
        }

        try {
            const response = await fetch(`api/dashboard.php?search=${encodeURIComponent(query)}`);
            const result = await response.json();
            
            if (response.ok) {
                this.loadRecentTransactions(result.recent_transactions);
                
                if (result.recent_transactions.length === 0) {
                    this.showFilteredEmptyState(`No transactions found for "${query}"`);
                }
            }
        } catch (error) {
            console.error('Error searching transactions:', error);
        }
    }

    async refreshTransactions() {
        const monthFilter = document.getElementById('monthFilter');
        const searchInput = document.getElementById('searchTransactions');
        
        if (monthFilter) monthFilter.value = '';
        if (searchInput) searchInput.value = '';

        // Reload all data from database
        await this.loadDashboardStats();
        
        this.showNotification('Transactions refreshed!');
    }

    showEmptyState() {
        this.hideEmptyState();
        
        const tableBody = document.getElementById('transactionTableBody');
        if (!tableBody) return;

        const emptyState = document.createElement('div');
        emptyState.className = 'no-transactions';
        emptyState.id = 'emptyState';
        emptyState.innerHTML = `
            <ion-icon name="receipt-outline"></ion-icon>
            <h3>No transactions yet</h3>
            <p>Start making sales to see transaction history here</p>
        `;
        
        tableBody.appendChild(emptyState);
    }

    showFilteredEmptyState(message) {
        this.hideEmptyState();
        
        const tableBody = document.getElementById('transactionTableBody');
        if (!tableBody) return;

        const emptyState = document.createElement('div');
        emptyState.className = 'no-transactions';
        emptyState.id = 'emptyState';
        emptyState.innerHTML = `
            <ion-icon name="search-outline"></ion-icon>
            <h3>No results found</h3>
            <p>${message}</p>
        `;
        
        tableBody.appendChild(emptyState);
    }

    hideEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.remove();
        }
    }

    getMonthName(monthValue) {
        const months = {
            '2024-01': 'January 2024', '2024-02': 'February 2024', '2024-03': 'March 2024',
            '2024-04': 'April 2024', '2024-05': 'May 2024', '2024-06': 'June 2024',
            '2024-07': 'July 2024', '2024-08': 'August 2024', '2024-09': 'September 2024',
            '2024-10': 'October 2024', '2024-11': 'November 2024', '2024-12': 'December 2024',
            '2025-01': 'January 2025', '2025-02': 'February 2025', '2025-03': 'March 2025',
            '2025-04': 'April 2025', '2025-05': 'May 2025', '2025-06': 'June 2025',
            '2025-07': 'July 2025', '2025-08': 'August 2025', '2025-09': 'September 2025',
            '2025-10': 'October 2025', '2025-11': 'November 2025', '2025-12': 'December 2025'
        };
        return months[monthValue] || monthValue;
    }

    async viewProofOfPayment(transactionId) {
        try {
            console.log('🔍 Looking for proof of payment for transaction:', transactionId);
            
            // First, try to get proof from order manager if it exists (for current session)
            if (window.orderManager && window.orderManager.proofImages) {
                const proofImage = window.orderManager.proofImages.get(transactionId.toString());
                if (proofImage) {
                    console.log('✅ Found proof in memory');
                    this.showImageModal(proofImage);
                    return;
                }
            }
            
            // If not found in memory, fetch from database
            console.log('🔍 Fetching proof from database...');
            const url = `api/orders.php?action=get_proof&transaction_id=${encodeURIComponent(transactionId)}`;
            console.log('📡 API URL:', url);
            
            const response = await fetch(url);
            console.log('📡 Response status:', response.status);
            
            // Get response text first to debug
            const responseText = await response.text();
            console.log('📡 Raw response:', responseText.substring(0, 200) + '...');
            
            // Try to parse as JSON
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError);
                console.error('❌ Response was:', responseText);
                this.showNotification('Server returned invalid response. Check console for details.', 'error');
                return;
            }
            
            if (response.ok && result.proof_of_payment) {
                console.log('✅ Found proof in database');
                this.showImageModal(result.proof_of_payment);
            } else {
                console.log('❌ Proof not found:', result.error || 'Unknown error');
                this.showNotification(result.error || 'Proof of payment not found', 'error');
            }
            
        } catch (error) {
            console.error('❌ Error loading proof of payment:', error);
            this.showNotification('Error loading proof of payment: ' + error.message, 'error');
        }
    }

    showImageModal(imageSrc) {
        // Remove existing modal if any
        const existingModal = document.getElementById('imageViewerModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create image viewer modal
        const modal = document.createElement('div');
        modal.id = 'imageViewerModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 4000;
            padding: 2rem;
        `;

        modal.innerHTML = `
            <div style="position: relative; max-width: 90%; max-height: 90%; display: flex; flex-direction: column; align-items: center;">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 1rem;">
                    <h3 style="color: white; margin: 0; font-size: 1.25rem;">Proof of Payment</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button onclick="dashboardManager.downloadProofImage('${imageSrc}')" 
                                style="background: #10b981; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;"
                                onmouseover="this.style.background='#059669'"
                                onmouseout="this.style.background='#10b981'"
                                title="Download Image">
                            <ion-icon name="download-outline" style="font-size: 20px;"></ion-icon>
                        </button>
                        <button onclick="document.getElementById('imageViewerModal').remove(); document.body.style.overflow = 'auto';" 
                                style="background: #ef4444; color: white; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;"
                                onmouseover="this.style.background='#dc2626'"
                                onmouseout="this.style.background='#ef4444'"
                                title="Close">
                            <ion-icon name="close-outline" style="font-size: 24px;"></ion-icon>
                        </button>
                    </div>
                </div>
                <img src="${imageSrc}" alt="Proof of Payment" 
                     style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); cursor: zoom-in;"
                     onclick="this.style.transform = this.style.transform ? '' : 'scale(1.5)'; this.style.transition = 'transform 0.3s ease';">
            </div>
        `;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        // Add keyboard support (ESC to close)
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.body.style.overflow = 'auto';
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Restore body overflow when modal is removed
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && !document.getElementById('imageViewerModal')) {
                    document.body.style.overflow = 'auto';
                    observer.disconnect();
                }
            });
        });
        observer.observe(document.body, { childList: true });
    }

    // Add this new method for downloading images
    downloadProofImage(imageSrc) {
        try {
            // Create a temporary link element
            const link = document.createElement('a');
            link.href = imageSrc;
            link.download = `proof_of_payment_${Date.now()}.png`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Proof of payment downloaded successfully!');
        } catch (error) {
            console.error('Error downloading image:', error);
            this.showNotification('Failed to download image', 'error');
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

    // Delete transaction
    async deleteTransaction(transactionId) {
        // Show confirmation dialog
        if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`api/orders.php?id=${transactionId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Transaction deleted successfully!');
                // Reload dashboard stats to refresh the transaction list
                await this.loadDashboardStats();
            } else {
                this.showNotification(result.error || 'Failed to delete transaction', 'error');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            this.showNotification('Network error deleting transaction', 'error');
        }
    }
}