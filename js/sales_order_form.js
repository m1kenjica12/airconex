
class ExcelOrderForm {
    constructor() {
        this.form = document.getElementById('excelForm');
        this.productRowCount = 1;
        this.maxProducts = 20;
        this.products = []; // Store all products data
        this.brands = []; // Store unique brands
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.updateDateTime();
        this.updateFieldCount();
        this.updateProductCount();
        
     
        await this.loadProductsData();
        

        this.form.addEventListener('input', () => this.updateFieldCount());
    }



    async loadProductsData() {
        try {
    
            const response = await fetch('api/sales_order_form_load_dropdown.php?action=all');
            const result = await response.json();
            
            if (result.success) {
                this.products = result.data;
                this.brands = [...new Set(result.data.map(p => p.brand))].sort();
                this.populateInitialSelects();
                this.showNotification('Product data loaded successfully (in-stock items only)', 'success');
            } else {
                throw new Error(result.message || 'Failed to load products');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showNotification('Failed to load product data', 'error');
         
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
       
        this.brands = ['Carrier', 'Daikin', 'Mitsubishi', 'LG', 'Samsung', 'Panasonic', 'York', 'Trane'];
        this.populateInitialSelects();
    }

    populateInitialSelects() {
      
        const firstBrandSelect = document.querySelector('select[name="products[1][brand]"]');
        if (firstBrandSelect) {
            this.populateBrandSelect(firstBrandSelect);
            
   
            firstBrandSelect.addEventListener('change', (e) => {
                const unitSelect = e.target.closest('tr').querySelector('select[name*="[unit_description]"]');
                this.populateUnitSelect(unitSelect, e.target.value);
            });
        }

       
        const firstUnitSelect = document.querySelector('select[name="products[1][unit_description]"]');
        if (firstUnitSelect) {
            this.populateUnitSelect(firstUnitSelect, '');
        }
    }

    populateBrandSelect(selectElement) {
     
        selectElement.innerHTML = '<option value="">Select a brand</option>';
        
      
        this.brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            selectElement.appendChild(option);
        });
    }


