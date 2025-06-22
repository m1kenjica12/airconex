

class WarehouseReceiving {
    constructor() {
        this.purchaseOrders = [];
        this.selectedPO = null;
        this.receivingItems = [];
        this.init();
    }

    async init() {
        this.updateDateTime();
        await this.loadPurchaseOrders();
        this.setupEventListeners();
        this.updateStatus('Ready to receive purchase order items');
    }

    async loadPurchaseOrders() {
        try {
            this.updateStatus('Loading purchase orders...');
            
            const response = await fetch('api/warehouse_receiving_load_po.php');
            const result = await response.json();
            
            console.log('Purchase Orders Response:', result);
            
            if (result.success) {
                this.purchaseOrders = result.data;
                this.populatePODropdown();
                this.showNotification(`Loaded ${this.purchaseOrders.length} purchase orders`, 'success');
                this.updateStatus('Purchase orders loaded successfully');
            } else {
                throw new Error(result.message || 'Failed to load purchase orders');
            }
        } catch (error) {
            console.error('Error loading purchase orders:', error);
            this.showNotification('Failed to load purchase orders: ' + error.message, 'error');
            this.updateStatus('Error loading purchase orders');
        }
    }

    populatePODropdown() {
        const poSelect = document.getElementById('poSelection');
        if (!poSelect) return;

        poSelect.innerHTML = '<option value="">Select Purchase Order</option>';
        
        this.purchaseOrders.forEach(po => {
            const option = document.createElement('option');
            option.value = po.po_number;
            option.textContent = `${po.po_number} - ${po.supplier} (${po.items.length} items)`;
            poSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        const poSelect = document.getElementById('poSelection');
        if (poSelect) {
            poSelect.addEventListener('change', (e) => this.handlePOSelection(e.target.value));
        }

        const receivingForm = document.getElementById('receivingForm');
        if (receivingForm) {
            receivingForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

      
        const drDateInput = document.getElementById('drDate');
        if (drDateInput) {
            drDateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    handlePOSelection(poNumber) {
        if (!poNumber) {
            this.clearPODetails();
            return;
        }

        this.selectedPO = this.purchaseOrders.find(po => po.po_number === poNumber);
        if (this.selectedPO) {
            this.populatePODetails();
            this.generateItemsTable();
            this.showItemsSection();
        }
    }

    populatePODetails() {
        if (!this.selectedPO) return;

        document.getElementById('poNumber').value = this.selectedPO.po_number;
        document.getElementById('supplier').value = this.selectedPO.supplier;
        
        this.updateStatus(`Selected PO: ${this.selectedPO.po_number} with ${this.selectedPO.items.length} items`);
    }

    generateItemsTable() {
        const tbody = document.getElementById('itemsSerialBody');
        if (!tbody || !this.selectedPO) return;

        tbody.innerHTML = '';
        this.receivingItems = [];

        this.selectedPO.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'item-row incomplete';
            row.dataset.itemIndex = index;

          
            const unitDesc = `${item.unit_description} (Unit ${item.unit_number} of ${item.total_quantity})`;

            row.innerHTML = `
                <td class="col-unit-desc item-unit-desc">${unitDesc}</td>
                <td class="col-indoor-model item-model-display indoor-model-display">
                    ${item.indoor_model || '-'}
                </td>
                <td class="col-indoor-serial">
                    <input type="text" 
                           class="serial-input indoor-serial" 
                           data-item-index="${index}"
                           data-serial-type="indoor"
                           placeholder="Indoor Serial" 
                           required>
                </td>
                <td class="col-outdoor-model item-model-display outdoor-model-display">
                    ${item.outdoor_model || '-'}
                </td>
                <td class="col-outdoor-serial">
                    <input type="text" 
                           class="serial-input outdoor-serial" 
                           data-item-index="${index}"
                           data-serial-type="outdoor"
                           placeholder="Outdoor Serial" 
                           required>
                </td>
            `;

            tbody.appendChild(row);

          
            this.receivingItems.push({
                item_id: item.item_id,
                unit_number: item.unit_number,
                total_quantity: item.total_quantity,
                unit_description: item.unit_description,
                indoor_model: item.indoor_model,
                outdoor_model: item.outdoor_model,
                indoor_serial: '',
                outdoor_serial: '',
                completed: false
            });
        });

      
        this.setupSerialInputListeners();
    }

    setupSerialInputListeners() {
        const serialInputs = document.querySelectorAll('.serial-input');
        
        serialInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const itemIndex = parseInt(e.target.dataset.itemIndex);
                const serialType = e.target.dataset.serialType;
                const value = e.target.value.trim();

                if (this.receivingItems[itemIndex]) {
                    this.receivingItems[itemIndex][`${serialType}_serial`] = value;
                    this.updateRowStatus(itemIndex);
                }
            });

            input.addEventListener('blur', (e) => {
                const value = e.target.value.trim().toUpperCase();
                e.target.value = value;
            });
        });
    }

    updateRowStatus(itemIndex) {
        const item = this.receivingItems[itemIndex];
        const row = document.querySelector(`tr[data-item-index="${itemIndex}"]`);
        
        if (!item || !row) return;

        const hasIndoorSerial = item.indoor_serial && item.indoor_serial.length > 0;
        const hasOutdoorSerial = item.outdoor_serial && item.outdoor_serial.length > 0;
        
        item.completed = hasIndoorSerial && hasOutdoorSerial;

        if (item.completed) {
            row.className = 'item-row completed';
        } else {
            row.className = 'item-row incomplete';
        }
    }

    showItemsSection() {
        const itemsSection = document.getElementById('itemsSection');
        if (itemsSection) {
            itemsSection.style.display = 'block';
        }
    }

    clearPODetails() {
        document.getElementById('poNumber').value = '';
        document.getElementById('supplier').value = '';
        
        const itemsSection = document.getElementById('itemsSection');
        if (itemsSection) {
            itemsSection.style.display = 'none';
        }

        this.selectedPO = null;
        this.receivingItems = [];
        this.updateStatus('Ready to receive purchase order items');
    }

    async handleSubmit(e) {
        e.preventDefault();

        try {
            if (!this.validateForm()) {
                return;
            }

            this.updateStatus('Submitting receiving data...');
            
            const submitData = {
                poNumber: document.getElementById('poNumber').value,
                drNumber: document.getElementById('drNumber').value,
                drDate: document.getElementById('drDate').value,
                items: this.receivingItems.map(item => ({
                    item_id: item.item_id,
                    unitDescription: item.unit_description,
                    indoorModel: item.indoor_model,
                    outdoorModel: item.outdoor_model,
                    indoorSerial: item.indoor_serial,
                    outdoorSerial: item.outdoor_serial
                }))
            };

            console.log('Submitting data:', submitData);

            const response = await fetch('api/warehouse_receiving_submit.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submitData)
            });

            const result = await response.json();
            console.log('Submit response:', result);

            if (result.success) {
                this.showSuccessModal(result.data);
                this.updateStatus('Items received successfully');
                this.updateLastSaved();
            } else {
                throw new Error(result.message || 'Failed to submit receiving data');
            }

        } catch (error) {
            console.error('Submit error:', error);
            this.showNotification('Failed to submit: ' + error.message, 'error');
            this.updateStatus('Error submitting receiving data');
        }
    }

    validateForm() {
        const drNumber = document.getElementById('drNumber').value.trim();
        const drDate = document.getElementById('drDate').value;

        if (!drNumber) {
            this.showNotification('DR Number is required', 'error');
            return false;
        }

        if (!drDate) {
            this.showNotification('DR Date is required', 'error');
            return false;
        }

        if (!this.selectedPO) {
            this.showNotification('Please select a Purchase Order', 'error');
            return false;
        }

        const incompleteItems = this.receivingItems.filter(item => !item.completed);
        if (incompleteItems.length > 0) {
            this.showNotification(`Please complete ${incompleteItems.length} remaining items`, 'error');
            return false;
        }

        return true;
    }

    showSuccessModal(data) {
        const modal = document.getElementById('successModal');
        const summary = document.getElementById('receivingSummary');
        
        if (!modal || !summary) return;

        summary.innerHTML = `
            <div class="summary-item">
                <strong>PO Number:</strong> ${data.po_number}
            </div>
            <div class="summary-item">
                <strong>DR Number:</strong> ${data.dr_number}
            </div>
            <div class="summary-item">
                <strong>DR Date:</strong> ${data.dr_date}
            </div>
            <div class="summary-item">
                <strong>Total Items Received:</strong> ${data.total_items}
            </div>
            <div class="summary-item">
                <strong>Items Detail:</strong>
                ${data.received_items.map(item => 
                    `<div style="margin-left: 10px; margin-top: 5px; font-size: 10px;">
                        ${item.unit_description}<br>
                        Indoor: ${item.indoor_serial} | Outdoor: ${item.outdoor_serial}
                    </div>`
                ).join('')}
            </div>
        `;

        modal.style.display = 'block';
    }

    clearForm() {
        document.getElementById('receivingForm').reset();
        document.getElementById('poSelection').value = '';
        document.getElementById('drDate').value = new Date().toISOString().split('T')[0];
        this.clearPODetails();
        this.showNotification('Form cleared', 'info');
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
    }

    updateStatus(message) {
        const statusElement = document.getElementById('status-text');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    updateLastSaved() {
        const lastSavedElement = document.getElementById('lastSaved');
        if (lastSavedElement) {
            const now = new Date();
            lastSavedElement.textContent = `Last saved: ${now.toLocaleTimeString()}`;
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


function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function receiveAnother() {
    closeSuccessModal();
    if (window.warehouseReceiving) {
        window.warehouseReceiving.clearForm();
    }
}

function clearForm() {
    if (window.warehouseReceiving) {
        window.warehouseReceiving.clearForm();
    }
}

function goBack() {
    window.location.href = 'warehouse_units_inventory.html';
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        window.location.href = 'index.html';
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.warehouseReceiving = new WarehouseReceiving();
});