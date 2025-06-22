

class PurchasingInventoryManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalItems = 0;
        this.allInventory = [];
        this.filteredInventory = [];
        this.sortColumn = '';
        this.sortDirection = 'desc';
        this.init();
    }

    async init() {
        this.updateDateTime();
        await this.loadInventory();
        this.setupEventListeners();
        this.updateStatus('Purchasing unit logs loaded successfully');
    }

    async loadInventory() {
        try {
            this.updateStatus('Loading purchasing unit logs...');
            
            const response = await fetch('api/purchasing_inventory_load.php');
            const result = await response.json();
            
            if (result.success) {
                this.allInventory = result.data;
                this.filteredInventory = [...this.allInventory];
                this.totalItems = this.allInventory.length;
                
                this.populateFilters();
                this.updateStats();
                this.renderTable();
                this.updatePagination();
                
                this.showNotification('Purchasing unit logs loaded successfully', 'success');
            } else {
                throw new Error(result.message || 'Failed to load purchasing unit logs');
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showNotification('Failed to load unit logs', 'error');
            this.loadSampleData();
        }
    }

   

    populateFilters() {

        const suppliers = [...new Set(this.allInventory.map(item => item.supplier_name))].sort();
        const supplierFilter = document.getElementById('supplierFilter');
        supplierFilter.innerHTML = '<option value="">All Suppliers</option>';
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier;
            option.textContent = supplier;
            supplierFilter.appendChild(option);
        });

      
        const brands = [...new Set(this.allInventory.map(item => item.brand).filter(Boolean))].sort();
        const brandFilter = document.getElementById('brandFilter');
        brandFilter.innerHTML = '<option value="">All Brands</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });

     
        const conditions = [...new Set(this.allInventory.map(item => item.condition).filter(Boolean))].sort();
        const conditionFilter = document.getElementById('conditionFilter');
        conditionFilter.innerHTML = '<option value="">All Conditions</option>';
        conditions.forEach(condition => {
            const option = document.createElement('option');
            option.value = condition;
            option.textContent = condition;
            conditionFilter.appendChild(option);
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

 
        document.getElementById('supplierFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('brandFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('conditionFilter').addEventListener('change', () => this.applyFilters());

 
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyFilters();
            }
        });
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const supplierFilter = document.getElementById('supplierFilter').value;
        const brandFilter = document.getElementById('brandFilter').value;
        const conditionFilter = document.getElementById('conditionFilter').value;

        this.filteredInventory = this.allInventory.filter(item => {
            const matchesSearch = !searchTerm || 
                (item.po_number && item.po_number.toLowerCase().includes(searchTerm)) ||
                (item.dr_number && item.dr_number.toLowerCase().includes(searchTerm)) ||
                (item.model && item.model.toLowerCase().includes(searchTerm)) ||
                (item.serial && item.serial.toLowerCase().includes(searchTerm)) ||
                (item.supplier_name && item.supplier_name.toLowerCase().includes(searchTerm));

            const matchesSupplier = !supplierFilter || item.supplier_name === supplierFilter;
            const matchesBrand = !brandFilter || item.brand === brandFilter;
            const matchesCondition = !conditionFilter || item.condition === conditionFilter;

            return matchesSearch && matchesSupplier && matchesBrand && matchesCondition;
        });

        this.currentPage = 1;
        this.updateStats();
        this.renderTable();
        this.updatePagination();
    }

    updateStats() {
        const totalItems = this.filteredInventory.length;
        const pendingItems = this.filteredInventory.filter(item => item.status === 'Pending').length;
        const receivedItems = this.filteredInventory.filter(item => item.status === 'Received').length;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyItems = this.filteredInventory.filter(item => {
            const poDate = new Date(item.po_date);
            return poDate.getMonth() === currentMonth && poDate.getFullYear() === currentYear;
        }).length;

        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('pendingItems').textContent = pendingItems;
        document.getElementById('receivedItems').textContent = receivedItems;
        document.getElementById('monthlyItems').textContent = monthlyItems;
    }

    renderTable() {
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = '';

        if (this.filteredInventory.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="18" class="loading-cell">
                        No unit logs found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        const startIndex = this.pageSize === 'all' ? 0 : (this.currentPage - 1) * parseInt(this.pageSize);
        const endIndex = this.pageSize === 'all' ? this.filteredInventory.length : startIndex + parseInt(this.pageSize);
        const pageItems = this.filteredInventory.slice(startIndex, endIndex);

        pageItems.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'inventory-row';
            
        
            let actionButton = '';
            if (item.show_release_button) {
                const isPoReleased = item.po_release_status === 'Released';
                actionButton = isPoReleased 
                    ? `<button class="action-btn release-btn released" onclick="window.toggleReleaseItem(${item.po_id})" title="Unrelease all ${item.total_items_in_po} items in ${item.po_number}">Unrelease PO</button>`
                    : `<button class="action-btn release-btn" onclick="window.toggleReleaseItem(${item.po_id})" title="Release all ${item.total_items_in_po} items in ${item.po_number}">Release PO</button>`;
            } else {
             
                actionButton = `<span class="po-item-note">Part of ${item.po_number}</span>`;
            }
            
            row.innerHTML = `
                <td class="col-so-number text-center">${item.po_number || '-'}</td>
                <td class="col-book-date text-center">${this.formatDate(item.po_date)}</td>
                <td class="col-install-date text-center">${this.formatDate(item.received_date)}</td>
                <td class="col-store">${item.dr_number || '-'}</td>
                <td class="col-client-name">${item.supplier_name || '-'}</td>
                <td class="col-store">${item.brand || '-'}</td>
                <td class="col-quantity text-center">${item.horsepower || '-'}</td>
                <td class="col-quantity text-center">${item.quantity || 0}</td>
                <td class="col-app-type">${item.series || '-'}</td>
                <td class="col-scope">${item.type || '-'}</td>
                <td class="col-payment">${item.model || '-'}</td>
                <td class="col-scheme">${item.serial || '-'}</td>
                <td class="col-status">${item.condition || '-'}</td>
                <td class="col-remarks">${item.model_serials || '-'}</td>
                <td class="col-unit-price text-right">${this.formatCurrency(item.unit_price)}</td>
                <td class="col-total-unit-price text-right">${this.formatCurrency(item.total_unit_price)}</td>
                <td class="col-status text-center"><span class="status-${item.item_status ? item.item_status.toLowerCase() : 'unknown'}">${item.item_status || '-'}</span></td>
                <td class="col-action text-center">${actionButton}</td>
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

    formatCurrency(amount) {
        if (!amount || amount === 0) return '₱0.00';
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
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

 
        this.filteredInventory.sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';

          
            if (column === 'horsepower') {
                aVal = parseFloat(aVal.replace(/[^\d.]/g, '')) || 0;
                bVal = parseFloat(bVal.replace(/[^\d.]/g, '')) || 0;
            } else if (column === 'po_date' || column === 'received_date') {
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
        const totalPages = this.pageSize === 'all' ? 1 : Math.ceil(this.filteredInventory.length / parseInt(this.pageSize));
        

        const startItem = this.pageSize === 'all' ? 1 : (this.currentPage - 1) * parseInt(this.pageSize) + 1;
        const endItem = this.pageSize === 'all' ? this.filteredInventory.length : 
            Math.min(this.currentPage * parseInt(this.pageSize), this.filteredInventory.length);
        
        document.getElementById('paginationInfo').textContent = 
            `Showing ${startItem}-${endItem} of ${this.filteredInventory.length} items`;


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
        const totalPages = Math.ceil(this.filteredInventory.length / parseInt(this.pageSize));
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

    refreshInventory() {
        this.showNotification('Refreshing unit logs...', 'info');
        this.loadInventory();
    }

    exportInventory() {
        try {
        
            const headers = [
                'PO No.', 'Date PO', 'Date Received', 'DR No', 'Supplier Name', 
                'Brand', 'Horsepower', 'Quantity', 'Series', 'Type', 'Model', 'Serial', 
                'Condition', 'Model & Serials', 'Unit Price', 'Total Unit Price', 'Status'
            ];
            
            const csvContent = [
                headers.join(','),
                ...this.filteredInventory.map(item => [
                    `"${item.po_number || ''}"`,
                    `"${this.formatDate(item.po_date)}"`,
                    `"${this.formatDate(item.received_date)}"`,
                    `"${item.dr_number || ''}"`,
                    `"${item.supplier_name || ''}"`,
                    `"${item.brand || ''}"`,
                    `"${item.horsepower || ''}"`,
                    `"${item.quantity || 0}"`,
                    `"${item.series || ''}"`,
                    `"${item.type || ''}"`,
                    `"${item.model || ''}"`,
                    `"${item.serial || ''}"`,
                    `"${item.condition || ''}"`,
                    `"${item.model_serials || ''}"`,
                    `"${item.unit_price || 0}"`,
                    `"${item.total_unit_price || 0}"`,
                    `"${item.status || ''}"`
                ].join(','))
            ].join('\n');

        
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `purchasing_unit_logs_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Unit logs exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export unit logs', 'error');
        }
    }

    printInventory() {
        const printWindow = window.open('', '_blank');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Purchasing Unit Logs - ${new Date().toLocaleDateString()}</title>
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
                <h1>AirConEx Purchasing Unit Logs</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Records: ${this.filteredInventory.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>PO No.</th>
                            <th>Date PO</th>
                            <th>DR No.</th>
                            <th>Supplier</th>
                            <th>Brand</th>
                            <th>Model</th>
                            <th>Serial</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredInventory.map(item => `
                            <tr>
                                <td class="text-center">${item.po_number || '-'}</td>
                                <td class="text-center">${this.formatDate(item.po_date)}</td>
                                <td>${item.dr_number || '-'}</td>
                                <td>${item.supplier_name || '-'}</td>
                                <td>${item.brand || '-'}</td>
                                <td>${item.model || '-'}</td>
                                <td>${item.serial || '-'}</td>
                                <td class="text-center">${item.status || '-'}</td>
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
    }

    updateDateTime() {
       
        const dateTimeElement = document.getElementById('currentDateTime');
        if (dateTimeElement) {
            dateTimeElement.textContent = new Date().toLocaleString();
        }
        
        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
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
            `;
            document.head.appendChild(style);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.purchasingInventoryManager = new PurchasingInventoryManager();
});


function sortTable(column) {
    window.purchasingInventoryManager.sortTable(column);
}

function previousPage() {
    window.purchasingInventoryManager.previousPage();
}

function nextPage() {
    window.purchasingInventoryManager.nextPage();
}

function changePageSize() {
    window.purchasingInventoryManager.changePageSize();
}

function refreshInventory() {
    window.purchasingInventoryManager.refreshInventory();
}

function exportInventory() {
    window.purchasingInventoryManager.exportInventory();
}

function printInventory() {
    window.purchasingInventoryManager.printInventory();
}


window.toggleReleaseItem = function(poId) {
    const manager = window.purchasingInventoryManager;
    

    const poItem = manager.allInventory.find(i => i.po_id === poId && i.show_release_button);
    
    if (!poItem) {
        manager.showNotification('Purchase Order not found', 'error');
        return;
    }
    
    const isCurrentlyReleased = poItem.po_release_status === 'Released';
    const newStatus = isCurrentlyReleased ? 'Unreleased' : 'Released';
    const action = isCurrentlyReleased ? 'unreleased' : 'release';
    const itemCount = poItem.total_items_in_po;
    
    if (confirm(`Are you sure you want to ${action} ALL ${itemCount} items in PO ${poItem.po_number}?`)) {
        manager.showNotification('Processing...', 'info');
        
        fetch('api/purchasing_logs_release_item.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                id: poId  
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 
                manager.allInventory.forEach(item => {
                    if (item.po_id === poId) {
                        item.item_status = data.new_status;
                        item.po_release_status = data.new_status;
                    }
                });
                
                manager.applyFilters();
                manager.renderTable();
                manager.showNotification(
                    `PO ${poItem.po_number}: ${data.affected_items} items ${action}d successfully`, 
                    'success'
                );
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            manager.showNotification(`Failed to ${action} PO items: ${error.message}`, 'error');
        });
    }
};

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.purchasingInventoryManager) {
            window.purchasingInventoryManager.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}