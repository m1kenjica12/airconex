

class PickListManager {
    constructor() {
        this.pickListData = [];
        this.selectedDate = null;
        this.init();
    }

    async init() {
        this.setDefaultDate();
        this.setupEventListeners();
        this.updateStatus('Ready to load pick list');
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('installationDate');
        if (dateInput) {
            dateInput.value = today;
            this.selectedDate = today;
        }
    }

    setupEventListeners() {
        const dateInput = document.getElementById('installationDate');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
            });
        }
    }

    showLoading(show = true) {
        const loadingContainer = document.getElementById('loadingContainer');
        const emptyPicklist = document.getElementById('emptyPicklist');
        const ordersContainer = document.getElementById('picklistOrdersContainer');
        
        if (show) {
            if (loadingContainer) loadingContainer.style.display = 'flex';
            if (emptyPicklist) emptyPicklist.style.display = 'none';
            if (ordersContainer) ordersContainer.style.display = 'none';
        } else {
            if (loadingContainer) loadingContainer.style.display = 'none';
        }
    }

    async loadPickList() {
        if (!this.selectedDate) {
            this.showNotification('Please select an installation date', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('Loading pick list for ' + this.selectedDate + '...');
            
            const response = await fetch(`api/warehouse_picklist_load_so.php?installation_date=${this.selectedDate}`);
            const result = await response.json();
            
            console.log('Pick List API Response:', result);
            
            if (result.success) {
                this.pickListData = result.data || [];
                
                if (this.pickListData.length > 0) {
                    this.renderPickList();
                    this.showNotification(`Loaded ${this.pickListData.length} items for ${this.selectedDate}`, 'success');
                    this.updateStatus(`Pick list loaded: ${this.pickListData.length} items for ${this.selectedDate}`);
                } else {
                    this.showEmptyState();
                    this.showNotification('No items found for selected date', 'info');
                    this.updateStatus('No pick list items found for selected date');
                }
            } else {
                throw new Error(result.message || 'Failed to load pick list');
            }
        } catch (error) {
            console.error('Error loading pick list:', error);
            this.showNotification('Failed to load pick list: ' + error.message, 'error');
            this.showEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    showEmptyState() {
        const emptyPicklist = document.getElementById('emptyPicklist');
        const ordersContainer = document.getElementById('picklistOrdersContainer');
        
        if (emptyPicklist) {
            emptyPicklist.style.display = 'flex';
            const dateDisplay = this.selectedDate ? 
                new Date(this.selectedDate).toLocaleDateString() : 'selected date';
            emptyPicklist.querySelector('h3').textContent = `No pick list available for ${dateDisplay}.`;
        }
        if (ordersContainer) ordersContainer.style.display = 'none';
    }

    renderPickList() {
        const emptyPicklist = document.getElementById('emptyPicklist');
        const ordersContainer = document.getElementById('picklistOrdersContainer');

        
        if (emptyPicklist) emptyPicklist.style.display = 'none';
        if (ordersContainer) ordersContainer.style.display = 'block';

        
        const orderGroups = this.groupByOrder(this.pickListData);
        
        
        const ordersHtml = Object.keys(orderGroups).map(soNumber => {
            const orderData = orderGroups[soNumber];
            return this.generateOrderSection(soNumber, orderData);
        }).join('');

        if (ordersContainer) {
            ordersContainer.innerHTML = ordersHtml;
        }
    }

    groupByOrder(data) {
        const groups = {};
        
        data.forEach(item => {
            const soNumber = item.so_number;
            if (!groups[soNumber]) {
                groups[soNumber] = {
                    client_name: item.client_name,
                    location: item.location,
                    installation_date: item.installation_date,
                    items: []
                };
            }
            groups[soNumber].items.push(item);
        });
        
        return groups;
    }

    generateOrderSection(soNumber, orderData) {
        const installationDate = new Date(orderData.installation_date).toLocaleDateString();
        
        const itemsHtml = orderData.items.map(item => {
            const isAssigned = item.assigned_serial && item.assigned_serial.trim() !== '';
            const pickedId = `picked_${item.id}`;
            
            return `
                <tr class="item-row">
                    <td class="unit-description">${item.unit_description || '-'}</td>
                    <td class="model">${item.model}</td>
                    <td class="serial">${item.assigned_serial || 'Not Assigned'}</td>
                    <td class="location">Loading Area</td>
                    <td class="picked-cell">
                        <input type="checkbox" 
                               class="picked-checkbox" 
                               id="${pickedId}"
                               ${item.picked ? 'checked' : ''}
                               ${!isAssigned ? 'disabled' : ''}
                               onchange="pickListManager.togglePicked('${item.id}', this.checked)">
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="order-section">
                <div class="order-header">
                    <div class="order-info">
                        <span class="order-client">Client: ${orderData.client_name}</span>
                        <span class="order-separator">|</span>
                        <span class="order-so">SO: ${soNumber}</span>
                    </div>
                    <div class="order-date">Installation Date: ${installationDate}</div>
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th class="col-unit-desc">Unit Description</th>
                            <th class="col-model">Model</th>
                            <th class="col-serial">Serial #</th>
                            <th class="col-location">Location</th>
                            <th class="col-picked">Picked</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="signature-section">
                    <div class="signature-row">
                        <div class="signature-field">
                            <label>Picked By</label>
                            <div class="signature-line"></div>
                        </div>
                        <div class="signature-field">
                            <label>Verified By</label>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    togglePicked(itemId, isPicked) {
     
        const item = this.pickListData.find(item => item.id === itemId);
        if (item) {
            item.picked = isPicked;
            
            
            console.log(`Item ${itemId} ${isPicked ? 'picked' : 'unpicked'}`);
        }
    }

    refreshPickList() {
        if (this.selectedDate) {
            this.showNotification('Refreshing pick list...', 'info');
            this.loadPickList();
        } else {
            this.showNotification('Please select a date first', 'warning');
        }
    }

    printPickList() {
        if (this.pickListData.length === 0) {
            this.showNotification('No pick list to print', 'warning');
            return;
        }

        this.showNotification('Preparing print...', 'info');
        setTimeout(() => {
            window.print();
        }, 500);
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status-text');
        if (statusElement) {
            statusElement.textContent = message;
        }

        const lastUpdatedElement = document.getElementById('lastUpdated');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
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

function loadPickList() {
    if (window.pickListManager) {
        window.pickListManager.loadPickList();
    }
}

function refreshPickList() {
    if (window.pickListManager) {
        window.pickListManager.refreshPickList();
    }
}

function printPickList() {
    if (window.pickListManager) {
        window.pickListManager.printPickList();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.pickListManager) {
            window.pickListManager.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.pickListManager = new PickListManager();
});