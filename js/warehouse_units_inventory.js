


class InventoryManager {
    constructor() {
        this.allInventory = [];
        this.filteredInventory = [];
        this.unitTypes = [
            'WALL MOUNTED', 'FLOOR MOUNTED', 'CEILING SUSPENDED', 'CASSETTE TYPE', 
            'WINDOW TYPE', 'CEILING CONCEALED DUCTED', 'CEILING MOUNTED', 
            'CEILING CASSETTE', 'CEILING CONCEALED', 'DECORATIVE PANEL', 
            'PORTABLE', 'FLOOR STANDING', 'AIR CURTAIN', 'MULTI-SPLIT', 
            'AIR PURIFIER', '4-WAY CASSETTE', '360-CASSETTE', '1-WAY CASSETTE', 
            'FLOOR-CEILING TYPE', 'DUCTED TYPE', 'DUCTED SKY AIR FLOOR MOUNTED INVERTER'
        ];
        this.init();
    }
 async init() {
        this.updateDateTime();
        await this.loadInventoryData();
        this.setupEventListeners();
        this.updateStatus('Inventory loaded successfully');
    }

    showLoading(show = true) {
        const loadingContainer = document.getElementById('loadingContainer');
        const inventorySections = document.getElementById('inventorySections');
        
        if (show) {
            loadingContainer.style.display = 'flex';
            inventorySections.style.display = 'none';
        } else {
            loadingContainer.style.display = 'none';
            inventorySections.style.display = 'block';
        }
    }

    async loadInventoryData() {
        try {
            this.showLoading(true);
            this.updateStatus('Loading inventory data...');
            
            const response = await fetch('api/warehouse_inventory_load_units.php?page=1&limit=1000&sort=brand&order=ASC');
            const result = await response.json();
            
            console.log('Inventory API Response:', result);
            
            if (result.success) {
                this.allInventory = result.data.map(item => ({
                    ...item,
                    stocks: parseInt(item.stocks) || 0,
                    allocated: parseInt(item.allocated) || 0,
                    available: (parseInt(item.stocks) || 0) - (parseInt(item.allocated) || 0),
                    status: this.getStockStatus(item.stocks, item.allocated),
                    unit_type: (item.unit_type || 'UNKNOWN').toUpperCase()
                }));
                
                this.filteredInventory = [...this.allInventory];
                
                console.log(`Loaded ${this.allInventory.length} total products`);
                
                this.populateFilters();
                this.renderInventory();
                
                this.showNotification(`Loaded ${this.allInventory.length} products successfully`, 'success');
                this.updateStatus(`Loaded ${this.allInventory.length} products from inventory`);
            } else {
                throw new Error(result.message || 'Failed to load inventory');
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showNotification('Failed to load inventory data: ' + error.message, 'error');
            this.loadFallbackData();
        } finally {
            this.showLoading(false);
        }
    }

    loadFallbackData() {
        this.allInventory = [];
        this.filteredInventory = [];
        this.renderInventory();
    }

    getStockStatus(stock, allocated = 0) {
        const stockNum = parseInt(stock) || 0;
        if (stockNum === 0) return 'Unavailable';
        if (stockNum < 10) return 'Order Now';
        const allocatedNum = parseInt(allocated) || 0;
        const availableNum = stockNum - allocatedNum;
        
        if (availableNum <= 0) return 'Out of Stock';
        return 'Available';
    }

    populateFilters() {
     
        const brands = [...new Set(this.allInventory.map(item => item.brand).filter(Boolean))].sort();
        const brandFilter = document.getElementById('brandFilter');
        if (brandFilter) {
            brandFilter.innerHTML = '<option value="">All Brands</option>';
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandFilter.appendChild(option);
            });
        }

