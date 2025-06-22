
class MaterialRequestForm {
    constructor() {
        this.availableMaterials = [];
        this.selectedMaterials = [];
        this.requestCounter = 1;
        this.init();
    }

    async init() {
        this.updateDateTime();
        this.updateStatus('Loading material data...');
        
        await this.loadAvailableMaterials();
        this.setupEventListeners();
        this.updateStats();
        this.updateStatus('Ready to create material request');
        
        // Set default dates
        this.setDefaultDates();
        
        // Initial render
        this.renderSelectedMaterials();
    }

    async loadAvailableMaterials() {
        try {
            const response = await fetch('api/warehouse_materials_inventory_load_materials.php');
            const data = await response.json();
            
            if (data.success) {
                
                this.availableMaterials = data.data.map(material => {
                    const availableQty = this.calculateAvailableQuantity(material);
                    return {
                        ...material,
                        calculated_available_qty: availableQty
                    };
                }).filter(material => material.calculated_available_qty > 0); 
                
                console.log('Available materials loaded:', this.availableMaterials);
                this.showNotification(`Loaded ${this.availableMaterials.length} available materials from database`, 'success');
            } else {
                console.error('Failed to load materials:', data.message);
                this.showNotification('Failed to load material data', 'error');
              
                this.loadSampleMaterials();
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            this.showNotification('Error loading material data - Loading sample data', 'warning');
            
            this.loadSampleMaterials();
        }
    }

    loadSampleMaterials() {
      
        this.availableMaterials = [
            {
                id: 1,
                category: 'MECHANICAL MATERIALS',
                description: 'PVC Pipe 4" Schedule 40',
                beg_inv_as_of_jan_5_2025: 100,
                uom: 'PCS',
                material_receipt: 50,
                material_issued: 30,
                material_returned: 5,
                scrap_in: 0,
                scrap_out: 2,
                reserved: 10,
                ending_inv: 123,
                jan: 5, feb: 8, mar: 6, apr: 4, may: 7, jun: 9, jul: 5, aug: 6, sep: 4, oct: 8, nov: 7, dec: 5,
                unit_cost: 25.50,
                amount: 3136.50,
                calculated_available_qty: 113
            },
            {
                id: 2,
                category: 'ELECTRICAL MATERIALS',
                description: 'Copper Wire 12 AWG THHN/THWN',
                beg_inv_as_of_jan_5_2025: 500,
                uom: 'FEET',
                material_receipt: 200,
                material_issued: 150,
                material_returned: 20,
                scrap_in: 0,
                scrap_out: 10,
                reserved: 50,
                ending_inv: 560,
                jan: 15, feb: 20, mar: 18, apr: 12, may: 16, jun: 22, jul: 19, aug: 17, sep: 14, oct: 21, nov: 18, dec: 16,
                unit_cost: 1.25,
                amount: 700.00,
                calculated_available_qty: 510
            },
            {
                id: 3,
                category: 'PLUMBING MATERIALS',
                description: 'Copper Fitting 1/2" Elbow',
                beg_inv_as_of_jan_5_2025: 75,
                uom: 'PCS',
                material_receipt: 25,
                material_issued: 20,
                material_returned: 5,
                scrap_in: 0,
                scrap_out: 1,
                reserved: 5,
                ending_inv: 84,
                jan: 2, feb: 3, mar: 2, apr: 1, may: 2, jun: 4, jul: 3, aug: 2, sep: 1, oct: 3, nov: 2, dec: 2,
                unit_cost: 3.75,
                amount: 315.00,
                calculated_available_qty: 79
            },
            {
                id: 4,
                category: 'MECHANICAL MATERIALS',
                description: 'Galvanized Steel Pipe 2" Schedule 40',
                beg_inv_as_of_jan_5_2025: 80,
                uom: 'PCS',
                material_receipt: 30,
                material_issued: 25,
                material_returned: 3,
                scrap_in: 0,
                scrap_out: 2,
                reserved: 8,
                ending_inv: 86,
                jan: 3, feb: 4, mar: 3, apr: 2, may: 3, jun: 5, jul: 4, aug: 3, sep: 2, oct: 4, nov: 3, dec: 3,
                unit_cost: 45.00,
                amount: 3870.00,
                calculated_available_qty: 78
            },
            {
                id: 5,
                category: 'ELECTRICAL MATERIALS',
                description: 'Electrical Conduit 3/4" EMT',
                beg_inv_as_of_jan_5_2025: 120,
                uom: 'PCS',
                material_receipt: 40,
                material_issued: 35,
                material_returned: 5,
                scrap_in: 0,
                scrap_out: 3,
                reserved: 15,
                ending_inv: 127,
                jan: 4, feb: 6, mar: 5, apr: 3, may: 4, jun: 7, jul: 6, aug: 5, sep: 3, oct: 6, nov: 5, dec: 4,
                unit_cost: 8.25,
                amount: 1047.75,
                calculated_available_qty: 112
            },
            {
                id: 6,
                category: 'CONSUMABLES',
                description: 'PVC Pipe Cement 16oz',
                beg_inv_as_of_jan_5_2025: 24,
                uom: 'CAN',
                material_receipt: 12,
                material_issued: 8,
                material_returned: 1,
                scrap_in: 0,
                scrap_out: 1,
                reserved: 3,
                ending_inv: 28,
                jan: 1, feb: 2, mar: 1, apr: 1, may: 1, jun: 2, jul: 2, aug: 1, sep: 1, oct: 2, nov: 1, dec: 1,
                unit_cost: 12.50,
                amount: 350.00,
                calculated_available_qty: 25
            },
            {
                id: 7,
                category: 'PLUMBING MATERIALS',
                description: 'Ball Valve 1" Brass',
                beg_inv_as_of_jan_5_2025: 15,
                uom: 'PCS',
                material_receipt: 8,
                material_issued: 5,
                material_returned: 1,
                scrap_in: 0,
                scrap_out: 0,
                reserved: 2,
                ending_inv: 19,
                jan: 1, feb: 1, mar: 1, apr: 0, may: 1, jun: 1, jul: 1, aug: 1, sep: 0, oct: 1, nov: 1, dec: 1,
                unit_cost: 85.00,
                amount: 1615.00,
                calculated_available_qty: 17
            },
            {
                id: 8,
                category: 'MECHANICAL MATERIALS',
                description: 'Insulation Pipe Wrap 2" x 6ft',
                beg_inv_as_of_jan_5_2025: 60,
                uom: 'PCS',
                material_receipt: 20,
                material_issued: 18,
                material_returned: 2,
                scrap_in: 0,
                scrap_out: 1,
                reserved: 8,
                ending_inv: 63,
                jan: 2, feb: 3, mar: 2, apr: 1, may: 2, jun: 3, jul: 3, aug: 2, sep: 1, oct: 3, nov: 2, dec: 2,
                unit_cost: 15.75,
                amount: 992.25,
                calculated_available_qty: 55
            }
        ];
        
        console.log('Sample materials loaded:', this.availableMaterials);
    }

    calculateAvailableQuantity(material) {
        const beginning = parseInt(material.beg_inv_as_of_jan_5_2025) || 0;
        const receipt = parseInt(material.material_receipt) || 0;
        const issued = parseInt(material.material_issued) || 0;
        const returned = parseInt(material.material_returned) || 0;
        const scrapIn = parseInt(material.scrap_in) || 0;
        const scrapOut = parseInt(material.scrap_out) || 0;
        const reserved = parseInt(material.reserved) || 0;

       
        const endingInv = beginning + receipt - issued + returned + scrapIn - scrapOut;
      
        return Math.max(0, endingInv - reserved);
    }

    setupEventListeners() {
     
        const form = document.getElementById('materialRequestForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitMaterialRequest();
            });
        }

       
        this.setupModalListeners();

        
        const modalSearchInput = document.getElementById('modalSearchInput');
        if (modalSearchInput) {
            modalSearchInput.addEventListener('input', () => {
                this.filterAvailableMaterials();
            });
        }
    }

    setupModalListeners() {
      
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
            });
        });

      
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setDefaultDates() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        document.getElementById('requestDate').value = today.toISOString().split('T')[0];
        document.getElementById('requiredDate').value = nextWeek.toISOString().split('T')[0];
    }

    openMaterialModal() {
        document.getElementById('materialModal').style.display = 'block';
        document.getElementById('modalSearchInput').value = '';
        this.renderAvailableMaterials();
    }

    closeMaterialModal() {
        document.getElementById('materialModal').style.display = 'none';
    }

    renderAvailableMaterials() {
        const tbody = document.getElementById('availableMaterialsBody');
        tbody.innerHTML = '';

        if (this.availableMaterials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">
                        No materials available
                    </td>
                </tr>
            `;
            return;
        }

        this.availableMaterials.forEach(material => {
            const available = material.calculated_available_qty || this.calculateAvailableQuantity(material);
            if (available > 0) {
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left; padding: 8px;">
                            <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                                ${material.description || 'No Description'}
                            </div>
                            <div style="font-size: 9px; color: #7f8c8d;">
                                Category: ${material.category || 'Uncategorized'}
                            </div>
                        </td>
                        <td style="text-align: center; font-weight: 600; color: #27ae60;">
                            ${this.formatNumber(available)}
                        </td>
                        <td style="text-align: center;">
                            ${material.uom || 'N/A'}
                        </td>
                        <td style="text-align: right; font-weight: 600;">
                            ₱${this.formatCurrency(material.unit_cost)}
                        </td>
                        <td style="text-align: center;">
                            <button class="btn-select" onclick="materialRequestForm.selectMaterial(${material.id})">
                                Select
                            </button>
                        </td>
                    </tr>
                `;
            }
        });
    }

    filterAvailableMaterials() {
        const searchTerm = document.getElementById('modalSearchInput').value.toLowerCase();
        const tbody = document.getElementById('availableMaterialsBody');
        
        const filteredMaterials = this.availableMaterials.filter(material => 
            material.description.toLowerCase().includes(searchTerm) ||
            material.category.toLowerCase().includes(searchTerm)
        );

        tbody.innerHTML = '';

        if (filteredMaterials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #7f8c8d;">
                        No materials found matching "${searchTerm}"
                    </td>
                </tr>
            `;
            return;
        }

        filteredMaterials.forEach(material => {
            const available = material.calculated_available_qty || this.calculateAvailableQuantity(material);
            if (available > 0) {
                tbody.innerHTML += `
                    <tr>
                        <td style="text-align: left; padding: 8px;">
                            <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                                ${material.description || 'No Description'}
                            </div>
                            <div style="font-size: 9px; color: #7f8c8d;">
                                Category: ${material.category || 'Uncategorized'}
                            </div>
                        </td>
                        <td style="text-align: center; font-weight: 600; color: #27ae60;">
                            ${this.formatNumber(available)}
                        </td>
                        <td style="text-align: center;">
                            ${material.uom || 'N/A'}
                        </td>
                        <td style="text-align: right; font-weight: 600;">
                            ₱${this.formatCurrency(material.unit_cost)}
                        </td>
                        <td style="text-align: center;">
                            <button class="btn-select" onclick="materialRequestForm.selectMaterial(${material.id})">
                                Select
                            </button>
                        </td>
                    </tr>
                `;
            }
        });
    }

    selectMaterial(materialId) {
        const material = this.availableMaterials.find(m => m.id === materialId);
        
        if (!material) {
            this.showNotification('Material not found', 'error');
            return;
        }

        if (this.selectedMaterials.find(m => m.id === materialId)) {
            this.showNotification('Material already selected', 'warning');
            return;
        }

        const availableQty = material.calculated_available_qty || this.calculateAvailableQuantity(material);
        
        const selectedMaterial = {
            id: material.id,
            category: material.category,
            description: material.description,
            available_qty: availableQty,
            uom: material.uom,
            requested_qty: 1,
            remarks: '',
            unit_cost: material.unit_cost,
           
            material_data: material
        };

        this.selectedMaterials.push(selectedMaterial);
        this.renderSelectedMaterials();
        this.closeMaterialModal();
        this.updateStats();
        this.showNotification(`Material "${material.description}" added to request`, 'success');
        this.updateStatus('Material added to request');
    }

    renderSelectedMaterials() {
        const tbody = document.getElementById('selectedMaterialsBody');
        tbody.innerHTML = '';

        if (this.selectedMaterials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px; color: #7f8c8d;">
                        <div style="font-size: 14px; margin-bottom: 8px;">📦 No materials selected</div>
                        <div style="font-size: 11px;">Click "Add Material" to select materials from inventory</div>
                    </td>
                </tr>
            `;
            return;
        }

        this.selectedMaterials.forEach((material, index) => {
            tbody.innerHTML += `
                <tr>
                    <td style="text-align: left; padding: 8px;">
                        <div style="font-weight: 600; color: #2c3e50; margin-bottom: 2px;">
                            ${material.description}
                        </div>
                        <div style="font-size: 9px; color: #7f8c8d;">
                            Category: ${material.category || 'Uncategorized'}
                        </div>
                    </td>
                    <td style="text-align: center; font-weight: 600; color: #27ae60;">
                        ${this.formatNumber(material.available_qty)}
                    </td>
                    <td style="text-align: center;">
                        ${material.uom}
                    </td>
                    <td style="text-align: center;">
                        <input type="number" 
                               min="1" 
                               max="${material.available_qty}" 
                               value="${material.requested_qty}" 
                               class="form-input qty-input"
                               style="width: 80px; text-align: center;"
                               onchange="materialRequestForm.updateRequestedQty(${index}, this.value)"
                               title="Available: ${material.available_qty}">
                    </td>
                    <td style="text-align: center;">
                        <input type="text" 
                               value="${material.remarks}" 
                               class="form-input"
                               style="min-width: 150px;"
                               onchange="materialRequestForm.updateRemarks(${index}, this.value)"
                               placeholder="Optional remarks">
                    </td>
                    <td style="text-align: center;">
                        <button class="btn-remove" 
                                onclick="materialRequestForm.removeMaterial(${index})"
                                title="Remove material">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    updateRequestedQty(index, qty) {
        const quantity = parseInt(qty) || 1;
        const material = this.selectedMaterials[index];
        
        if (quantity > material.available_qty) {
            this.showNotification(`Requested quantity (${quantity}) cannot exceed available quantity (${material.available_qty})`, 'warning');
            this.renderSelectedMaterials();
            return;
        }

        if (quantity < 1) {
            this.showNotification('Requested quantity must be at least 1', 'warning');
            this.renderSelectedMaterials();
            return;
        }

        this.selectedMaterials[index].requested_qty = quantity;
        this.updateStats();
        this.updateStatus('Quantity updated');
    }

    updateRemarks(index, remarks) {
        this.selectedMaterials[index].remarks = remarks;
        this.updateStatus('Remarks updated');
    }

    removeMaterial(index) {
        const material = this.selectedMaterials[index];
        this.selectedMaterials.splice(index, 1);
        this.renderSelectedMaterials();
        this.updateStats();
        this.showNotification(`Material "${material.description}" removed from request`, 'success');
        this.updateStatus('Material removed from request');
    }

    updateStats() {
        let totalItems = 0;
        let totalQuantity = 0;
        let estimatedTotal = 0;
        
        this.selectedMaterials.forEach(material => {
            totalItems++;
            const qty = parseInt(material.requested_qty) || 0;
            totalQuantity += qty;
            estimatedTotal += qty * (parseFloat(material.unit_cost) || 0);
        });
        
  
        const totalItemsElement = document.getElementById('totalItems');
        if (totalItemsElement) {
            totalItemsElement.innerHTML = `
                Total Items: <strong>${totalItems}</strong> | 
                Total Quantity: <strong>${totalQuantity}</strong> | 
                Est. Value: <strong>₱${this.formatCurrency(estimatedTotal)}</strong>
            `;
        }
    }

    formatNumber(value) {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        return Number(value).toLocaleString();
    }

    formatCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return '0.00';
        }
        return Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    async submitMaterialRequest() {
        try {
            this.updateStatus('Validating material request...');
            
            const formData = this.collectFormData();
            
            if (!this.validateFormData(formData)) {
                return;
            }
            
            this.updateStatus('Submitting material request...');
            
            const submitBtn = document.querySelector('.btn-primary');
            if (submitBtn) {
                const originalText = submitBtn.textContent;
                submitBtn.textContent = '⏳ Submitting...';
                submitBtn.disabled = true;
                
                try {
                  
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const requestNumber = `REQ-PE-${Date.now()}`;
                    
                    this.handleSubmissionSuccess({
                        request_number: requestNumber,
                        request_date: formData.requestDate,
                        total_items: formData.materials.length,
                        total_quantity: formData.materials.reduce((sum, m) => sum + m.requested_qty, 0)
                    });

                } catch (error) {
                    console.error('Submission error:', error);
                    this.showNotification('Failed to submit material request: ' + error.message, 'error');
                    this.updateStatus('Error submitting material request');
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showNotification('Failed to submit material request: ' + error.message, 'error');
            this.updateStatus('Error submitting material request');
        }
    }

    handleSubmissionSuccess(data) {
        document.getElementById('generatedRequestNumber').textContent = data.request_number;
        document.getElementById('requestDateDisplay').textContent = this.formatDate(data.request_date);
        document.getElementById('modalTotalItems').textContent = `${data.total_items} items (${data.total_quantity} total quantity)`;
        
        document.getElementById('successModal').style.display = 'block';
        
        this.showNotification(`Material request ${data.request_number} created successfully!`, 'success');
        this.updateStatus(`Material request ${data.request_number} submitted successfully`);
        
        const lastSavedElement = document.getElementById('lastSaved');
        if (lastSavedElement) {
            lastSavedElement.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
        }
    }

    collectFormData() {
        const data = {
            clientName: document.getElementById('clientName').value.trim(),
            projectName: document.getElementById('projectName').value.trim(),
            requestDate: document.getElementById('requestDate').value,
            requiredDate: document.getElementById('requiredDate').value,
            materials: []
        };
        
        this.selectedMaterials.forEach(material => {
            if (material.requested_qty > 0) {
                data.materials.push({
                    id: material.id,
                    category: material.category,
                    description: material.description,
                    uom: material.uom,
                    available_qty: material.available_qty,
                    requested_qty: material.requested_qty,
                    remarks: material.remarks,
                    unit_cost: material.unit_cost,
                    estimated_total: material.requested_qty * (material.unit_cost || 0)
                });
            }
        });
        
        return data;
    }

    validateFormData(data) {
        if (!data.clientName) {
            this.showNotification('Please enter client name', 'error');
            document.getElementById('clientName').focus();
            return false;
        }
        
        if (!data.requestDate) {
            this.showNotification('Please select a request date', 'error');
            document.getElementById('requestDate').focus();
            return false;
        }
        
        if (data.materials.length === 0) {
            this.showNotification('Please add at least one material to the request', 'error');
            return false;
        }
        
    
        for (let i = 0; i < data.materials.length; i++) {
            const material = data.materials[i];
            if (material.requested_qty <= 0) {
                this.showNotification(`Invalid quantity for "${material.description}"`, 'error');
                return false;
            }
            if (material.requested_qty > material.available_qty) {
                this.showNotification(`Requested quantity for "${material.description}" exceeds available quantity`, 'error');
                return false;
            }
        }
        
        return true;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    clearForm() {
        if (confirm('Are you sure you want to clear the form? All data will be lost.')) {
            document.getElementById('clientName').value = '';
            document.getElementById('projectName').value = '';
            this.setDefaultDates();
            
            this.selectedMaterials = [];
            this.renderSelectedMaterials();
            this.updateStats();
            
            this.showNotification('Form cleared', 'success');
            this.updateStatus('Form cleared - ready for new material request');
        }
    }

    closeSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
    }

    createNewRequest() {
        this.closeSuccessModal();
        this.clearForm();
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
                backgroundColor = '#4caf50';
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
        
        const duration = type === 'success' ? 5000 : 4000;
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


function openMaterialModal() {
    if (window.materialRequestForm) {
        window.materialRequestForm.openMaterialModal();
    }
}

function closeMaterialModal() {
    if (window.materialRequestForm) {
        window.materialRequestForm.closeMaterialModal();
    }
}

function closeSuccessModal() {
    if (window.materialRequestForm) {
        window.materialRequestForm.closeSuccessModal();
    }
}

function createNewRequest() {
    if (window.materialRequestForm) {
        window.materialRequestForm.createNewRequest();
    }
}

function clearForm() {
    if (window.materialRequestForm) {
        window.materialRequestForm.clearForm();
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.materialRequestForm) {
            window.materialRequestForm.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.materialRequestForm = new MaterialRequestForm();
});