    populateUnitSelect(selectElement, selectedBrand = '') {
       
        selectElement.innerHTML = '<option value="">Select a unit</option>';
        
      
        let filteredProducts = this.products;
        if (selectedBrand) {
            filteredProducts = this.products.filter(p => p.brand === selectedBrand);
        }
        
       
        filteredProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.unit_description;
            
          
            let displayText = product.unit_description;
            if (product.model) {
                displayText += ` (${product.model})`;
            }
            if (product.horsepower) {
                displayText += ` - ${product.horsepower}HP`;
            }
            if (product.stocks !== null) {
                displayText += ` [Stock: ${product.stocks}]`;
            }
            
            option.textContent = displayText;
            
           
            option.setAttribute('data-product-id', product.id);
            option.setAttribute('data-model', product.model || '');
            option.setAttribute('data-horsepower', product.horsepower || '');
            option.setAttribute('data-unit-type', product.unit_type || '');
            option.setAttribute('data-stocks', product.stocks || '0');
            option.setAttribute('data-series', product.series || '');
            
            selectElement.appendChild(option);
        });
    }

    setupEventListeners() {
    
        const installationDateInput = document.getElementById('installationDate');
        const monthInput = document.getElementById('monthInput');
        
        if (installationDateInput && monthInput) {
            installationDateInput.addEventListener('change', function() {
                if (this.value) {
                    const date = new Date(this.value);
                    const months = [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                    ];
                    monthInput.value = `${months[date.getMonth()]} ${date.getFullYear()}`;
                } else {
                    monthInput.value = '';
                }
            });
        }

   
        const storeSelect = document.querySelector('select[name="store"]');
        const storeCodeInput = document.querySelector('input[name="store_code"]');
        
        if (storeSelect && storeCodeInput) {
            storeSelect.addEventListener('change', function() {
                const storeCodes = {
                    'API': '6',
                    'API 2 TUGUE': '8',
                    'TAS 1': '1',
                    'TAS 2': '2',
                    'TAS 3': '3',
                    'TAS 4': '4',
                    'TAS 5': '5'
                };
                storeCodeInput.value = storeCodes[this.value] || '';
            });
        }

      
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });

       
        this.checkUrlParameters();
    }

    async handleFormSubmission() {
        
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        let firstErrorField = null;

        requiredFields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
                if (!firstErrorField) {
                    firstErrorField = field;
                }
            }
        });

        if (!isValid) {
            if (firstErrorField) {
                firstErrorField.focus();
            }
            this.updateStatus('Please fill in all required fields');
            this.showNotification('Please complete all required fields', 'error');
            return;
        }

     
        this.updateStatus('Submitting order...');
        
        const submitButton = this.form.querySelector('button[type="submit"]') || 
                           document.querySelector('.btn-submit') ||
                           document.querySelector('button.btn-submit');
        
        if (!submitButton) {
            console.error('Submit button not found');
            this.showNotification('Submit button not found', 'error');
            return;
        }
        
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';
        submitButton.disabled = true;

        try {
        
            const formData = new FormData(this.form);
            
         
            const response = await fetch('api/sales_order_form_submit.php', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.showNotification(
                    `✓ Sales Order Created Successfully! SO Number: ${result.so_number}`, 
                    'success'
                );
                
                this.updateStatus(`Order created: ${result.so_number}`);
                
                setTimeout(() => {
                    this.clearFormAfterSuccess();
                    this.showNotification('Form cleared. Ready for new order.', 'success');
                }, 2000);
                
            } else {
                throw new Error(result.message || 'Failed to create order');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            this.updateStatus('Submission failed');
        } finally {
            if (submitButton) {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            }
        }
    }

    clearFormAfterSuccess() {
        this.form.reset();
        
        const tbody = document.getElementById('productTableBody');
        const rows = tbody.querySelectorAll('tr[data-row]');
        
        for (let i = 1; i < rows.length; i++) {
            rows[i].remove();
        }
        
        this.productRowCount = 1;
        this.updateProductCount();
        this.updateFieldCount();
        this.updateStatus('Ready for new order');
        
        const fields = this.form.querySelectorAll('input, select, textarea');
        fields.forEach(field => {
            this.clearFieldError(field);
        });
        
       
        this.populateInitialSelects();
        
        const firstField = this.form.querySelector('select[name="store"]');
        if (firstField) {
            firstField.focus();
        }
    }

    checkUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('success')) {
            const message = decodeURIComponent(urlParams.get('success'));
            this.showNotification(message, 'success');
            this.updateStatus('Order created successfully');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (urlParams.has('error')) {
            const message = decodeURIComponent(urlParams.get('error'));
            this.showNotification(message, 'error');
            this.updateStatus('Submission failed');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    addProductRow() {
        if (this.productRowCount >= this.maxProducts) {
            this.showNotification(`Maximum ${this.maxProducts} products allowed`, 'warning');
            return;
        }

        this.productRowCount++;
        const tbody = document.getElementById('productTableBody');
        
        const newRow = document.createElement('tr');
        newRow.className = 'product-row';
        newRow.setAttribute('data-row', this.productRowCount);
        
        newRow.innerHTML = `
            <td class="col-qty text-center">
                <input type="number" name="products[${this.productRowCount}][quantity]" class="excel-input text-center" min="1" max="20" placeholder="1" value="1">
            </td>
            <td class="col-brand">
                <select name="products[${this.productRowCount}][brand]" class="excel-select">
                    <option value="">Select a brand</option>
                </select>
            </td>
            <td class="col-unit">
                <select name="products[${this.productRowCount}][unit_description]" class="excel-select">
                    <option value="">Select a unit</option>
                </select>
            </td>
        `;
        
        tbody.appendChild(newRow);
        
     
        const newBrandSelect = newRow.querySelector('select[name*="[brand]"]');
        const newUnitSelect = newRow.querySelector('select[name*="[unit_description]"]');
        
        this.populateBrandSelect(newBrandSelect);
        this.populateUnitSelect(newUnitSelect, '');
        
       
        newBrandSelect.addEventListener('change', (e) => {
            this.populateUnitSelect(newUnitSelect, e.target.value);
        });
        
        this.updateProductCount();
        this.updateFieldCount();
        
       
        const newInputs = newRow.querySelectorAll('input, select');
        newInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
            input.addEventListener('input', () => this.updateFieldCount());
        });

      
        const quantityInput = newRow.querySelector('input[type="number"]');
        if (quantityInput) {
            quantityInput.addEventListener('input', function() {
                if (this.value > 20) {
                    this.value = 20;
                }
                if (this.value < 1) {
                    this.value = 1;
                }
            });
        }
        
        this.showNotification('Product added successfully', 'success');
    }

    removeLastProductRow() {
        if (this.productRowCount <= 1) {
            this.showNotification('At least one product is required', 'warning');
            return;
        }

        const tbody = document.getElementById('productTableBody');
        const lastRow = tbody.querySelector(`tr[data-row="${this.productRowCount}"]`);
        
        if (lastRow) {
            lastRow.remove();
            this.productRowCount--;
            this.updateProductCount();
            this.updateFieldCount();
            this.showNotification('Product removed', 'info');
        }
    }

    updateProductCount() {
        const countElement = document.getElementById('productCount');
        if (countElement) {
            countElement.textContent = this.productRowCount;
        }
    }

    validateField(field) {
        if (field.hasAttribute('required') && !field.value.trim()) {
            this.showFieldError(field);
            return false;
        }
        this.clearFieldError(field);
        return true;
    }

    showFieldError(field) {
        field.classList.add('error');
        setTimeout(() => {
            this.clearFieldError(field);
        }, 2000);
    }

    clearFieldError(field) {
        field.classList.remove('error');
    }

    clearForm() {
        if (confirm('Clear all form data? This will reset all fields including product rows.')) {
            this.form.reset();
            
            const tbody = document.getElementById('productTableBody');
            const rows = tbody.querySelectorAll('tr[data-row]');
            
            for (let i = 1; i < rows.length; i++) {
                rows[i].remove();
            }
            
            this.productRowCount = 1;
            this.updateProductCount();
            this.updateFieldCount();
            this.updateStatus('Form cleared');
            this.showNotification('Form has been cleared', 'info');
            
       
            this.populateInitialSelects();
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
    }

    updateFieldCount() {
        const fields = this.form.querySelectorAll('input, select, textarea');
        let completed = 0;
        
        fields.forEach(field => {
            if (field.value && field.value.trim() !== '') {
                completed++;
            }
        });
        
        const countElement = document.getElementById('fieldCount');
        if (countElement) {
            countElement.textContent = `${completed} fields completed`;
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


function clearForm() {
    if (window.excelForm) {
        window.excelForm.clearForm();
    }
}

function addProductRow() {
    if (window.excelForm) {
        window.excelForm.addProductRow();
    }
}

function removeLastProductRow() {
    if (window.excelForm) {
        window.excelForm.removeLastProductRow();
    }
}


function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        const form = document.getElementById('excelForm');
        if (form) {
            const formData = new FormData(form);
            let hasData = false;
            
            for (let [key, value] of formData.entries()) {
                if (value && value.toString().trim() !== '') {
                    hasData = true;
                    break;
                }
            }
            
            if (hasData) {
                if (!confirm('You have unsaved changes. Are you sure you want to log out and lose your data?')) {
                    return;
                }
            }
        }
        
        if (window.excelForm) {
            window.excelForm.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.excelForm = new ExcelOrderForm();
});


window.addEventListener('beforeunload', (e) => {
    const form = document.getElementById('excelForm');
    if (form) {
        const formData = new FormData(form);
        let hasData = false;
        
        for (let [key, value] of formData.entries()) {
            if (value && value.toString().trim() !== '') {
                hasData = true;
                break;
            }
        }
        
        if (hasData) {
            e.preventDefault();
            e.returnValue = '';
        }
    }
});

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