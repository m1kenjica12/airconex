class PurchasingMaterialLogs {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalPages = 1;
        this.allOrders = [];
        this.filteredOrders = [];
        this.selectedOrderId = null;
        this.init();
    }

    async init() {
        try {
            this.updateDateTime();
            this.setupEventListeners();
            this.updateStatus('Loading material orders...');
            await this.loadMaterialOrders();
            this.updateStatus('Material orders loaded successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('Error during initialization');
            this.showNotification('Failed to initialize: ' + error.message, 'error');
        }
    }

    async loadMaterialOrders() {
        try {
            console.log('Attempting to load material orders...');
            const response = await fetch('api/purchasing_materials_logs_load_materials.php');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseText = await response.text();
            console.log('Raw API response:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                console.error('Failed to parse JSON response:', error);
                throw new Error('Invalid response format from server');
            }
            
            console.log('Parsed data:', data);
            
            if (data.success) {
                this.allOrders = data.orders || [];
                this.filteredOrders = [...this.allOrders];
                
                console.log('Orders loaded:', this.allOrders.length);
                
                this.updatePagination();
                this.renderOrdersTable();
                this.updateStats();
                
                const message = this.allOrders.length > 0 
                    ? `Loaded ${this.allOrders.length} material orders` 
                    : 'No material orders found';
                    
                this.showNotification(message, 'success');
                console.log('Load completed successfully');
            } else {
                throw new Error(data.message || 'Failed to load material orders');
            }
        } catch (error) {
            console.error('Error loading material orders:', error);
            this.showNotification('Failed to load material orders: ' + error.message, 'error');
            this.updateStatus('Error loading material orders');
            
          
            this.allOrders = [];
            this.filteredOrders = [];
            this.updatePagination();
            this.renderOrdersTable();
            this.updateStats();
        }
    }

    setupEventListeners() {
        try {
    
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.handleSearch(e.target.value);
                });
            }


            const startDate = document.getElementById('startDate');
            const endDate = document.getElementById('endDate');
            
            if (startDate) {
                startDate.addEventListener('change', () => this.handleDateFilter());
            }
            
            if (endDate) {
                endDate.addEventListener('change', () => this.handleDateFilter());
            }

            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => this.previousPage());
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => this.nextPage());
            }

       
            this.setupModalListeners();

    
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this.refreshOrders());
            }
            
            console.log('Event listeners setup completed');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    setupModalListeners() {
        try {
        
            document.querySelectorAll('.modal-close').forEach(closeBtn => {
                closeBtn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            });

         
            window.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Error setting up modal listeners:', error);
        }
    }

    handleSearch(searchTerm) {
        try {
            if (!searchTerm.trim()) {
                this.filteredOrders = [...this.allOrders];
            } else {
                const term = searchTerm.toLowerCase();
                this.filteredOrders = this.allOrders.filter(order => 
                    order.po_number.toLowerCase().includes(term) ||
                    order.supplier.toLowerCase().includes(term) ||
                    order.po_date.includes(term) ||
                    (order.remarks && order.remarks.toLowerCase().includes(term))
                );
            }
            
            this.currentPage = 1;
            this.updatePagination();
            this.renderOrdersTable();
            this.updateStats();
        } catch (error) {
            console.error('Error in search:', error);
        }
    }

    handleDateFilter() {
        try {
            const startDate = document.getElementById('startDate')?.value;
            const endDate = document.getElementById('endDate')?.value;
            
            if (!startDate && !endDate) {
                this.filteredOrders = [...this.allOrders];
            } else {
                this.filteredOrders = this.allOrders.filter(order => {
                    const orderDate = new Date(order.po_date);
                    
                    if (startDate && endDate) {
                        return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
                    } else if (startDate) {
                        return orderDate >= new Date(startDate);
                    } else if (endDate) {
                        return orderDate <= new Date(endDate);
                    }
                    
                    return true;
                });
            }
            
            this.currentPage = 1;
            this.updatePagination();
            this.renderOrdersTable();
            this.updateStats();
        } catch (error) {
            console.error('Error in date filter:', error);
        }
    }

    updatePagination() {
        try {
            this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
            if (this.totalPages === 0) this.totalPages = 1;
            
            const pageInfo = document.getElementById('pageInfo');
            if (pageInfo) {
                pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
            }
            
            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');
            
            if (prevBtn) {
                prevBtn.disabled = this.currentPage <= 1;
            }
            
            if (nextBtn) {
                nextBtn.disabled = this.currentPage >= this.totalPages;
            }
            
            console.log(`Pagination updated: ${this.currentPage}/${this.totalPages}`);
        } catch (error) {
            console.error('Error updating pagination:', error);
        }
    }

    renderOrdersTable() {
        try {
            console.log('Rendering orders table...');
            const tbody = document.getElementById('ordersTableBody');
            if (!tbody) {
                console.error('ordersTableBody element not found');
                return;
            }

            tbody.innerHTML = '';

            if (this.filteredOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="no-orders">
                            <div class="no-orders-content">
                                <span class="no-orders-icon">📋</span>
                                <p>No material orders found</p>
                            </div>
                        </td>
                    </tr>
                `;
                console.log('No orders to display');
                return;
            }

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const ordersToShow = this.filteredOrders.slice(startIndex, endIndex);

            console.log(`Displaying ${ordersToShow.length} orders`);

            ordersToShow.forEach((order, index) => {
                try {
                    const row = document.createElement('tr');
                    row.className = 'order-row';
                    
                    const formattedDate = this.formatDate(order.po_date);
                    const formattedTotal = this.formatCurrency(order.total_amount);
                    
                    row.innerHTML = `
                        <td class="col-po-number">
                            <span class="po-number">${order.po_number}</span>
                        </td>
                        <td class="col-date">${formattedDate}</td>
                        <td class="col-supplier">
                            <span class="supplier-name">${order.supplier}</span>
                        </td>
                        <td class="col-items">
                            <span class="item-count">${order.total_items}</span>
                        </td>
                        <td class="col-total">
                            <span class="total-amount">${formattedTotal}</span>
                        </td>
                        <td class="col-actions">
                            <button class="btn-view" onclick="viewOrderDetails(${order.id})" title="View Details">
                                👁️
                            </button>
                        </td>
                    `;
                    
                    tbody.appendChild(row);
                } catch (rowError) {
                    console.error('Error creating row for order:', order, rowError);
                }
            });
            
            console.log('Table rendered successfully');
        } catch (error) {
            console.error('Error rendering orders table:', error);
        }
    }

    async viewOrderDetails(orderId) {
        try {
            this.selectedOrderId = orderId;
            this.updateStatus('Loading order details...');

            const response = await fetch(`api/purchasing_materials_logs_load_materials.php?order_id=${orderId}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayOrderDetails(data.order, data.items);
                document.getElementById('orderDetailsModal').style.display = 'block';
                this.updateStatus('Order details loaded');
            } else {
                throw new Error(data.message || 'Failed to load order details');
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showNotification('Failed to load order details: ' + error.message, 'error');
            this.updateStatus('Error loading order details');
        }
    }

    displayOrderDetails(order, items) {
        try {
        
            document.getElementById('modalOrderNumber').textContent = order.po_number;
            document.getElementById('modalOrderDate').textContent = this.formatDate(order.po_date);
            document.getElementById('modalSupplier').textContent = order.supplier;
            document.getElementById('modalRemarks').textContent = order.remarks || 'No remarks';
            
         
            const itemsTableBody = document.getElementById('orderItemsTableBody');
            if (!itemsTableBody) return;
            
            itemsTableBody.innerHTML = '';
            
            let totalAmount = 0;
            let totalQuantity = 0;
            
            items.forEach((item, index) => {
                const row = document.createElement('tr');
                row.className = 'item-row';
                
                const itemTotal = parseFloat(item.total) || 0;
                totalAmount += itemTotal;
                totalQuantity += parseInt(item.quantity) || 0;
                
                row.innerHTML = `
                    <td class="col-item-number">${index + 1}</td>
                    <td class="col-category">${item.category}</td>
                    <td class="col-material">${item.material}</td>
                    <td class="col-unit">${item.unit}</td>
                    <td class="col-quantity">${item.quantity}</td>
                    <td class="col-unit-price">${this.formatCurrency(item.unit_price)}</td>
                    <td class="col-total">${this.formatCurrency(itemTotal)}</td>
                `;
                
                itemsTableBody.appendChild(row);
            });
            
    
            document.getElementById('modalTotalQuantity').textContent = totalQuantity;
            document.getElementById('modalTotalAmount').textContent = this.formatCurrency(totalAmount);
            document.getElementById('modalTotalItems').textContent = items.length;
        } catch (error) {
            console.error('Error displaying order details:', error);
        }
    }

    updateStats() {
        try {
            const totalOrdersElement = document.getElementById('totalOrders');
            const totalAmountElement = document.getElementById('totalAmount');
            const totalItemsElement = document.getElementById('totalItems');
            
            if (totalOrdersElement) {
                totalOrdersElement.textContent = this.filteredOrders.length;
            }
            
            const totalAmount = this.filteredOrders.reduce((sum, order) => {
                return sum + (parseFloat(order.total_amount) || 0);
            }, 0);
            
            const totalItems = this.filteredOrders.reduce((sum, order) => {
                return sum + (parseInt(order.total_items) || 0);
            }, 0);
            
            if (totalAmountElement) {
                totalAmountElement.textContent = this.formatCurrency(totalAmount);
            }
            
            if (totalItemsElement) {
                totalItemsElement.textContent = totalItems;
            }
            
            console.log('Stats updated');
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
            this.renderOrdersTable();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
            this.renderOrdersTable();
        }
    }

    async refreshOrders() {
        this.updateStatus('Refreshing material orders...');
        await this.loadMaterialOrders();
        this.updateStatus('Material orders refreshed');
        
  
        const searchInput = document.getElementById('searchInput');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (searchInput) searchInput.value = '';
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';
        
        this.filteredOrders = [...this.allOrders];
        this.currentPage = 1;
        this.updatePagination();
        this.renderOrdersTable();
        this.updateStats();
        
        this.showNotification('Material orders refreshed', 'success');
    }

    formatDate(dateString) {
        try {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    }

    formatCurrency(amount) {
        try {
            const num = parseFloat(amount) || 0;
            return new Intl.NumberFormat('en-PH', {
                style: 'currency',
                currency: 'PHP'
            }).format(num);
        } catch (error) {
            console.error('Error formatting currency:', error);
            return '₱0.00';
        }
    }

    updateDateTime() {
        try {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const dateElement = document.getElementById('currentDate');
            if (dateElement) {
                dateElement.textContent = dateStr;
            }
        } catch (error) {
            console.error('Error updating date time:', error);
        }
    }

    updateStatus(message) {
        try {
            const statusElement = document.getElementById('status-text');
            if (statusElement) {
                statusElement.textContent = message;
            }
            console.log('Status:', message);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    showNotification(message, type = 'info') {
        try {
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notif => {
                if (notif.parentNode) {
                    notif.parentNode.removeChild(notif);
                }
            });

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            let backgroundColor, icon;
            switch(type) {
                case 'success':
                    backgroundColor = '#4caf50';
                    icon = '✓';
                    break;
                case 'error':
                    backgroundColor = '#f44336';
                    icon = '✗';
                    break;
                case 'warning':
                    backgroundColor = '#ff9800';
                    icon = '⚠';
                    break;
                case 'info':
                default:
                    backgroundColor = '#2196f3';
                    icon = 'ℹ';
                    break;
            }
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${backgroundColor};
                color: white;
                padding: 15px 25px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 0 6px 20px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideIn 0.4s ease-out;
                max-width: 400px;
                word-wrap: break-word;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            
            notification.innerHTML = `
                <span style="font-size: 16px; font-weight: bold;">${icon}</span>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.4s ease-out forwards';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 400);
                }
            }, 4000);
            
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    @keyframes slideIn {
                        from { 
                            transform: translateX(100%) scale(0.8); 
                            opacity: 0; 
                        }
                        to { 
                            transform: translateX(0) scale(1); 
                            opacity: 1; 
                        }
                    }
                    @keyframes slideOut {
                        from { 
                            transform: translateX(0) scale(1); 
                            opacity: 1; 
                        }
                        to { 
                            transform: translateX(100%) scale(0.8); 
                            opacity: 0; 
                        }
                    }
                    
                    .notification:hover {
                        transform: scale(1.02);
                        transition: transform 0.2s ease;
                        cursor: pointer;
                    }
                `;
                document.head.appendChild(style);
            }
            
            notification.addEventListener('click', () => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideOut 0.3s ease-out forwards';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
}


function viewOrderDetails(orderId) {
    if (window.purchasingMaterialLogs) {
        window.purchasingMaterialLogs.viewOrderDetails(orderId);
    }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.purchasingMaterialLogs) {
            window.purchasingMaterialLogs.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing PurchasingMaterialLogs...');
    window.purchasingMaterialLogs = new PurchasingMaterialLogs();
});