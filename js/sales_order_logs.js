

class SalesLogsManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalItems = 0;
        this.allLogs = [];
        this.filteredLogs = [];
        this.sortColumn = '';
        this.sortDirection = 'desc';
        this.init();
    }

    async init() {
        this.updateDateTime();
        await this.loadSalesLogs();
        this.setupEventListeners();
        this.updateStatus('Sales logs loaded successfully');
    }

    async loadSalesLogs() {
        try {
            this.updateStatus('Loading sales logs...');
            
            const response = await fetch('api/sales_order_logs_load_so.php');
            const result = await response.json();
            
            if (result.success) {
                this.allLogs = result.data;
                this.filteredLogs = [...this.allLogs];
                this.totalItems = this.allLogs.length;
                
                this.populateFilters();
                this.updateStats();
                this.renderTable();
                this.updatePagination();
                
                this.showNotification('Sales logs loaded successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to load sales logs');
            }
        } catch (error) {
            console.error('Error loading sales logs:', error);
            this.showNotification('Failed to load sales logs', 'error');
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
   
        this.filteredLogs = [];
        this.renderTable();
        this.updateStats();
    }

    populateFilters() {
  
        const stores = [...new Set(this.allLogs.map(item => item.store))].sort();
        const storeFilter = document.getElementById('storeFilter');
        storeFilter.innerHTML = '<option value="">All Stores</option>';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store;
            option.textContent = store;
            storeFilter.appendChild(option);
        });

  
        const accounts = [...new Set(this.allLogs.map(item => item.account).filter(Boolean))].sort();
        const accountFilter = document.getElementById('accountFilter');
        accountFilter.innerHTML = '<option value="">All Accounts</option>';
        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account;
            option.textContent = account;
            accountFilter.appendChild(option);
        });
    }

    setupEventListeners() {
      
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.applyFilters();
            }, 300);
        });

        document.getElementById('storeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('accountFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('statusFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateFromFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('dateToFilter').addEventListener('change', () => this.applyFilters());

   
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const storeFilter = document.getElementById('storeFilter').value;
        const accountFilter = document.getElementById('accountFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const dateFromFilter = document.getElementById('dateFromFilter').value;
        const dateToFilter = document.getElementById('dateToFilter').value;

        this.filteredLogs = this.allLogs.filter(item => {
            const matchesSearch = !searchTerm || 
                (item.so_number && item.so_number.toLowerCase().includes(searchTerm)) ||
                (item.client_name && item.client_name.toLowerCase().includes(searchTerm)) ||
                (item.store && item.store.toLowerCase().includes(searchTerm)) ||
                (item.contact_number && item.contact_number.toLowerCase().includes(searchTerm)) ||
                (item.city_province && item.city_province.toLowerCase().includes(searchTerm));

            const matchesStore = !storeFilter || item.store === storeFilter;
            const matchesAccount = !accountFilter || item.account === accountFilter;
            const matchesStatus = !statusFilter || item.status === statusFilter;

            let matchesDateRange = true;
            if (dateFromFilter || dateToFilter) {
                const bookDate = new Date(item.book_date);
                if (dateFromFilter) {
                    matchesDateRange = matchesDateRange && bookDate >= new Date(dateFromFilter);
                }
                if (dateToFilter) {
                    matchesDateRange = matchesDateRange && bookDate <= new Date(dateToFilter);
                }
            }

            return matchesSearch && matchesStore && matchesAccount && matchesStatus && matchesDateRange;
        });

        this.currentPage = 1;
        this.updateStats();
        this.renderTable();
        this.updatePagination();
    }

    updateStats() {
        const totalOrders = this.filteredLogs.length;
        const pendingOrders = this.filteredLogs.filter(item => item.status === 'For Request').length;
        const scheduledOrders = this.filteredLogs.filter(item => item.status === 'For Schedule').length;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyOrders = this.filteredLogs.filter(item => {
            const bookDate = new Date(item.book_date);
            return bookDate.getMonth() === currentMonth && bookDate.getFullYear() === currentYear;
        }).length;

        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('scheduledOrders').textContent = scheduledOrders;
        document.getElementById('monthlyOrders').textContent = monthlyOrders;
    }

    renderTable() {
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '';

        if (this.filteredLogs.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="19" class="loading-cell">
                        No sales orders found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

   
        const startIndex = this.pageSize === 'all' ? 0 : (this.currentPage - 1) * parseInt(this.pageSize);
        const endIndex = this.pageSize === 'all' ? this.filteredLogs.length : startIndex + parseInt(this.pageSize);
        const pageItems = this.filteredLogs.slice(startIndex, endIndex);

        pageItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'logs-row';
            
            const statusClass = item.status ? item.status.toLowerCase().replace(/\s+/g, '-') : '';
            
            row.innerHTML = `
                <td class="col-so-number text-center">
                    <span class="so-number-link" onclick="openSOModal('${item.so_number}')">${item.so_number || '-'}</span>
                </td>
                <td class="col-store">${item.store || '-'}</td>
                <td class="col-store-code text-center">${item.store_code || '-'}</td>
                <td class="col-account">${item.account || '-'}</td>
                <td class="col-status text-center">${item.status || '-'}</td>
                <td class="col-book-date text-center">${this.formatDate(item.book_date)}</td>
                <td class="col-install-date text-center">${this.formatDate(item.installation_date)}</td>
                <td class="col-month">${item.month || '-'}</td>
                <td class="col-client-type">${item.client_type || '-'}</td>
                <td class="col-client-name text-truncate" title="${item.client_name || ''}">${item.client_name || '-'}</td>
                <td class="col-address text-truncate" title="${item.address || ''}">${item.address || '-'}</td>
                <td class="col-city text-truncate" title="${item.city_province || ''}">${item.city_province || '-'}</td>
                <td class="col-contact">${item.contact_number || '-'}</td>
                <td class="col-app-type">${item.application_type || '-'}</td>
                <td class="col-scope">${item.scope_of_work || '-'}</td>
                <td class="col-quantity text-center">${item.total_quantity || '0'}</td>
                <td class="col-payment">${item.mode_of_payment || '-'}</td>
                <td class="col-scheme">${item.scheme || '-'}</td>
                <td class="col-remarks text-truncate" title="${item.remarks || ''}">${item.remarks || '-'}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    sortTable(column) {

        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

   
        document.querySelectorAll('.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const currentTh = document.querySelector(`th[onclick="sortTable('${column}')"]`);
        if (currentTh) {
            currentTh.classList.add(`sort-${this.sortDirection}`);
        }


        this.filteredLogs.sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';

        
            if (column === 'total_quantity' || column === 'store_code') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            } else if (column === 'book_date' || column === 'installation_date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            } else {
                aVal = aVal.toString().toLowerCase();
                bVal = bVal.toString().toLowerCase();
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    updatePagination() {
        const totalPages = this.pageSize === 'all' ? 1 : Math.ceil(this.filteredLogs.length / parseInt(this.pageSize));
        
  
        const startItem = this.pageSize === 'all' ? 1 : (this.currentPage - 1) * parseInt(this.pageSize) + 1;
        const endItem = this.pageSize === 'all' ? this.filteredLogs.length : 
            Math.min(this.currentPage * parseInt(this.pageSize), this.filteredLogs.length);
        
        document.getElementById('paginationInfo').textContent = 
            `Showing ${startItem}-${endItem} of ${this.filteredLogs.length} orders`;

       
        document.getElementById('prevBtn').disabled = this.currentPage <= 1;
        document.getElementById('nextBtn').disabled = this.currentPage >= totalPages;

       
        this.renderPageNumbers(totalPages);
    }

    renderPageNumbers(totalPages) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        pageNumbersContainer.innerHTML = '';

        if (this.pageSize === 'all' || totalPages <= 1) return;

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => this.goToPage(i);
            pageNumbersContainer.appendChild(pageBtn);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTable();
        this.updatePagination();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            this.updatePagination();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredLogs.length / parseInt(this.pageSize));
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
        }
    }

    changePageSize() {
        this.pageSize = document.getElementById('pageSize').value;
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }

    refreshLogs() {
        this.showNotification('Refreshing sales logs...', 'info');
        this.loadSalesLogs();
    }

    exportLogs() {
        try {
  
            const headers = [
                'SO Number', 'Store', 'Store Code', 'Account', 'Status', 
                'Book Date', 'Installation Date', 'Month', 'Client Type', 
                'Client Name', 'Address', 'City/Province', 'Contact', 
                'Application Type', 'Scope of Work', 'Quantity', 
                'Payment Mode', 'Scheme', 'Remarks'
            ];
            
            const csvContent = [
                headers.join(','),
                ...this.filteredLogs.map(item => [
                    `"${item.so_number || ''}"`,
                    `"${item.store || ''}"`,
                    `"${item.store_code || ''}"`,
                    `"${item.account || ''}"`,
                    `"${item.project_status || ''}"`,
                    `"${this.formatDate(item.book_date)}"`,
                    `"${this.formatDate(item.installation_date)}"`,
                    `"${item.month || ''}"`,
                    `"${item.client_type || ''}"`,
                    `"${item.client_name || ''}"`,
                    `"${item.address || ''}"`,
                    `"${item.city_province || ''}"`,
                    `"${item.contact_number || ''}"`,
                    `"${item.application_type || ''}"`,
                    `"${item.scope_of_work || ''}"`,
                    `"${item.total_quantity || '0'}"`,
                    `"${item.mode_of_payment || ''}"`,
                    `"${item.scheme || ''}"`,
                    `"${item.remarks || ''}"`
                ].join(','))
            ].join('\n');

      
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `sales_logs_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Sales logs exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export sales logs', 'error');
        }
    }

    printLogs() {
        const printWindow = window.open('', '_blank');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sales Logs - ${new Date().toLocaleDateString()}</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 8px; margin: 20px; }
                    h1 { text-align: center; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #333; padding: 3px; text-align: left; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .text-center { text-align: center; }
                    @media print { body { margin: 10px; } }
                </style>
            </head>
            <body>
                <h1>AirConEx Sales Order Logs</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Records: ${this.filteredLogs.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>SO Number</th>
                            <th>Store</th>
                            <th>Account</th>
                            <th>Status</th>
                            <th>Book Date</th>
                            <th>Client Name</th>
                            <th>Contact</th>
                            <th>City/Province</th>
                            <th>Quantity</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredLogs.map(item => `
                            <tr>
                                <td class="text-center">${item.so_number || '-'}</td>
                                <td>${item.store || '-'}</td>
                                <td>${item.account || '-'}</td>
                                <td class="text-center">${item.project_status || '-'}</td>
                                <td class="text-center">${this.formatDate(item.book_date)}</td>
                                <td>${item.client_name || '-'}</td>
                                <td>${item.contact_number || '-'}</td>
                                <td>${item.city_province || '-'}</td>
                                <td class="text-center">${item.total_quantity || '0'}</td>
                                <td>${item.mode_of_payment || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
        
        this.showNotification('Print dialog opened', 'info');
    }

    updateDateTime() {
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

        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status-text');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    showNotification(message, type = 'info') {
    
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
                backgroundColor = '#27ae60';
                icon = '✓';
                break;
            case 'error':
                backgroundColor = '#e74c3c';
                icon = '✗';
                break;
            case 'warning':
                backgroundColor = '#f39c12';
                icon = '⚠';
                break;
            case 'info':
            default:
                backgroundColor = '#3498db';
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
        
        const duration = type === 'success' ? 3000 : 4000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.4s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }
        }, duration);
      
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
                notification.style.animation = 'slideOut 0.4s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }
        });
    }
}


function searchLogs() {
    if (window.salesLogsManager) {
        window.salesLogsManager.applyFilters();
    }
}

function refreshLogs() {
    if (window.salesLogsManager) {
        window.salesLogsManager.refreshLogs();
    }
}

function exportLogs() {
    if (window.salesLogsManager) {
        window.salesLogsManager.exportLogs();
    }
}

function printLogs() {
    if (window.salesLogsManager) {
        window.salesLogsManager.printLogs();
    }
}

function sortTable(column) {
    if (window.salesLogsManager) {
        window.salesLogsManager.sortTable(column);
    }
}

function previousPage() {
    if (window.salesLogsManager) {
        window.salesLogsManager.previousPage();
    }
}

function nextPage() {
    if (window.salesLogsManager) {
        window.salesLogsManager.nextPage();
    }
}

function changePageSize() {
    if (window.salesLogsManager) {
        window.salesLogsManager.changePageSize();
    }
}


function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.salesLogsManager) {
            window.salesLogsManager.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.salesLogsManager = new SalesLogsManager();
});


function openSOModal(soNumber) {
    console.log('Opening modal for SO:', soNumber);
    

    if (!document.getElementById('soModal')) {
        createSOModal();
    }
    

    const modal = document.getElementById('soModal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    
    modalTitle.textContent = `Sales Order Details - ${soNumber}`;
    modalBody.innerHTML = '<div class="loading-spinner"></div> Loading products...';
    modal.style.display = 'block';
    

    loadSODetails(soNumber);
    
 
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeSOModal();
        }
    };
}


async function loadSODetails(soNumber) {
    try {
        const response = await fetch(`api/sales_logs_load_so_details.php?so_number=${encodeURIComponent(soNumber)}`);
        const result = await response.json();
        
        if (result.success) {
            displaySODetails(result.data, soNumber);
        } else {
            throw new Error(result.message || 'Failed to load SO details');
        }
    } catch (error) {
        console.error('Error loading SO details:', error);
        const modalBody = document.querySelector('#soModal .modal-body');
        modalBody.innerHTML = `
            <div class="error-message">
                <p>Error loading sales order details: ${error.message}</p>
            </div>
        `;
    }
}


function closeSOModal() {
    const modal = document.getElementById('soModal');
    if (modal) modal.style.display = 'none';
}

function createSOModal() {
    document.body.insertAdjacentHTML('beforeend', `
        <div id="soModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Sales Order Details</h3>
                    <button class="modal-close" onclick="closeSOModal()">&times;</button>
                </div>
                <div class="modal-body"></div>
            </div>
        </div>
    `);
    
    document.addEventListener('keydown', e => e.key === 'Escape' && closeSOModal());
}


function displaySODetails(products, soNumber) {
    const modalBody = document.querySelector('#soModal .modal-body');
    
    if (products.length === 0) {
        modalBody.innerHTML = `
            <div class="so-details-container">
                <div class="add-unit-section">
                    <button class="add-unit-btn" onclick="addUnitRow('${soNumber}')">Add Units</button>
                </div>
                <table class="so-details-table">
                    <thead>
                        <tr><th>Brand</th><th>Unit Description</th><th>Quantity</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="soDetailsTableBody">
                        <tr class="no-products-row">
                            <td colspan="4" class="no-products">No products found for this sales order.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        return;
    }
    
    modalBody.innerHTML = `
        <div class="so-details-container">
            <div class="add-unit-section">
                <button class="add-unit-btn" onclick="addUnitRow('${soNumber}')">Add Units</button>
            </div>
            <table class="so-details-table">
                <thead>
                    <tr><th>Brand</th><th>Unit Description</th><th>Quantity</th><th>Actions</th></tr>
                </thead>
                <tbody id="soDetailsTableBody">
                    ${products.map((product, index) => `
                        <tr data-row-index="${index}" data-so-number="${soNumber}">
                            <td><select class="editable-brand" data-row="${index}" disabled><option value="${product.brand || ''}">${product.brand || '-'}</option></select></td>
                            <td><select class="editable-unit-desc" data-row="${index}" disabled><option value="${product.unit_description || ''}">${product.unit_description || '-'}</option></select></td>
                            <td class="text-center"><input type="number" class="editable-quantity" data-row="${index}" value="${product.quantity || '0'}" min="1" disabled /></td>
                            <td class="text-center">
                                <button class="edit-btn" onclick="editRow(${index})">Edit</button>
                                <button class="save-btn" onclick="saveRow(${index})" style="display:none;">Save</button>
                                <button class="cancel-btn" onclick="cancelEdit(${index})" style="display:none;">Cancel</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    window.originalProductData = [...products];
}

function addUnitRow(soNumber) {
    const tbody = document.getElementById('soDetailsTableBody');
    

    const noProductsRow = tbody.querySelector('.no-products-row');
    if (noProductsRow) {
        noProductsRow.remove();
    }
    

    const existingRows = tbody.querySelectorAll('tr[data-row-index]');
    const nextIndex = existingRows.length;

    const newRow = document.createElement('tr');
    newRow.setAttribute('data-row-index', nextIndex);
    newRow.setAttribute('data-so-number', soNumber);
    newRow.innerHTML = `
        <td><select class="editable-brand" data-row="${nextIndex}"><option value="">Select Brand</option></select></td>
        <td><select class="editable-unit-desc" data-row="${nextIndex}"><option value="">Select Unit Description</option></select></td>
        <td class="text-center"><input type="number" class="editable-quantity" data-row="${nextIndex}" value="1" min="1" /></td>
        <td class="text-center">
            <button class="save-btn" onclick="saveNewRow(${nextIndex})">Save</button>
            <button class="cancel-btn" onclick="removeRow(${nextIndex})">Cancel</button>
        </td>
    `;
    
   
    newRow.style.backgroundColor = '#d4edda';
    
    tbody.appendChild(newRow);
    

    loadProductOptionsForNewRow(nextIndex);
    
 
    if (!window.originalProductData) {
        window.originalProductData = [];
    }
    window.originalProductData.push({
        brand: '',
        unit_description: '',
        quantity: 1,
        isNew: true
    });
}


async function saveNewRow(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;
    
    const saveBtn = row.querySelector('.save-btn');
    const [brand, unit, qty] = row.querySelectorAll('select, input');
    
    
    if (!brand.value || !unit.value) {
        showNotification('Please select both brand and unit description', 'error');
        return;
    }
    
   
    const selectedOption = unit.querySelector('option:checked');
    const availableStock = parseInt(selectedOption?.dataset.stock || 0);
    const requestedQty = parseInt(qty.value) || 1;
    
    if (availableStock <= 0) {
        showNotification('Selected item is out of stock', 'error');
        return;
    }
    
    if (requestedQty > availableStock) {
        showNotification(`Insufficient stock. Available: ${availableStock}`, 'error');
        return;
    }
    

    const existingRows = document.querySelectorAll('tr[data-row-index]');
    for (let i = 0; i < existingRows.length; i++) {
        if (i === rowIndex) continue; 
        
        const existingUnitSelect = existingRows[i].querySelector('.editable-unit-desc');
        if (existingUnitSelect && existingUnitSelect.value === unit.value) {
            showNotification('Same unit description cannot be added', 'error');
            return;
        }
    }
    
    const data = {
        so_number: row.dataset.soNumber,
        brand: brand.value,
        unit_description: unit.value,
        quantity: requestedQty,
        is_new: true
    };
    
    try {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        const response = await fetch('api/sales_logs_add_unit.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        
       
        [brand, unit, qty].forEach(el => el.disabled = true);
        row.innerHTML = `
            <td><select class="editable-brand" data-row="${rowIndex}" disabled><option value="${brand.value}">${brand.value}</option></select></td>
            <td><select class="editable-unit-desc" data-row="${rowIndex}" disabled><option value="${unit.value}">${unit.value}</option></select></td>
            <td class="text-center"><input type="number" class="editable-quantity" data-row="${rowIndex}" value="${qty.value}" min="1" disabled /></td>
            <td class="text-center">
                <button class="edit-btn" onclick="editRow(${rowIndex})">Edit</button>
                <button class="save-btn" onclick="saveRow(${rowIndex})" style="display:none;">Save</button>
                <button class="cancel-btn" onclick="cancelEdit(${rowIndex})" style="display:none;">Cancel</button>
            </td>
        `;
        
      
        row.style.backgroundColor = '';
        
  
        window.originalProductData[rowIndex] = {
            brand: data.brand,
            unit_description: data.unit_description,
            quantity: data.quantity,
            isNew: false
        };
        
        showNotification('Unit added successfully', 'success');
        
    } catch (error) {
        showNotification('Failed to add unit: ' + error.message, 'error');
    } finally {
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
    }
}

function removeRow(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (row) {
        row.remove();
        
       
        if (window.originalProductData && window.originalProductData[rowIndex]) {
            window.originalProductData.splice(rowIndex, 1);
        }
        
      
        const tbody = document.getElementById('soDetailsTableBody');
        if (tbody.children.length === 0) {
            tbody.innerHTML = `
                <tr class="no-products-row">
                    <td colspan="4" class="no-products">No products found for this sales order.</td>
                </tr>
            `;
        }
    }
}




async function loadProductOptionsForNewRow(rowIndex) {
    try {
        const response = await fetch('api/sales_logs_load_so_details.php?get_products=true');
        const result = await response.json();
        if (!result.success) return;
        
        const products = result.products || [];
        
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
        
        const brandSelect = document.querySelector(`.editable-brand[data-row="${rowIndex}"]`);
        const unitSelect = document.querySelector(`.editable-unit-desc[data-row="${rowIndex}"]`);
        
        if (brandSelect) {
            brandSelect.innerHTML = '<option value="">Select Brand</option>' + 
                brands.map(b => `<option value="${b}">${b}</option>`).join('');
            
            brandSelect.onchange = () => {
                if (brandSelect.value) {
                
                    const unitDescs = products
                        .filter(p => p.brand === brandSelect.value)
                        .map(p => ({ 
                            value: p.unit_description, 
                            display: `${p.unit_description} (Stock: ${p.stock_quantity})`,
                            stock: p.stock_quantity
                        }))
                        .sort((a, b) => a.value.localeCompare(b.value));
                    
                    unitSelect.innerHTML = '<option value="">Select Unit Description</option>' + 
                        unitDescs.map(u => `<option value="${u.value}" data-stock="${u.stock}">${u.display}</option>`).join('');
                } else {
                    unitSelect.innerHTML = '<option value="">Select Unit Description</option>';
                }
            };
        }
    } catch (error) {
        console.error('Error loading options for new row:', error);
    }
}


async function loadProductOptionsForRow(rowIndex) {
    try {
        const response = await fetch('api/sales_logs_load_so_details.php?get_products=true');
        const result = await response.json();
        if (!result.success) return;
        
        const products = result.products || [];
        
   
        const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
        
        const brandSelect = document.querySelector(`.editable-brand[data-row="${rowIndex}"]`);
        const unitSelect = document.querySelector(`.editable-unit-desc[data-row="${rowIndex}"]`);
        
        if (brandSelect) {
            const current = brandSelect.value;
            brandSelect.innerHTML = brands.map(b => `<option value="${b}" ${b === current ? 'selected' : ''}>${b}</option>`).join('');
            
            brandSelect.onchange = () => {
             
                const unitDescs = products
                    .filter(p => p.brand === brandSelect.value)
                    .map(p => ({ 
                        value: p.unit_description, 
                        display: `${p.unit_description} (Stock: ${p.stock_quantity})`,
                        stock: p.stock_quantity
                    }))
                    .sort((a, b) => a.value.localeCompare(b.value));
                
                unitSelect.innerHTML = unitDescs.map(u => `<option value="${u.value}" data-stock="${u.stock}">${u.display}</option>`).join('');
            };
            
            if (brandSelect.value && unitSelect) {
          
                const unitDescs = products
                    .filter(p => p.brand === brandSelect.value)
                    .map(p => ({ 
                        value: p.unit_description, 
                        display: `${p.unit_description} (Stock: ${p.stock_quantity})`,
                        stock: p.stock_quantity
                    }))
                    .sort((a, b) => a.value.localeCompare(b.value));
                
                const currentUnit = unitSelect.value;
                unitSelect.innerHTML = unitDescs.map(u => 
                    `<option value="${u.value}" data-stock="${u.stock}" ${u.value === currentUnit ? 'selected' : ''}>${u.display}</option>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading options:', error);
    }
}


function editRow(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;
    
    const [brand, unit, qty] = row.querySelectorAll('select, input');
    [brand, unit, qty].forEach(el => el.disabled = false);
    
    row.querySelector('.edit-btn').style.display = 'none';
    row.querySelector('.save-btn').style.display = 'inline-block';
    row.querySelector('.cancel-btn').style.display = 'inline-block';
    row.style.backgroundColor = '#fff3cd';
    
    loadProductOptionsForRow(rowIndex);
}


async function saveRow(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;
    
    const saveBtn = row.querySelector('.save-btn');
    const [brand, unit, qty] = row.querySelectorAll('select, input');
    
   
    const selectedOption = unit.querySelector('option:checked');
    const availableStock = parseInt(selectedOption?.dataset.stock || 0);
    const requestedQty = parseInt(qty.value) || 1;
    
    if (availableStock <= 0) {
        showNotification('Selected item is out of stock', 'error');
        return;
    }
    
    if (requestedQty > availableStock) {
        showNotification(`Insufficient stock. Available: ${availableStock}`, 'error');
        return;
    }
    
   
    const existingRows = document.querySelectorAll('tr[data-row-index]');
    for (let i = 0; i < existingRows.length; i++) {
        if (i === rowIndex) continue; 
        
        const existingUnitSelect = existingRows[i].querySelector('.editable-unit-desc');
        if (existingUnitSelect && existingUnitSelect.value === unit.value) {
            showNotification('Same unit description cannot be added', 'error');
            return;
        }
    }
    
    const data = {
        so_number: row.dataset.soNumber,
        row_index: rowIndex,
        brand: brand.value,
        unit_description: unit.value,
        quantity: requestedQty
    };
    
    try {
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        const response = await fetch('api/sales_logs_update_edits.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        
        [brand, unit, qty].forEach(el => el.disabled = true);
        row.querySelector('.edit-btn').style.display = 'inline-block';
        row.querySelector('.save-btn').style.display = 'none';
        row.querySelector('.cancel-btn').style.display = 'none';
        row.style.backgroundColor = '';
        
        window.originalProductData[rowIndex] = data;
        showNotification('Product updated successfully', 'success');
        
    } catch (error) {
        showNotification('Failed to update: ' + error.message, 'error');
    } finally {
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
    }
}


function cancelEdit(rowIndex) {
    const row = document.querySelector(`tr[data-row-index="${rowIndex}"]`);
    if (!row) return;
    
    const original = window.originalProductData[rowIndex];
    const [brand, unit, qty] = row.querySelectorAll('select, input');
    
    brand.value = original.brand || '';
    unit.value = original.unit_description || '';
    qty.value = original.quantity || '0';
    
    [brand, unit, qty].forEach(el => el.disabled = true);
    row.querySelector('.edit-btn').style.display = 'inline-block';
    row.querySelector('.save-btn').style.display = 'none';
    row.querySelector('.cancel-btn').style.display = 'none';
    row.style.backgroundColor = '';
}


async function loadProductOptionsForRow(rowIndex) {
    try {
        const response = await fetch('api/sales_logs_load_so_details.php?get_products=true');
        const result = await response.json();
        if (!result.success) return;
        
        const products = result.products || [];
        
      
        const inStockProducts = products.filter(p => p.stock_quantity > 0);
        const brands = [...new Set(inStockProducts.map(p => p.brand).filter(Boolean))].sort();
        
        const brandSelect = document.querySelector(`.editable-brand[data-row="${rowIndex}"]`);
        const unitSelect = document.querySelector(`.editable-unit-desc[data-row="${rowIndex}"]`);
        
        if (brandSelect) {
            const current = brandSelect.value;
            brandSelect.innerHTML = brands.map(b => `<option value="${b}" ${b === current ? 'selected' : ''}>${b}</option>`).join('');
            
            brandSelect.onchange = () => {
         
                const unitDescs = inStockProducts
                    .filter(p => p.brand === brandSelect.value)
                    .map(p => ({ 
                        value: p.unit_description, 
                        display: `${p.unit_description} (Stock: ${p.stock_quantity})`,
                        stock: p.stock_quantity
                    }))
                    .sort((a, b) => a.value.localeCompare(b.value));
                
                unitSelect.innerHTML = unitDescs.map(u => `<option value="${u.value}" data-stock="${u.stock}">${u.display}</option>`).join('');
            };
            
            if (brandSelect.value && unitSelect) {
             
                const unitDescs = inStockProducts
                    .filter(p => p.brand === brandSelect.value)
                    .map(p => ({ 
                        value: p.unit_description, 
                        display: `${p.unit_description} (Stock: ${p.stock_quantity})`,
                        stock: p.stock_quantity
                    }))
                    .sort((a, b) => a.value.localeCompare(b.value));
                
                const currentUnit = unitSelect.value;
                unitSelect.innerHTML = unitDescs.map(u => 
                    `<option value="${u.value}" data-stock="${u.stock}" ${u.value === currentUnit ? 'selected' : ''}>${u.display}</option>`
                ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading options:', error);
    }
}




function showNotification(message, type = 'info') {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const colors = { success: '#27ae60', error: '#e74c3c', warning: '#f39c12', info: '#3498db' };
    const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${colors[type]};color:white;padding:15px 25px;border-radius:6px;font-size:13px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,0.2);z-index:10000;max-width:400px;display:flex;align-items:center;gap:10px;`;
    notification.innerHTML = `<span style="font-size:16px;">${icons[type]}</span><span>${message}</span>`;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), type === 'success' ? 3000 : 4000);
    notification.onclick = () => notification.remove();
}