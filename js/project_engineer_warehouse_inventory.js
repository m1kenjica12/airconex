
class ProjectEngineerMaterialsInventory {
    constructor() {
        this.materials = [];
        this.filteredMaterials = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadMaterials();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 60000);
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterMaterials();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterMaterials();
        });

        document.getElementById('yearFilter').addEventListener('change', () => {
            this.loadMaterials();
        });
    }

    updateDateTime() {
        const now = new Date();
        const dateString = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('currentDate').textContent = dateString;
    }

    async loadMaterials() {
        this.showLoading(true);
        
        try {
            const response = await fetch('api/warehouse_materials_inventory_load_materials.php');
            const data = await response.json();
            
            if (data.success) {
                this.materials = data.data;
                this.filteredMaterials = [...this.materials];
                this.renderMaterials();
                this.updateStatus(`Loaded ${this.materials.length} materials`);
            } else {
                throw new Error(data.error || 'Failed to load materials');
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            this.updateStatus('Failed to load materials');
            this.showError('Failed to load materials inventory data');
        } finally {
            this.showLoading(false);
        }
    }

    filterMaterials() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;

        this.filteredMaterials = this.materials.filter(material => {
            const matchesSearch = material.description.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || material.category === categoryFilter;
            
            return matchesSearch && matchesCategory;
        });

        this.renderMaterials();
        this.updateStatus(`Showing ${this.filteredMaterials.length} of ${this.materials.length} materials`);
    }

    renderMaterials() {
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = '';

        if (this.filteredMaterials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="24" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        No materials found
                    </td>
                </tr>
            `;
            return;
        }

  
        const groupedMaterials = this.groupMaterialsByCategory();

        Object.keys(groupedMaterials).forEach(category => {
      
            tbody.innerHTML += `
                <tr class="category-row">
                    <td colspan="24" style="background-color: #2c3e50; color: white; font-weight: bold; text-align: left; padding: 8px 12px; font-size: 14px;">
                        ${category}
                    </td>
                </tr>
            `;

            groupedMaterials[category].forEach(material => {
                tbody.innerHTML += this.generateMaterialRow(material);
            });
        });
    }

    groupMaterialsByCategory() {
        const grouped = {};
        this.filteredMaterials.forEach(material => {
            const category = material.category || 'UNCATEGORIZED';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(material);
        });
        return grouped;
    }

    generateMaterialRow(material) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const endingInv = this.calculateEndingInventory(material);
        
        return `
            <tr>
                <td class="description-col">${material.description || ''}</td>
                <td>${this.formatNumber(material.beg_inv_as_of_jan_5_2025)}</td>
                <td>${material.uom || ''}</td>
                <td>${this.formatNumber(material.material_receipt)}</td>
                <td>${this.formatNumber(material.material_issued)}</td>
                <td>${this.formatNumber(material.material_returned)}</td>
                <td>${this.formatNumber(material.scrap_in)}</td>
                <td>${this.formatNumber(material.scrap_out)}</td>
                <td>${this.formatNumber(material.reserved)}</td>
                <td><strong>${this.formatNumber(endingInv)}</strong></td>
                ${months.map(month => `<td>${this.formatNumber(material[month])}</td>`).join('')}
                <td>${this.formatNumber(material.unit_cost)}</td>
                <td class="amount-col"><span class="amount-value">${this.formatNumber(material.amount)}</span></td>
            </tr>
        `;
    }

    calculateEndingInventory(material) {
        const beginning = parseInt(material.beg_inv_as_of_jan_5_2025) || 0;
        const receipt = parseInt(material.material_receipt) || 0;
        const issued = parseInt(material.material_issued) || 0;
        const returned = parseInt(material.material_returned) || 0;
        const scrapIn = parseInt(material.scrap_in) || 0;
        const scrapOut = parseInt(material.scrap_out) || 0;

        return beginning + receipt - issued + returned + scrapIn - scrapOut;
    }

    formatNumber(value) {
        if (value === null || value === undefined || value === '') {
            return '0';
        }
        return Number(value).toLocaleString();
    }

    showLoading(show) {
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

    updateStatus(message) {
        document.getElementById('status-text').textContent = message;
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    showError(message) {
        alert(message);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.inventorySystem = new ProjectEngineerMaterialsInventory();
});


function searchInventory() {
    window.inventorySystem.filterMaterials();
}

function refreshInventory() {
    window.inventorySystem.loadMaterials();
}

function exportInventory() {
    console.log('Exporting inventory...');
    alert('Export functionality will be implemented');
}

function handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
        window.location.href = 'login.html';
    }
}