        const types = [...new Set(this.allInventory.map(item => item.unit_type).filter(Boolean))].sort();
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="">All Types</option>';
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeFilter.appendChild(option);
            });
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        }

        const brandFilter = document.getElementById('brandFilter');
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');

        if (brandFilter) brandFilter.addEventListener('change', () => this.applyFilters());
        if (typeFilter) typeFilter.addEventListener('change', () => this.applyFilters());
        if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());
    }

    applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const brandFilter = document.getElementById('brandFilter');
        const typeFilter = document.getElementById('typeFilter');
        const statusFilter = document.getElementById('statusFilter');

        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const brandValue = brandFilter ? brandFilter.value.trim() : '';
        const typeValue = typeFilter ? typeFilter.value.trim() : '';
        const statusValue = statusFilter ? statusFilter.value.trim() : '';

        this.filteredInventory = this.allInventory.filter(item => {
            const matchesSearch = !searchTerm || 
                (item.brand && item.brand.toLowerCase().includes(searchTerm)) ||
                (item.model && item.model.toLowerCase().includes(searchTerm)) ||
                (item.unit_type && item.unit_type.toLowerCase().includes(searchTerm)) ||
                (item.unit_description && item.unit_description.toLowerCase().includes(searchTerm)) ||
                (item.horsepower && item.horsepower.toString().toLowerCase().includes(searchTerm)) ||
                (item.series && item.series.toLowerCase().includes(searchTerm)) ||
                (item.indoor_model && item.indoor_model.toLowerCase().includes(searchTerm)) ||
                (item.outdoor_model && item.outdoor_model.toLowerCase().includes(searchTerm));

            const matchesBrand = !brandValue || (item.brand && item.brand === brandValue);
            const matchesType = !typeValue || (item.unit_type && item.unit_type === typeValue);
            const matchesStatus = !statusValue || (item.status && item.status === statusValue);

            return matchesSearch && matchesBrand && matchesType && matchesStatus;
        });

        this.renderInventory();
    }

    renderInventory() {
        const container = document.getElementById('inventorySections');
        if (!container) return;

        container.innerHTML = '';

        if (this.filteredInventory.length === 0) {
            container.innerHTML = `
                <div class="empty-section">
                    <h3>No inventory items found</h3>
                    <p>Try adjusting your search criteria or filters.</p>
                </div>
            `;
            return;
        }

        const groupedData = this.groupInventoryData();
        
     
        this.unitTypes.forEach(unitType => {
            if (groupedData[unitType] && Object.keys(groupedData[unitType]).length > 0) {
                this.renderUnitTypeSection(container, unitType, groupedData[unitType]);
            }
        });
    }

    groupInventoryData() {
        const grouped = {};

        this.filteredInventory.forEach(item => {
            const unitType = item.unit_type || 'UNKNOWN';
            const brand = item.brand || 'UNKNOWN';

            if (!grouped[unitType]) {
                grouped[unitType] = {};
            }
            if (!grouped[unitType][brand]) {
                grouped[unitType][brand] = [];
            }
            grouped[unitType][brand].push(item);
        });

        return grouped;
    }

    renderUnitTypeSection(container, unitType, brandsData) {
        const section = document.createElement('div');
        section.className = 'unit-type-section';

       
        const totalItems = Object.values(brandsData).reduce((sum, items) => sum + items.length, 0);

        section.innerHTML = `
            <div class="unit-type-header">
                ${unitType} (${totalItems} items)
            </div>
        `;

       
        Object.keys(brandsData).sort().forEach(brand => {
            this.renderBrandSection(section, brand, unitType, brandsData[brand]);
        });

       
        this.addSectionSummary(section, unitType, brandsData);

        container.appendChild(section);
    }

    renderBrandSection(parentSection, brand, unitType, items) {
        const brandSection = document.createElement('div');
        brandSection.className = 'brand-section';

        brandSection.innerHTML = `
            <div class="brand-header">
                ${brand} ${unitType}
            </div>
            ${this.generateBrandTable(items)}
        `;

        parentSection.appendChild(brandSection);
    }

    generateBrandTable(items) {
        const headerRow = `
            <tr>
                <th class="col-brand">BRAND</th>
                <th class="col-capacity">CAPACITY</th>
                <th class="col-type">TYPE</th>
                <th class="col-series">SERIES</th>
                <th class="col-model">MODEL NUMBER</th>
                <th class="col-status">STATUS</th>
                <th class="col-available">IN STOCK</th>
                <th class="col-allocated">ALLOCATED</th>
                <th class="col-schedule">FOR SCHEDULE</th>
                <th class="col-defective">DEFECTIVE UNITS</th>
                <th class="col-delivered">INSTALLED / DELIVERED</th>
            </tr>
        `;

        const dataRows = items.map(item => this.generateDataRow(item)).join('');
        const totalRow = this.generateTotalRow(items);

        return `
            <table class="excel-table">
                <thead>
                    ${headerRow}
                </thead>
                <tbody>
                    ${dataRows}
                    ${totalRow}
                </tbody>
            </table>
        `;
    }

    generateDataRow(item) {
        const modelDisplay = this.formatModelDisplay(item);
        const statusClass = this.getStatusClass(item.status);
        
        return `
            <tr>
                <td class="col-brand">${item.brand || '-'}</td>
                <td class="col-capacity">${item.horsepower || '-'}</td>
                <td class="col-type">${item.unit_type || '-'}</td>
                <td class="col-series">${item.series || '-'}</td>
                <td class="col-model model-cell">${modelDisplay}</td>
                <td class="col-status status-cell">
                    <span class="status-badge ${statusClass}">${item.status}</span>
                </td>
                <td class="col-available">${item.stocks || 0}</td>
                <td class="col-allocated">${item.allocated || 0}</td>
                <td class="col-schedule">${item.for_schedule || 0}</td>
                <td class="col-defective">${item.defective || 0}</td>
                <td class="col-delivered">${item.installed || 0}</td>
            </tr>
        `;
    }

    formatModelDisplay(item) {
        if (item.has_outdoor_unit === '1' && item.indoor_model && item.outdoor_model) {
            return `
                <div class="split-model">
                    <div class="indoor-model">${item.indoor_model}</div>
                    <div class="model-separator">|</div>
                    <div class="outdoor-model">${item.outdoor_model}</div>
                </div>
            `;
        } else {
            return item.model || item.indoor_model || '-';
        }
    }

    getStatusClass(status) {
        switch (status) {
            case 'Available':
                return 'status-available';
            case 'Order Now':
                return 'status-order-now';
            case 'Out of Stock':
            default:
                return 'status-out-of-stock';
        }
    }

    generateTotalRow(items) {
        const totalStock = items.reduce((sum, item) => sum + (parseInt(item.stocks) || 0), 0);
        const totalAllocated = items.reduce((sum, item) => sum + (parseInt(item.allocated) || 0), 0);
        const totalForSchedule = items.reduce((sum, item) => sum + (parseInt(item.for_schedule) || 0), 0);
        const totalDefective = items.reduce((sum, item) => sum + (parseInt(item.defective) || 0), 0);
        const totalInstalled = items.reduce((sum, item) => sum + (parseInt(item.installed) || 0), 0);
        
        return `
            <tr class="total-row">
                <td colspan="6"><strong>TOTAL UNITS</strong></td>
                <td><strong>${totalStock}</strong></td>
                <td><strong>${totalAllocated}</strong></td>
                <td><strong>${totalForSchedule}</strong></td>
                <td><strong>${totalDefective}</strong></td>
                <td><strong>${totalInstalled}</strong></td>
            </tr>
        `;
    }

    addSectionSummary(section, unitType, brandsData) {
        const allItems = Object.values(brandsData).flat();
        const totalStock = allItems.reduce((sum, item) => sum + (parseInt(item.stocks) || 0), 0);
        const totalAllocated = allItems.reduce((sum, item) => sum + (parseInt(item.allocated) || 0), 0);
        const totalForSchedule = allItems.reduce((sum, item) => sum + (parseInt(item.for_schedule) || 0), 0);
        const totalDefective = allItems.reduce((sum, item) => sum + (parseInt(item.defective) || 0), 0);
        const totalInstalled = allItems.reduce((sum, item) => sum + (parseInt(item.installed) || 0), 0);
        
        const summary = document.createElement('div');
        summary.className = 'section-summary';
        summary.innerHTML = `
            <strong>${unitType} TOTALS: Stock: ${totalStock} | Allocated: ${totalAllocated} | For Schedule: ${totalForSchedule} | Defective: ${totalDefective} | Installed: ${totalInstalled}</strong>
        `;
        
        section.appendChild(summary);
    }

    refreshInventory() {
        this.showNotification('Refreshing inventory...', 'info');
        this.loadInventoryData();
    }

    exportInventory() {
        try {
            const headers = ['Brand', 'Capacity', 'Type', 'Series', 'Model', 'Indoor Model', 'Outdoor Model', 'Stock Quantity', 'Allocated', 'Available', 'Status'];
            const csvContent = [
                headers.join(','),
                ...this.filteredInventory.map(item => [
                    `"${item.brand || ''}"`,
                    `"${item.horsepower || ''}"`,
                    `"${item.unit_type || ''}"`,
                    `"${item.series || ''}"`,
                    `"${item.model || ''}"`,
                    `"${item.indoor_model || ''}"`,
                    `"${item.outdoor_model || ''}"`,
                    `"${item.stocks || '0'}"`,
                    `"${item.allocated || '0'}"`,
                    `"${item.available || '0'}"`,
                    `"${item.status || ''}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `warehouse_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Inventory exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export inventory', 'error');
        }
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
        
        const duration = type === 'success' ? 3000 : 4000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.4s ease-out forwards';
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
                notification.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        });
    }
}


function searchInventory() {
    if (window.inventoryManager) {
        window.inventoryManager.applyFilters();
    }
}

function refreshInventory() {
    if (window.inventoryManager) {
        window.inventoryManager.refreshInventory();
    }
}

function exportInventory() {
    if (window.inventoryManager) {
        window.inventoryManager.exportInventory();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.inventoryManager) {
            window.inventoryManager.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.inventoryManager = new InventoryManager();
});