

class PurchaseOrderForm {
    constructor() {
        this.rowCounter = 1;
        this.productData = null;
        this.productHierarchy = null;
        this.init();
    }

    async init() {
        this.updateDateTime();
        this.updateStatus('Loading product data...');
        
 
        await this.loadProductData();
        
        this.setupEventListeners();
        this.updateStats();
        this.updateStatus('Ready to create purchase order');
        
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('poDate').value = today;
        
      
        this.populateInitialDropdowns();
    }

    async loadProductData() {
        try {
            this.updateStatus('Loading product data from database...');
            
            const response = await fetch('api/purchasing_order_form_load_dropdown.php', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
        
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
          
            const responseText = await response.text();
            
          
            if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
                console.error('Invalid JSON response:', responseText);
                throw new Error('Server returned invalid JSON response');
            }
            
           
            const result = JSON.parse(responseText);
            
            if (result.success) {
                this.productData = result.data;
                this.productHierarchy = result.data.hierarchy;
                
                console.log('Product data loaded successfully:', {
                    brands: result.data.brands.length,
                    horsepower: result.data.horsepower.length,
                    unitTypes: result.data.unit_types.length,
                    series: result.data.series.length,
                    products: result.data.products.length
                });
                
                this.showNotification(`Loaded ${result.data.products.length} products from database`, 'success');
            } else {
                throw new Error(result.message || 'Failed to load product data');
            }
        } catch (error) {
            console.error('Failed to load product data:', error);
            this.showNotification('Failed to load product data. Using sample data.', 'warning');
            
          
            this.loadSampleProductData();
        }
    }

    loadSampleProductData() {
      
        this.productData = {
            brands: ['AUX', 'GREE', 'MIDEA', 'CARRIER', 'DAIKIN', 'LG', 'SAMSUNG'],
            horsepower: ['0.5', '0.75', '1.0', '1.5', '2.0', '2.5', '3.0', '4.0', '5.0'],
            unit_types: ['WALL MOUNTED', 'CEILING CASSETTE', 'FLOOR STANDING', 'DUCTED'],
            series: ['F-SERIES', 'FAIRY', 'LOMO', 'CRYSTAL', 'INVERTER']
        };
        
        this.productHierarchy = {
            'AUX': {
                '1.0': {
                    'F-SERIES': {
                        'WALL MOUNTED': {
                            indoor_model: 'ASW09A2/FLDI',
                            outdoor_model: 'AS09A2/FLDI'
                        }
                    }
                }
            },
            'GREE': {
                '1.0': {
                    'FAIRY': {
                        'WALL MOUNTED': {
                            indoor_model: 'GWC09FAEYC',
                            outdoor_model: 'GRS09FAEYC'
                        }
                    }
                }
            }
        };
        
        console.log('Using sample product data');
    }

    populateInitialDropdowns() {
        if (!this.productData) return;
        

        const firstRow = document.querySelector('tr[data-row="1"]');
        if (firstRow) {
            const brandSelect = firstRow.querySelector('.brand-select');
            this.populateBrandSelect(brandSelect);
            
        
            const hpSelect = firstRow.querySelector('.hp-select');
            const seriesSelect = firstRow.querySelector('.series-select');
            const typeSelect = firstRow.querySelector('.type-select');
            const modelInput = firstRow.querySelector('.model-input');
            
            if (hpSelect) {
                hpSelect.disabled = true;
                this.clearSelect(hpSelect);
            }
            if (seriesSelect) {
                seriesSelect.disabled = true;
                this.clearSelect(seriesSelect);
            }
            if (typeSelect) {
                typeSelect.disabled = true;
                this.clearSelect(typeSelect);
            }
            if (modelInput) {
                modelInput.value = '';
            }
        }
    }

