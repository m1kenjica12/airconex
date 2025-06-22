

class DeliveryReceiptManager {
    constructor() {
        this.receiptData = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateStatus('Ready to generate delivery receipt');
        this.setCurrentDate();
    }

    setupEventListeners() {
        const soInput = document.getElementById('soNumber');
        if (soInput) {
            soInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadReceipt();
                }
            });
        }
    }

    setCurrentDate() {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const dateElement = document.getElementById('drDate');
        if (dateElement) {
            dateElement.textContent = dateStr;
        }
    }

    showLoading(show = true) {
        const loadingContainer = document.getElementById('loadingContainer');
        const emptyDR = document.getElementById('emptyDR');
        const formContainer = document.getElementById('drFormContainer');
        
        if (show) {
            if (loadingContainer) loadingContainer.style.display = 'flex';
            if (emptyDR) emptyDR.style.display = 'none';
            if (formContainer) formContainer.style.display = 'none';
        } else {
            if (loadingContainer) loadingContainer.style.display = 'none';
        }
    }

    async loadReceipt() {
        const soNumber = document.getElementById('soNumber').value.trim();
        
        if (!soNumber) {
            this.showNotification('Please enter an SO number', 'warning');
            return;
        }

        try {
            this.showLoading(true);
            this.updateStatus('Loading delivery receipt for ' + soNumber + '...');
            
            const response = await fetch(`api/warehouse_delivery_receipt_units_load_so.php?so_number=${encodeURIComponent(soNumber)}`);
            const result = await response.json();
            
            console.log('Delivery Receipt API Response:', result);
            
            if (result.success) {
                this.receiptData = result.data;
                this.renderReceipt();
                
        
                await this.updateInventorySchedule(soNumber);
                
                this.showNotification(`✅ Delivery receipt loaded for ${soNumber}`, 'success');
                this.updateStatus(`Delivery receipt ready for ${soNumber}`);
            } else {
                throw new Error(result.message || 'Failed to load delivery receipt');
            }
        } catch (error) {
            console.error('Error loading delivery receipt:', error);
            this.showNotification('❌ Failed to load delivery receipt: ' + error.message, 'error');
            this.showEmptyState();
        } finally {
            this.showLoading(false);
        }
    }

    async updateInventorySchedule(soNumber) {
        try {
            this.updateStatus('Updating inventory for schedule...');
            
            const response = await fetch('api/warehouse_update_schedule_from_dr.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ so_number: soNumber })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`✅ Updated ${result.updated_count} products for schedule`, 'success');
            } else {
                throw new Error(result.error || 'Failed to update schedule');
            }
        } catch (error) {
            console.error('Error updating schedule:', error);
            this.showNotification('⚠️ Failed to update inventory schedule', 'warning');
        }
    }

    showEmptyState() {
        const emptyDR = document.getElementById('emptyDR');
        const formContainer = document.getElementById('drFormContainer');
        
        if (emptyDR) emptyDR.style.display = 'flex';
        if (formContainer) formContainer.style.display = 'none';
    }

    renderReceipt() {
        const emptyDR = document.getElementById('emptyDR');
        const formContainer = document.getElementById('drFormContainer');

     
        if (emptyDR) emptyDR.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';

    
        this.populateReceiptData();

       
        this.renderItems();
    }

    populateReceiptData() {
        if (!this.receiptData) return;

        const fullAddress = this.receiptData.address && this.receiptData.city_province 
            ? `${this.receiptData.address}, ${this.receiptData.city_province}`
            : this.receiptData.address || this.receiptData.city_province || '';

     
        const fields = {
            'drNumber': this.receiptData.dr_number || 'DR#25-T-00001',
            'drDate': this.receiptData.date || 'June 17, 2025',
            'drSONumber': this.receiptData.so_number || '#REF!',
            'drClientName': this.receiptData.client_name || '#REF!',
            'drAddress': fullAddress,
            'drContact': this.receiptData.contact_number || '',
            'drScope': this.receiptData.scope_of_work || ''
        };

        Object.keys(fields).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = fields[id];
            }
        });
    }
 

    renderItems() {
        const itemsBody = document.getElementById('drItemsBody');
        if (!itemsBody || !this.receiptData || !this.receiptData.items) return;

       
        itemsBody.innerHTML = '';

      
        this.receiptData.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item-row';
            row.innerHTML = `
                <td class="item-number">${index + 1}</td>
                <td class="item-description">${item.description || 'Item Description'}</td>
                <td class="item-serial">${item.assigned_serial || 'Not Assigned'}</td>
                <td class="item-qty">${item.quantity || '1'}PC</td>
            `;
            itemsBody.appendChild(row);
        });

      
        const remainingRows = Math.max(0, 10 - this.receiptData.items.length);
        for (let i = 0; i < remainingRows; i++) {
            const row = document.createElement('tr');
            row.className = 'item-row empty-row';
            row.innerHTML = `
                <td class="item-number"></td>
                <td class="item-description"></td>
                <td class="item-serial"></td>
                <td class="item-qty"></td>
            `;
            itemsBody.appendChild(row);
        }
    }

    printReceipt() {
        if (!this.receiptData) {
            this.showNotification('No delivery receipt to print', 'warning');
            return;
        }

        this.showNotification('Preparing delivery receipt for print...', 'info');
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


function loadReceipt() {
    if (window.deliveryReceiptManager) {
        window.deliveryReceiptManager.loadReceipt();
    }
}

function printReceipt() {
    if (window.deliveryReceiptManager) {
        window.deliveryReceiptManager.printReceipt();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.deliveryReceiptManager) {
            window.deliveryReceiptManager.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.deliveryReceiptManager = new DeliveryReceiptManager();
});