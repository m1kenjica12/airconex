

class DispatchManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalItems = 0;
        this.allDispatch = [];
        this.filteredDispatch = [];
        this.sortColumn = '';
        this.sortDirection = 'asc';
        this.currentEditId = null;
        this.init();
    }

    async init() {
        this.updateDateTime();
        await this.loadDispatchData();
        this.setupEventListeners();
        this.updateStatus('Dispatch management loaded successfully');
    }

    showLoading(show = true) {
        const tbody = document.getElementById('dispatchTableBody');
        if (show) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="9" class="loading-cell">
                        <div class="loading-spinner"></div>
                        Loading dispatch data with PO status...
                    </td>
                </tr>
            `;
        }
    }

    async loadDispatchData() {
        try {
            this.showLoading(true);
            this.updateStatus('Loading dispatch data with PO status...');
            
          
            const response = await fetch('api/warehouse_dispatch_load_so.php?page=1&limit=1000&sort=created_at&order=DESC');
            const result = await response.json();
            
            console.log('Dispatch API Response:', result); 
            if (result.success) {
                this.allDispatch = result.data.map(item => ({
                    ...item,
            
                    date: this.formatDateForDisplay(item.date),
               
                    status: item.status || 'No PO',
                    serial_assignment: item.serial_assignment || 'Not Assigned',
                    dispatch: item.dispatch || 'Not Ready'
                }));
                
                this.filteredDispatch = [...this.allDispatch];
                this.totalItems = this.allDispatch.length;
                
                console.log(`Loaded ${this.allDispatch.length} dispatch records with PO status`); 
                
                this.populateFilters();
                this.updateStats();
                this.renderTable();
                this.updatePagination();
                
                this.showNotification(`Loaded ${this.allDispatch.length} dispatch records with PO status`, 'success');
                this.updateStatus(`Showing ${this.allDispatch.length} dispatch records with PO status`);
            } else {
                throw new Error(result.message || 'Failed to load dispatch data');
            }
        } catch (error) {
            console.error('Error loading dispatch:', error);
            this.showNotification('Failed to load dispatch data: ' + error.message, 'error');
            this.loadFallbackData();
        } finally {
            this.showLoading(false);
        }
    }

    formatDateForDisplay(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    loadFallbackData() {
        this.allDispatch = [];
        this.filteredDispatch = [];
        this.renderTable();
        this.updateStats();
        
        const tbody = document.getElementById('dispatchTableBody');
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="9" class="loading-cell">
                    No sales orders found or failed to load data.
                    <br><small>Please check if there are sales orders in the database.</small>
                </td>
            </tr>
        `;
    }

    populateFilters() {
   
        const statuses = [...new Set(this.allDispatch.map(item => item.status).filter(Boolean))].sort();
        const statusFilter = document.getElementById('statusFilter');
        
        if (statusFilter) {
          
            statusFilter.innerHTML = '<option value="">All Status</option>';
            
           
            statuses.forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                statusFilter.appendChild(option);
            });
            
            console.log('Populated status filter with PO statuses:', statuses);
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
        }

      
        const statusFilter = document.getElementById('statusFilter');
        const assignmentFilter = document.getElementById('assignmentFilter');

        if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());
        if (assignmentFilter) assignmentFilter.addEventListener('change', () => this.applyFilters());

        
        this.setupModalListeners();
    }

    setupModalListeners() {
       
        const serialModal = document.getElementById('serialModal');
        const dispatchModal = document.getElementById('dispatchModal');
        
      
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

      
        const serialForm = document.getElementById('serialForm');
        if (serialForm) {
            serialForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSerialAssignment();
            });
        }

        const dispatchForm = document.getElementById('dispatchForm');
        if (dispatchForm) {
            dispatchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleDispatch();
            });
        }
    }

    applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const assignmentFilter = document.getElementById('assignmentFilter');

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const statusValue = statusFilter ? statusFilter.value : '';
        const assignmentValue = assignmentFilter ? assignmentFilter.value : '';

        this.filteredDispatch = this.allDispatch.filter(item => {
            const matchesSearch = !searchTerm || 
                item.so_number.toLowerCase().includes(searchTerm) ||
                item.client.toLowerCase().includes(searchTerm) ||
                item.unit_description.toLowerCase().includes(searchTerm) ||
                (item.model && item.model.toLowerCase().includes(searchTerm)) ||
                (item.assigned_serial && item.assigned_serial.toLowerCase().includes(searchTerm)) ||
                (item.status && item.status.toLowerCase().includes(searchTerm));

            const matchesStatus = !statusValue || item.status === statusValue;
            const matchesAssignment = !assignmentValue || item.serial_assignment === assignmentValue;

            return matchesSearch && matchesStatus && matchesAssignment;
        });

        this.currentPage = 1;
        this.updateStats();
        this.renderTable();
        this.updatePagination();
        
        console.log(`Filtered ${this.filteredDispatch.length} records from ${this.allDispatch.length} total`);
    }

    updateStats() {
        const totalItems = this.filteredDispatch.length;
        const pendingItems = this.filteredDispatch.filter(item => 
            item.status === 'Pending' || item.status === 'No PO' || item.status === 'Processing'
        ).length;
        const assignedItems = this.filteredDispatch.filter(item => item.serial_assignment === 'Assigned').length;
        const dispatchedItems = this.filteredDispatch.filter(item => 
            item.status === 'Dispatched' || item.status === 'Delivered' || item.status === 'Received'
        ).length;

        const totalElement = document.getElementById('totalItems');
        const pendingElement = document.getElementById('pendingItems');
        const assignedElement = document.getElementById('assignedItems');
        const dispatchedElement = document.getElementById('dispatchedItems');

        if (totalElement) totalElement.textContent = totalItems;
        if (pendingElement) pendingElement.textContent = pendingItems;
        if (assignedElement) assignedElement.textContent = assignedItems;
        if (dispatchedElement) dispatchedElement.textContent = dispatchedItems;
    }

    renderTable() {
        const tbody = document.getElementById('dispatchTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredDispatch.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="9" class="loading-cell">
                        No dispatch records found matching your criteria.
                        <br><small>Try adjusting your search or filters.</small>
                    </td>
                </tr>
            `;
            return;
        }

      
        const startIndex = this.pageSize === 'all' ? 0 : (this.currentPage - 1) * parseInt(this.pageSize);
        const endIndex = this.pageSize === 'all' ? this.filteredDispatch.length : startIndex + parseInt(this.pageSize);
        const pageItems = this.filteredDispatch.slice(startIndex, endIndex);

        console.log(`Rendering ${pageItems.length} dispatch records with PO status`); 

        pageItems.forEach((item) => {
            const row = document.createElement('tr');
            row.className = 'dispatch-row';
            
            
            const unitDescriptionWithType = item.unit_type ? 
                `${item.unit_description} (${item.unit_type})` : 
                item.unit_description;
                
            
            row.innerHTML = `
                <td class="col-date">${item.date}</td>
                <td class="col-so-number">${item.so_number}</td>
                <td class="col-client">${item.client}</td>
                <td class="col-unit-description">${unitDescriptionWithType}</td>
                <td class="col-model">${item.model || '-'}</td>
                <td class="col-assigned-serial">${item.assigned_serial || '-'}</td>
                <td class="col-serial-assignment">
                    <span class="assignment-status assignment-${item.serial_assignment.toLowerCase().replace(/\s+/g, '-')}">${item.serial_assignment}</span>
                </td>
                <td class="col-status">
                    <span class="status-badge ${this.getStatusClass(item.status)}" title="PO Status: ${item.status}">${item.status}</span>
                </td>
                <td class="col-action action-column">
                    ${this.generateActionButtons(item)}
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getStatusClass(status) {
      
        switch (status) {
            case 'Pending':
                return 'status-pending';
            case 'Processing':
                return 'status-processing';
            case 'Shipped':
                return 'status-shipped';
            case 'Delivered':
                return 'status-delivered';
            case 'Received':
                return 'status-received';
            case 'Allocated':
                return 'status-allocated';
            case 'No PO':
                return 'status-no-po';
            case 'Dispatched':
                return 'status-dispatched';
            default:
                return 'status-unknown';
        }
    }

    generateActionButtons(item) {
        let buttons = [];

      
        if (item.serial_assignment === 'Not Assigned') {
            buttons.push(`<button class="btn-action btn-assign" onclick="openSerialModal('${item.id}')">Assign</button>`);
        }

   
        if (item.serial_assignment === 'Assigned') {
            const isDelivered = item.order_status === 'Delivered' || item.so_status === 'Delivered';
            const isInTransit = item.order_status === 'In Transit' || item.so_status === 'In Transit';
            
            if (isDelivered) {
              
                buttons.push(`
                    <span class="delivery-status delivered">✅ DELIVERED</span>
                    <button class="btn-action btn-undo" onclick="toggleDelivered('${item.so_number}', false)">Undo</button>
                `);
            } else if (isInTransit) {
               
                buttons.push(`
                    <span class="delivery-status not-delivered">⏳ IN TRANSIT</span>
                    <button class="btn-action btn-deliver" onclick="toggleDelivered('${item.so_number}', true)">Mark Delivered</button>
                `);
            } else {
             
                buttons.push(`
                    <span class="delivery-status not-ready">⚠️ NOT IN TRANSIT</span>
                    <small style="color: #666;">Generate DR first</small>
                `);
            }
        }

        return buttons.join(' ');
    }

    async toggleDelivered(soNumber, markAsDelivered) {
        try {
            const action = markAsDelivered ? 'marking as delivered' : 'unmarking as delivered';
            this.updateStatus(`${action} SO ${soNumber}...`);
            
            const response = await fetch('api/warehouse_dispatch_toggle_delivered.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    so_number: soNumber,
                    is_delivered: markAsDelivered
                })
            });

            const result = await response.json();
            if (result.success) {
              
                this.allDispatch.forEach(item => {
                    if (item.so_number === soNumber) {
                        item.so_status = result.status;
                        item.order_status = result.status;
                    }
                });
                
                this.filteredDispatch.forEach(item => {
                    if (item.so_number === soNumber) {
                        item.so_status = result.status;
                        item.order_status = result.status;
                    }
                });
                
                
                this.renderTable();
                
                const actionText = markAsDelivered ? 'marked as delivered' : 'unmarked as delivered';
                this.showNotification(`Order ${soNumber} ${actionText}`, 'success');
                this.updateStatus(`Order ${soNumber} ${actionText}`);
                
            } else {
               
                if (result.error.includes('In Transit') || result.error.includes('Delivered')) {
                    this.showNotification(result.error, 'warning');
                } else {
                    throw new Error(result.error || 'Failed to toggle delivery status');
                }
            }
        } catch (error) {
            console.error('Toggle delivered error:', error);
            this.showNotification('Failed to toggle delivery status: ' + error.message, 'error');
        }
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    formatDispatch(dispatch) {
        if (!dispatch || dispatch === 'Pending' || dispatch === 'Not Ready') {
            return dispatch || 'Not Ready';
        }
        return this.formatDate(dispatch);
    }

    async openSerialModal(id) {
        this.currentEditId = id;
        
       
        const numericId = parseInt(id);
        console.log('Looking for item with ID:', numericId);
        
        const item = this.allDispatch.find(item => parseInt(item.id) === numericId);
        
        if (item) {
            console.log('Found item for serial assignment:', item);
            
            
            if (!item.model || !item.unit_type) {
                console.error('Missing model or unit_type in item:', item);
                this.showNotification('Error: Missing model or unit type information', 'error');
                return;
            }
            
            try {
             
                const encodedModel = encodeURIComponent(item.model);
                const encodedUnitType = encodeURIComponent(item.unit_type);
                
                const url = `api/warehouse_dispatch_get_available_serials.php?model=${encodedModel}&unit_type=${encodedUnitType}`;
                console.log('Fetching serials from:', url);
                
                const response = await fetch(url);
                const responseText = await response.text();
                console.log('Raw API response:', responseText);
                
                let result;
                try {
                    result = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('Error parsing JSON response:', parseError, responseText);
                    this.showNotification('Error parsing server response', 'error');
                    return;
                }
                
              
                if (result.stats) {
                    console.log('Serial availability stats:', result.stats);
                    
                 
                    if (result.stats.total_records > 0 && result.stats.released_records === 0) {
                        this.showNotification(`Found ${result.stats.total_records} matching records, but none are Released status`, 'warning');
                    }
                }
                
                if (result.success && result.data && result.data.length > 0) {
                    this.populateSerialOptions(result.data);
                    this.showNotification(`Found ${result.data.length} available serials`, 'success');
                } else {
                  
                    let errorMsg = 'No available serials found';
                    if (result.stats) {
                        if (result.stats.total_records === 0) {
                            errorMsg = `No records found for model ${item.model}`;
                        } else if (result.stats.released_records === 0) {
                            errorMsg = `Found ${result.stats.total_records} records for model ${item.model}, but none are Released`;
                        }
                    }
                    
                    this.populateSerialOptions([]);
                    this.showNotification(errorMsg, 'warning');
                    
                    
                    const serialSelect = document.getElementById('serialSelect');
                    if (serialSelect) {
                        const option = document.createElement('option');
                        option.value = '';
                        option.textContent = 'No serials available - units not marked as Released';
                        option.style.color = '#e74c3c';
                        serialSelect.appendChild(option);
                    }
                }
            } catch (error) {
                console.error('Error loading serials:', error);
                this.populateSerialOptions([]);
                this.showNotification('Error loading available serials: ' + error.message, 'error');
            }
            
       
            const serialNumberInput = document.getElementById('serialNumber');
            const assignmentDateInput = document.getElementById('assignmentDate');
            
            if (serialNumberInput) {
                serialNumberInput.value = item.assigned_serial || '';
            }
            
            if (assignmentDateInput) {
                assignmentDateInput.value = new Date().toISOString().split('T')[0];
            }
            
            
            this.updateSerialModalHeader(item);
           
            const modal = document.getElementById('serialModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                console.error('Serial modal element not found');
            }
        } else {
            console.error('Item not found for id:', numericId);
            console.error('Available items:', this.allDispatch.map(item => ({id: item.id, model: item.model, unit_type: item.unit_type})));
            this.showNotification('Error: Item not found', 'error');
        }
    }

    async debugSerialAvailability(item) {
        try {
            const encodedModel = encodeURIComponent(item.model);
            const encodedUnitType = encodeURIComponent(item.unit_type);
            
            const debugUrl = `api/warehouse_dispatch_debug_serials.php?model=${encodedModel}&unit_type=${encodedUnitType}`;
            console.log('Running debug check:', debugUrl);
            
            const response = await fetch(debugUrl);
            const responseText = await response.text();
            console.log('Debug API raw response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Debug API returned invalid JSON:', responseText);
                return;
            }
            
            if (result.success) {
                console.log('=== SERIAL DEBUG INFORMATION ===');
                console.log('Searched for:', result.debug_info.searched_model);
                console.log('Unit Type:', result.debug_info.searched_unit_type);
                console.log('');
                
                console.log('Exact Matches:', result.debug_info.exact_matches.count);
                if (result.debug_info.exact_matches.count > 0) {
                    console.table(result.debug_info.exact_matches.data);
                }
                
                console.log('Similar Models:', result.debug_info.similar_models.count);
                if (result.debug_info.similar_models.count > 0) {
                    console.table(result.debug_info.similar_models.data);
                }
                
                console.log('Brand Matches:', result.debug_info.brand_matches.count);
                if (result.debug_info.brand_matches.count > 0) {
                    console.table(result.debug_info.brand_matches.data);
                }
                
                console.log('All Received Items:', result.debug_info.all_received_items.count);
                if (result.debug_info.all_received_items.count > 0) {
                    console.table(result.debug_info.all_received_items.data);
                }
              
                let debugMessage = `Debug: No serials found for "${item.model}" (${item.unit_type})\n\n`;
                debugMessage += `Available data:\n`;
                debugMessage += `• Exact matches: ${result.debug_info.exact_matches.count}\n`;
                debugMessage += `• Similar models: ${result.debug_info.similar_models.count}\n`;
                debugMessage += `• Brand matches: ${result.debug_info.brand_matches.count}\n`;
                debugMessage += `• Total received items: ${result.debug_info.all_received_items.count}\n\n`;
                
                if (result.debug_info.all_received_items.count === 0) {
                    debugMessage += `No items have been received yet.\nPlease receive some purchase orders first.`;
                } else if (result.debug_info.exact_matches.count === 0) {
                    debugMessage += `No exact model matches found.\nCheck if PO models match SO models exactly.`;
                }
                
                this.showNotification(debugMessage, 'warning');
            } else {
                console.error('Debug API failed:', result.message);
            }
        } catch (error) {
            console.error('Debug check failed:', error);
        }
    }

    populateSerialOptions(serials) {
        const serialSelect = document.getElementById('serialSelect');
        
        console.log('populateSerialOptions called with:', serials);
        
        if (serialSelect) {
          
            serialSelect.innerHTML = '<option value="">Select from available serials</option>';
            
            if (serials && serials.length > 0) {
                serials.forEach((serial, index) => {
                    const option = document.createElement('option');
                    option.value = serial.serial;
                    
                    const displayText = `${serial.serial} (${serial.component_type} - PO: ${serial.po_number} - ${serial.brand})`;
                    option.textContent = displayText;
                    
                    option.setAttribute('data-po-number', serial.po_number || '');
                    option.setAttribute('data-brand', serial.brand || '');
                    option.setAttribute('data-component-type', serial.component_type || '');
                    option.setAttribute('data-horsepower', serial.horsepower || '');
                    option.setAttribute('data-supplier', serial.supplier || '');
                    
                    serialSelect.appendChild(option);
                    
                    console.log(`Added option ${index + 1}: ${serial.serial} (${serial.component_type})`);
                });
                
                console.log(`Dropdown populated with ${serials.length} serials`);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No matching serials found in Released POs';
                option.style.color = '#e74c3c';
                serialSelect.appendChild(option);
                console.log('No matching serials found');
            }
        } else {
            console.error('serialSelect element not found');
        }
    }

    updateSerialModalHeader(item) {
        const modalTitle = document.querySelector('#serialModal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Assign Serial - ${item.model} (${item.unit_type})`;
        }
        
       
        let detailsDiv = document.getElementById('serialItemDetails');
        if (!detailsDiv) {
            detailsDiv = document.createElement('div');
            detailsDiv.id = 'serialItemDetails';
            detailsDiv.className = 'item-details';
            detailsDiv.style.cssText = 'background: #f8f9fa; padding: 10px; margin-bottom: 15px; border-radius: 4px; font-size: 12px;';
            
            const modalBody = document.querySelector('#serialModal .modal-body');
            if (modalBody) {
                modalBody.insertBefore(detailsDiv, modalBody.firstChild);
            }
        }
        
        if (detailsDiv) {
            detailsDiv.innerHTML = `
                <div><strong>SO Number:</strong> ${item.so_number} | <strong>Client:</strong> ${item.client}</div>
                <div><strong>Unit:</strong> ${item.unit_description}</div>
                <div><strong>Model:</strong> ${item.model} | <strong>Type:</strong> ${item.unit_type} | <strong>Status:</strong> ${item.status}</div>
                <div style="margin-top: 5px; color: #666;"><strong>Note:</strong> Looking for received serials matching this exact model</div>
            `;
        }
    }

    closeSerialModal() {
        document.getElementById('serialModal').style.display = 'none';
        this.currentEditId = null;
    }

    async handleSerialAssignment() {
        const serialNumber = document.getElementById('serialNumber').value;
        const assignmentDate = document.getElementById('assignmentDate').value;

        if (!serialNumber || !assignmentDate) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }


        const item = this.allDispatch.find(item => parseInt(item.id) === parseInt(this.currentEditId));
        if (!item) {
            this.showNotification('Item not found', 'error');
            return;
        }

        try {
       
            const assignmentData = {
                so_number: item.so_number,
                model: item.model,
                unit_type: item.unit_type,
                serial_number: serialNumber,
                assignment_date: assignmentDate
            };

            console.log('Sending serial assignment data:', assignmentData);

           
            const response = await fetch('api/warehouse_dispatch_assign_serial.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(assignmentData)
            });

            const responseText = await response.text();
            console.log('Serial assignment response:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Invalid response from server: ' + responseText);
            }

            if (result.success) {
              
                item.assigned_serial = serialNumber;
                item.serial_assignment = 'Assigned';
              

                
                const filteredItem = this.filteredDispatch.find(fItem => parseInt(fItem.id) === parseInt(this.currentEditId));
                if (filteredItem) {
                    filteredItem.assigned_serial = serialNumber;
                    filteredItem.serial_assignment = 'Assigned';
                   
                }

                
                this.applyFilters();
                this.showNotification(`Serial ${serialNumber} assigned successfully to ${item.model} (${item.unit_type}) - PO Status: ${item.status}`, 'success');
                this.closeSerialModal();

                console.log('Serial assignment successful:', result.data);
            } else {
                throw new Error(result.message || 'Failed to assign serial');
            }

        } catch (error) {
            console.error('Serial assignment error:', error);
            this.showNotification('Failed to assign serial: ' + error.message, 'error');
        }
    }

    openDispatchModal(id) {
        this.currentEditId = id;
        const item = this.allDispatch.find(item => item.id === id);
        
        if (item) {
            document.getElementById('dispatchDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('courier').value = '';
            document.getElementById('trackingNumber').value = '';
            document.getElementById('dispatchModal').style.display = 'block';
        }
    }

    closeDispatchModal() {
        document.getElementById('dispatchModal').style.display = 'none';
        this.currentEditId = null;
    }

    handleDispatch() {
        const dispatchDate = document.getElementById('dispatchDate').value;
        const courier = document.getElementById('courier').value;
        const trackingNumber = document.getElementById('trackingNumber').value;

        if (!dispatchDate || !courier) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

      
        const item = this.allDispatch.find(item => item.id === this.currentEditId);
        if (item) {
            
            item.dispatch = dispatchDate;
        }

        this.applyFilters();
        this.showNotification(`Unit dispatched successfully - PO Status: ${item.status}`, 'success');
        this.closeDispatchModal();
    }

    viewDetails(id) {
        const item = this.allDispatch.find(item => item.id === id);
        if (item) {
            let details = `Dispatch Details:\n\n`;
            details += `Date: ${item.date}\n`;
            details += `SO Number: ${item.so_number}\n`;
            details += `Client: ${item.client}\n`;
            details += `Address: ${item.address || 'N/A'}\n`;
            details += `City/Province: ${item.city_province || 'N/A'}\n`;
            details += `Contact: ${item.contact_number || 'N/A'}\n`;
            details += `Unit: ${item.unit_description}\n`;
            details += `Unit Type: ${item.unit_type || 'N/A'}\n`;
            details += `Model: ${item.model || 'N/A'}\n`;
            details += `Serial: ${item.assigned_serial || 'Not Assigned'}\n`;
            details += `PO Status: ${item.status}\n`;
            details += `Dispatch: ${this.formatDispatch(item.dispatch)}`;
            
            if (item.unit_details) {
                details += `\n\nUnit Details:\n`;
                details += `Brand: ${item.unit_details.brand || 'N/A'}\n`;
                details += `Horsepower: ${item.unit_details.horsepower || 'N/A'}\n`;
                details += `Indoor Model: ${item.unit_details.indoor_model || 'N/A'}\n`;
                details += `Outdoor Model: ${item.unit_details.outdoor_model || 'N/A'}\n`;
                details += `Component: ${item.unit_details.component_type || 'N/A'}`;
            }
            
            alert(details);
        }
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

     
        this.filteredDispatch.sort((a, b) => {
            let aVal = a[column] || '';
            let bVal = b[column] || '';

            
            if (column === 'date' || column === 'dispatch') {
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
        const totalPages = this.pageSize === 'all' ? 1 : Math.ceil(this.filteredDispatch.length / parseInt(this.pageSize));
        
      
        const startItem = this.pageSize === 'all' ? 1 : (this.currentPage - 1) * parseInt(this.pageSize) + 1;
        const endItem = this.pageSize === 'all' ? this.filteredDispatch.length : 
            Math.min(this.currentPage * parseInt(this.pageSize), this.filteredDispatch.length);
        
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${this.filteredDispatch.length} orders`;
        }

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;

       
        this.renderPageNumbers(totalPages);
    }

    renderPageNumbers(totalPages) {
        const pageNumbersContainer = document.getElementById('pageNumbers');
        if (!pageNumbersContainer) return;
        
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
        const totalPages = Math.ceil(this.filteredDispatch.length / parseInt(this.pageSize));
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
        }
    }

    changePageSize() {
        const pageSizeSelect = document.getElementById('pageSize');
        if (pageSizeSelect) {
            this.pageSize = pageSizeSelect.value;
            this.currentPage = 1;
            this.renderTable();
            this.updatePagination();
        }
    }

    refreshDispatch() {
        this.showNotification('Refreshing dispatch data with PO status...', 'info');
        this.loadDispatchData();
    }

    exportDispatch() {
        try {
       
            const headers = ['Date', 'SO Number', 'Client', 'Unit Description', 'Model', 'Assigned Serial', 'Serial Assignment', 'PO Status'];
            const csvContent = [
                headers.join(','),
                ...this.filteredDispatch.map(item => [
                    `"${item.date}"`,
                    `"${item.so_number}"`,
                    `"${item.client}"`,
                    `"${item.unit_description}"`,
                    `"${item.model || ''}"`,
                    `"${item.assigned_serial || ''}"`,
                    `"${item.serial_assignment}"`,
                    `"${item.status}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `dispatch_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showNotification('Dispatch data exported successfully', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export dispatch data', 'error');
        }
    }

    printDispatch() {
        try {
            const printWindow = window.open('', '_blank');
            const printContent = this.generatePrintContent();
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            
            this.showNotification('Print dialog opened', 'success');
        } catch (error) {
            console.error('Print error:', error);
            this.showNotification('Failed to open print dialog', 'error');
        }
    }

    generatePrintContent() {
        const currentDate = new Date().toLocaleDateString();
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dispatch Management Report</title>
                <style>
                    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 18px; }
                    .header p { margin: 5px 0; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>DISPATCH MANAGEMENT REPORT</h1>
                    <p>Generated on ${currentDate}</p>
                    <p>Total Records: ${this.filteredDispatch.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>SO Number</th>
                            <th>Client</th>
                            <th>Unit Description</th>
                            <th>Model</th>
                            <th>Assigned Serial</th>
                            <th>Serial Assignment</th>
                            <th>PO Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.filteredDispatch.forEach(item => {
            html += `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.so_number}</td>
                    <td>${item.client}</td>
                    <td>${item.unit_description}</td>
                    <td>${item.model || '-'}</td>
                    <td>${item.assigned_serial || '-'}</td>
                    <td>${item.serial_assignment}</td>
                    <td>${item.status}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div class="footer">
                    <p>AirconEx Dispatch Management System</p>
                </div>
            </body>
            </html>
        `;

        return html;
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

    async markAsDelivered(soNumber) {
        const deliveryDate = prompt('Enter delivery date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!deliveryDate) return;

        const deliveryNotes = prompt('Delivery notes (optional):') || '';

        try {
            const response = await fetch('api/warehouse_dispatch_mark_delivered.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    so_number: soNumber,
                    delivery_date: deliveryDate,
                    delivery_notes: deliveryNotes
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification(`Order ${soNumber} marked as delivered`, 'success');
                
             
                this.allDispatch.forEach(item => {
                    if (item.so_number === soNumber) {
                        item.status = 'Delivered';
                        item.order_status = 'Delivered';
                    }
                });
               
                this.applyFilters();
                
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showNotification('Failed to mark as delivered: ' + error.message, 'error');
        }
    }
}


function searchDispatch() {
    if (window.dispatchManager) {
        window.dispatchManager.applyFilters();
    }
}

function refreshDispatch() {
    if (window.dispatchManager) {
        window.dispatchManager.refreshDispatch();
    }
}

function exportDispatch() {
    if (window.dispatchManager) {
        window.dispatchManager.exportDispatch();
    }
}

function printDispatch() {
    if (window.dispatchManager) {
        window.dispatchManager.printDispatch();
    }
}

function sortTable(column) {
    if (window.dispatchManager) {
        window.dispatchManager.sortTable(column);
    }
}

function previousPage() {
    if (window.dispatchManager) {
        window.dispatchManager.previousPage();
    }
}

function nextPage() {
    if (window.dispatchManager) {
        window.dispatchManager.nextPage();
    }
}

function changePageSize() {
    if (window.dispatchManager) {
        window.dispatchManager.changePageSize();
    }
}

function openSerialModal(id) {
    console.log('Global openSerialModal called with id:', id);
    if (window.dispatchManager) {
        window.dispatchManager.openSerialModal(id);
    } else {
        console.error('dispatchManager not found');
    }
}

function closeSerialModal() {
    const modal = document.getElementById('serialModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openDispatchModal(id) {
    if (window.dispatchManager) {
        window.dispatchManager.openDispatchModal(id);
    }
}

function closeDispatchModal() {
    if (window.dispatchManager) {
        window.dispatchManager.closeDispatchModal();
    }
}

function viewDetails(id) {
    if (window.dispatchManager) {
        window.dispatchManager.viewDetails(id);
    }
}


function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        if (window.dispatchManager) {
            window.dispatchManager.showNotification('Logging out...', 'info');
        }
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}


function handleSerialSelect() {
    const selectElement = document.getElementById('serialSelect');
    const inputElement = document.getElementById('serialNumber');
    
    if (selectElement && inputElement) {
        if (selectElement.value) {
            inputElement.value = selectElement.value;
            
        
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            const poNumber = selectedOption.getAttribute('data-po-number');
            const brand = selectedOption.getAttribute('data-brand');
            const componentType = selectedOption.getAttribute('data-component-type');
            const pairSerial = selectedOption.getAttribute('data-pair-serial');
            const unitDescription = selectedOption.getAttribute('data-unit-description');
            
            if (window.dispatchManager) {
                const message = `Selected ${componentType} serial: ${selectElement.value}\nPaired ${componentType === 'Indoor' ? 'Outdoor' : 'Indoor'}: ${pairSerial}\nFrom PO: ${poNumber} (${brand})\nUnit: ${unitDescription}`;
                window.dispatchManager.showNotification(message, 'info');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dispatchManager = new DispatchManager();
});


function toggleDelivered(soNumber, markAsDelivered) {
    console.log('toggleDelivered called:', soNumber, markAsDelivered);
    if (window.dispatchManager) {
        window.dispatchManager.toggleDelivered(soNumber, markAsDelivered);
    } else {
        console.error('dispatchManager not found');
    }
}