    populateBrandSelect(selectElement) {
        if (!this.productData || !selectElement) return;
        
     
        this.clearSelect(selectElement);
        
      
        this.productData.brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            selectElement.appendChild(option);
        });
        
    
        selectElement.disabled = false;
    }

    populateHorsepowerSelect(selectElement, selectedBrand) {
        if (!this.productHierarchy || !selectElement || !selectedBrand) return;
        

        this.clearSelect(selectElement);
        
   
        let availableHP = new Set();
        
        if (this.productHierarchy[selectedBrand]) {
         
            Object.keys(this.productHierarchy[selectedBrand]).forEach(hp => {
                availableHP.add(hp);
            });
        }
        
     
        const sortedHP = Array.from(availableHP).sort((a, b) => {
           
            const numA = parseFloat(a.replace(/[^\d.]/g, ''));
            const numB = parseFloat(b.replace(/[^\d.]/g, ''));
            return numA - numB;
        });
        
        console.log(`HP options for brand "${selectedBrand}":`, sortedHP);
        

        sortedHP.forEach(hp => {
            const option = document.createElement('option');
            option.value = hp;
            option.textContent = hp; 
            selectElement.appendChild(option);
        });
        
    
        selectElement.disabled = sortedHP.length === 0;
    }

    populateSeriesSelect(selectElement, selectedBrand, selectedHP) {
        if (!this.productHierarchy || !selectElement || !selectedBrand || !selectedHP) return;
        
        // 
        this.clearSelect(selectElement);
        
        if (this.productHierarchy[selectedBrand] && 
            this.productHierarchy[selectedBrand][selectedHP]) {
            
            // 
            const availableSeries = Object.keys(this.productHierarchy[selectedBrand][selectedHP]);
            
            // 
            const uniqueSeries = Array.from(new Set(availableSeries)).sort();
            
            console.log(`Series options for brand "${selectedBrand}" HP "${selectedHP}":`, uniqueSeries);
            
            uniqueSeries.forEach(series => {
                const option = document.createElement('option');
                option.value = series;
                option.textContent = series;
                selectElement.appendChild(option);
            });
            
            // 
            selectElement.disabled = uniqueSeries.length === 0;
        } else {
            selectElement.disabled = true;
        }
    }

    populateTypeSelect(selectElement, selectedBrand, selectedHP, selectedSeries) {
        if (!this.productHierarchy || !selectElement || !selectedBrand || !selectedHP || !selectedSeries) return;
        
        // 
        this.clearSelect(selectElement);
        
        if (this.productHierarchy[selectedBrand] && 
            this.productHierarchy[selectedBrand][selectedHP] && 
            this.productHierarchy[selectedBrand][selectedHP][selectedSeries]) {
            
            // 
            const availableTypes = Object.keys(this.productHierarchy[selectedBrand][selectedHP][selectedSeries]);
            
            // 
            const uniqueTypes = Array.from(new Set(availableTypes)).sort();
            
            console.log(`Type options for brand "${selectedBrand}" HP "${selectedHP}" Series "${selectedSeries}":`, uniqueTypes);
            
            uniqueTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                selectElement.appendChild(option);
            });
            
            // 
            selectElement.disabled = uniqueTypes.length === 0;
        } else {
            selectElement.disabled = true;
        }
    }

    setupEventListeners() {
        // 
        const poDate = document.getElementById('poDate');
        const supplier = document.getElementById('supplier');
        
        if (poDate) {
            poDate.addEventListener('change', () => this.updateStatus('PO date updated'));
        }
        
        if (supplier) {
            supplier.addEventListener('input', () => this.updateStatus('Supplier information updated'));
        }

        // 
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('qty-input')) {
                this.updateStats();
            }
        });

        // 
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('unit-price-input')) {
                this.formatUnitPrice(e.target);
                this.updateStats();
            }
        });

        const form = document.getElementById('purchaseOrderForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitPurchaseOrder();
            });
        }

        //
        this.setupModalListeners();
    }

    formatUnitPrice(input) {
        // 
        const cursorPos = input.selectionStart;
        const prevLength = input.value.length;
        
        // 
        let value = input.value.replace(/[^\d.]/g, '');
        
        //
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // 
        if (parts.length === 2 && parts[1].length > 2) {
            // 
            value = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // 
        if (value !== '') {
            const numParts = value.split('.');
            numParts[0] = numParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            value = numParts.join('.');
        }
        
        // 
        input.value = value;

       
        const newLength = input.value.length;
        const posDiff = newLength - prevLength;
        input.setSelectionRange(cursorPos + posDiff, cursorPos + posDiff);
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

    updateProductOptions(selectElement, rowNumber) {
        const row = document.querySelector(`tr[data-row="${rowNumber}"]`);
        if (!row || !this.productHierarchy) return;

        const brandSelect = row.querySelector('.brand-select');
        const hpSelect = row.querySelector('.hp-select');
        const seriesSelect = row.querySelector('.series-select');
        const typeSelect = row.querySelector('.type-select');
        const modelInput = row.querySelector('.model-input');

        const brand = brandSelect.value;
        const hp = hpSelect.value;
        const series = seriesSelect.value;
        const type = typeSelect.value;

  
        
        if (selectElement === brandSelect) {
            
            if (brand) {
                this.populateHorsepowerSelect(hpSelect, brand);
                this.showNotification(`Selected brand: ${brand}. Please select HP.`, 'info');
            } else {
                hpSelect.disabled = true;
            }
            
         
            this.clearSelect(seriesSelect);
            seriesSelect.disabled = true;
            this.clearSelect(typeSelect);
            typeSelect.disabled = true;
            modelInput.value = '';
            
        } else if (selectElement === hpSelect) {
       
            if (brand && hp) {
                this.populateSeriesSelect(seriesSelect, brand, hp);
                this.showNotification(`Selected ${brand} ${hp}. Please select Series.`, 'info');
            } else {
                seriesSelect.disabled = true;
            }
            
        
            this.clearSelect(typeSelect);
            typeSelect.disabled = true;
            modelInput.value = '';
            
        } else if (selectElement === seriesSelect) {
          
            if (brand && hp && series) {
                this.populateTypeSelect(typeSelect, brand, hp, series);
                this.showNotification(`Selected ${brand} ${hp} ${series}. Please select Type.`, 'info');
            } else {
                typeSelect.disabled = true;
            }
            
    
            modelInput.value = '';
            
        } else if (selectElement === typeSelect) {
       
            if (brand && hp && series && type) {
                this.updateModel(modelInput, brand, hp, series, type);
                this.showNotification(`Complete product selected: ${brand} ${hp} ${series} ${type}`, 'success');
            } else {
                modelInput.value = '';
            }
        }

        this.updateStats();
    }

    updateModel(modelInput, brand, hp, series, type) {
        if (brand && hp && series && type && 
            this.productHierarchy[brand] && 
            this.productHierarchy[brand][hp] && 
            this.productHierarchy[brand][hp][series] && 
            this.productHierarchy[brand][hp][series][type]) {
            
            const productInfo = this.productHierarchy[brand][hp][series][type];
            
           
            const indoorModel = productInfo.indoor_model || '';
            const outdoorModel = productInfo.outdoor_model || '';
            
        
            let displayModel = '';
            if (indoorModel && outdoorModel) {
                displayModel = `${indoorModel} / ${outdoorModel}`;
            } else if (indoorModel) {
                displayModel = `${indoorModel} / -`;
            } else if (outdoorModel) {
                displayModel = `- / ${outdoorModel}`;
            } else {
                displayModel = '- / -';
            }
            
            modelInput.value = displayModel;
            
         
            modelInput.setAttribute('data-indoor-model', indoorModel);
            modelInput.setAttribute('data-outdoor-model', outdoorModel);
            modelInput.setAttribute('data-combined-model', displayModel);
            
          
            this.showNotification(`Models auto-filled: ${displayModel}`, 'success');
        } else {
            modelInput.value = '';
            modelInput.removeAttribute('data-indoor-model');
            modelInput.removeAttribute('data-outdoor-model');
            modelInput.removeAttribute('data-combined-model');
        }
    }

    clearSelect(selectElement) {
      
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
    }

    addProductRow() {
        this.rowCounter++;
        
      
        const tbody = document.getElementById('productsTableBody');
        
        if (!tbody) {
            console.error('Could not find productsTableBody element');
            this.showNotification('Error: Could not add product row', 'error');
            return;
        }
        
        const newRow = document.createElement('tr');
        newRow.className = 'product-row';
        newRow.setAttribute('data-row', this.rowCounter);
        
        newRow.innerHTML = `
            <td class="col-brand">
                <select name="brand[]" class="form-select brand-select" onchange="updateProductOptions(this, ${this.rowCounter})" required>
                    <option value="">Select Brand</option>
                </select>
            </td>
            <td class="col-hp">
                <select name="hp[]" class="form-select hp-select" onchange="updateProductOptions(this, ${this.rowCounter})" required disabled>
                    <option value="">Select HP</option>
                </select>
            </td>
            <td class="col-series">
                <select name="series[]" class="form-select series-select" onchange="updateProductOptions(this, ${this.rowCounter})" required disabled>
                    <option value="">Select Series</option>
                </select>
            </td>
            <td class="col-type">
                <select name="type[]" class="form-select type-select" onchange="updateProductOptions(this, ${this.rowCounter})" required disabled>
                    <option value="">Select Type</option>
                </select>
            </td>
            <td class="col-model">
                <input type="text" name="model[]" class="form-input model-input" placeholder="Auto-filled" readonly>
            </td>
            <td class="col-qty">
                <input type="number" name="quantity[]" class="form-input qty-input" value="1" min="1" onchange="updateTotalUnits()" required>
            </td>
            <td class="col-unit-price">
                <input type="text" name="unit_price[]" class="form-input unit-price-input" placeholder="0.00" required>
            </td>
            <td class="col-action">
                <button type="button" class="btn-remove" onclick="removeProductRow(${this.rowCounter})">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(newRow);
        
      
        const brandSelect = newRow.querySelector('.brand-select');
        this.populateBrandSelect(brandSelect);
        
        this.updateRemoveButtons();
        this.updateStats();
        
        this.showNotification('Product row added. Start by selecting a Brand.', 'success');
        this.updateStatus('Product row added');
    }

    removeProductRow(rowNumber) {
        const row = document.querySelector(`tr[data-row="${rowNumber}"]`);
        if (row) {
            row.remove();
            this.updateRemoveButtons();
            this.updateStats();
            this.renumberRows();
            this.showNotification('Product row removed', 'success');
            this.updateStatus('Product row removed');
        }
    }

    renumberRows() {
        const rows = document.querySelectorAll('.product-row');
        rows.forEach((row, index) => {
            const rowNumCell = row.querySelector('.col-row-num');
            if (rowNumCell) {
                rowNumCell.textContent = index + 1;
            }
        });
    }

    updateRemoveButtons() {
        const rows = document.querySelectorAll('.product-row');
        rows.forEach((row, index) => {
            const removeBtn = row.querySelector('.btn-remove');
            if (removeBtn) {
                removeBtn.disabled = rows.length <= 1;
            }
        });
    }

    updateStats() {
        const rows = document.querySelectorAll('.product-row');
        let totalProducts = 0;
        let totalUnits = 0;
        let totalValue = 0;
        let uniqueBrands = new Set();
        
        rows.forEach(row => {
            const brandSelect = row.querySelector('.brand-select');
            const qtyInput = row.querySelector('.qty-input');
            const unitPriceInput = row.querySelector('.unit-price-input');
            
            if (brandSelect && brandSelect.value) {
                totalProducts++;
                uniqueBrands.add(brandSelect.value);
            }
            
            const quantity = parseInt(qtyInput?.value) || 0;
            
          
            const unitPriceText = unitPriceInput?.value || '0';
            const unitPrice = parseFloat(unitPriceText.replace(/,/g, '')) || 0;
            
            if (quantity > 0) {
                totalUnits += quantity;
                totalValue += (quantity * unitPrice);
            }
        });
        
    
        const formattedValue = new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(totalValue);
        
       
        const totalUnitsElement = document.getElementById('totalUnits');
        if (totalUnitsElement) {
            totalUnitsElement.textContent = `Total Units: ${totalUnits} | Total Value: ${formattedValue}`;
        }
        
    
        const totalProductsElement = document.getElementById('totalProducts');
        const totalBrandsElement = document.getElementById('totalBrands');
        
        if (totalProductsElement) totalProductsElement.textContent = totalProducts;
        if (totalBrandsElement) totalBrandsElement.textContent = uniqueBrands.size;
    }

    async submitPurchaseOrder() {
        try {
            this.updateStatus('Validating purchase order...');
            
          
            const formData = this.collectFormData();
            
          
            if (!this.validateFormData(formData)) {
                return;
            }
            
            this.updateStatus('Submitting purchase order...');
            
          
            const submitBtn = document.querySelector('.btn-primary');
            if (submitBtn) {
                const originalText = submitBtn.textContent;
                submitBtn.textContent = '⏳ Submitting...';
                submitBtn.disabled = true;
                
                try {
             
                    const response = await fetch('api/purchasing_order_form_submit.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    const responseText = await response.text();
                    console.log('API Response:', responseText); 
                    
                    let result;
                    try {
                        result = JSON.parse(responseText);
                    } catch (e) {
                        console.error('Invalid JSON response:', responseText);
                        throw new Error('Server returned invalid response');
                    }

                    if (!response.ok) {
                        throw new Error(result.message || `HTTP error! status: ${response.status}`);
                    }

                    if (result.success) {
                        this.handleSubmissionSuccess(result.data);
                    } else {
                        throw new Error(result.message || 'Failed to submit purchase order');
                    }

                } catch (error) {
                    console.error('Submission error:', error);
                    this.showNotification('Failed to submit purchase order: ' + error.message, 'error');
                    this.updateStatus('Error submitting purchase order');
                } finally {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showNotification('Failed to submit purchase order: ' + error.message, 'error');
            this.updateStatus('Error submitting purchase order');
        }
    }

    handleSubmissionSuccess(data) {
   
        document.getElementById('generatedPONumber').textContent = data.po_number;
        document.getElementById('orderDate').textContent = this.formatDate(data.po_date);
        document.getElementById('totalItems').textContent = data.total_items;
        
        document.getElementById('successModal').style.display = 'block';
        
        this.showNotification(`Purchase order ${data.po_number} created successfully!`, 'success');
        this.updateStatus(`Purchase order ${data.po_number} submitted successfully`);
        
   
        const lastSavedElement = document.getElementById('lastSaved');
        if (lastSavedElement) {
            lastSavedElement.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
        }
    }

    showSuccessModal(data) {
        const modal = document.getElementById('successModal');
        const poNumberElement = document.getElementById('generatedPONumber');
        const orderDateElement = document.getElementById('orderDate');
        const totalItemsElement = document.getElementById('totalItems');

        if (poNumberElement) poNumberElement.textContent = data.po_number || '';
        if (orderDateElement) orderDateElement.textContent = this.formatDate(data.po_date) || '';
        if (totalItemsElement) totalItemsElement.textContent = data.total_items || '';

        modal.style.display = 'block';
        
       
        setTimeout(() => {
            this.closeSuccessModal();
        }, 10000);
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
         
            document.getElementById('poDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('supplier').value = '';
            document.getElementById('remarks').value = '';
            
       
            const tbody = document.getElementById('productsTableBody');
            const rows = tbody.querySelectorAll('.product-row');
            
          
            for (let i = 1; i < rows.length; i++) {
                rows[i].remove();
            }
            
            const firstRow = tbody.querySelector('.product-row');
            if (firstRow) {
                firstRow.querySelector('.brand-select').selectedIndex = 0;
                
                const hpSelect = firstRow.querySelector('.hp-select');
                const seriesSelect = firstRow.querySelector('.series-select');
                const typeSelect = firstRow.querySelector('.type-select');
                const modelInput = firstRow.querySelector('.model-input');
                
                this.clearSelect(hpSelect);
                hpSelect.disabled = true;
                
                this.clearSelect(seriesSelect);
                seriesSelect.disabled = true;
                
                this.clearSelect(typeSelect);
                typeSelect.disabled = true;
                
                modelInput.value = '';
                firstRow.querySelector('.qty-input').value = '1';
                
           
                this.populateBrandSelect(firstRow.querySelector('.brand-select'));
            }
            
      
            this.rowCounter = 1;
            this.updateRemoveButtons();
            this.updateStats();
            
            this.showNotification('Form cleared', 'success');
            this.updateStatus('Form cleared - ready for new purchase order');
        }
    }

    saveAsDraft() {
        try {
            const formData = this.collectFormData();
            
      
            localStorage.setItem('po_draft', JSON.stringify({
                ...formData,
                savedAt: new Date().toISOString()
            }));
            
            this.showNotification('Draft saved successfully', 'success');
            this.updateStatus('Draft saved to local storage');
            
       
            const lastSavedElement = document.getElementById('lastSaved');
            if (lastSavedElement) {
                lastSavedElement.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error('Save draft error:', error);
            this.showNotification('Failed to save draft', 'error');
        }
    }

    closeSuccessModal() {
        document.getElementById('successModal').style.display = 'none';
    }

    createNewOrder() {
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

    collectFormData() {
        const data = {
            poDate: document.getElementById('poDate').value,
            supplier: document.getElementById('supplier').value,
            remarks: document.getElementById('remarks').value,
            products: []
        };
        

        const rows = document.querySelectorAll('.product-row');
        rows.forEach(row => {
            const brand = row.querySelector('.brand-select').value;
            const hp = row.querySelector('.hp-select').value;
            const series = row.querySelector('.series-select').value;
            const type = row.querySelector('.type-select').value;
            const model = row.querySelector('.model-input').value;
            const quantity = parseInt(row.querySelector('.qty-input').value) || 0;
            
        
            const unitPriceInput = row.querySelector('.unit-price-input');
            const unitPriceText = unitPriceInput?.value || '0';
            const unitPrice = parseFloat(unitPriceText.replace(/,/g, '')) || 0;
            
   
            const modelInput = row.querySelector('.model-input');
            const indoorModel = modelInput.getAttribute('data-indoor-model') || '';
            const outdoorModel = modelInput.getAttribute('data-outdoor-model') || '';
            const combinedModel = modelInput.getAttribute('data-combined-model') || model;
            
            if (brand && hp && series && type && model && quantity > 0 && unitPrice > 0) {
                data.products.push({
                    brand,
                    hp,
                    series,
                    type,
                    model: combinedModel,
                    indoor_model: indoorModel,
                    outdoor_model: outdoorModel,
                    quantity,
                    unit_price: unitPrice
                });
            }
        });
        
        return data;
    }

    validateFormData(data) {
        if (!data.poDate) {
            this.showNotification('Please select a PO date', 'error');
            return false;
        }
        
        if (!data.supplier) {
            this.showNotification('Please select a supplier', 'error');
            return false;
        }
        
        if (data.products.length === 0) {
            this.showNotification('Please add at least one complete product with unit price', 'error');
            return false;
        }
        
        return true;
    }
}


function updateProductOptions(selectElement, rowNumber) {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.updateProductOptions(selectElement, rowNumber);
    }
}

function addProductRow() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.addProductRow();
    }
}

function removeProductRow(rowNumber) {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.removeProductRow(rowNumber);
    }
}

function updateStats() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.updateStats();
    }
}

function updateTotalUnits() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.updateStats();
    }
}

function clearForm() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.clearForm();
    }
}

function saveAsDraft() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.saveAsDraft();
    }
}

function submitPurchaseOrder() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.submitPurchaseOrder();
    }
}

function closeSuccessModal() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.closeSuccessModal();
    }
}

function createNewOrder() {
    if (window.purchaseOrderForm) {
        window.purchaseOrderForm.createNewOrder();
    }
}


function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.purchaseOrderForm) {
            window.purchaseOrderForm.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.purchaseOrderForm = new PurchaseOrderForm();
});