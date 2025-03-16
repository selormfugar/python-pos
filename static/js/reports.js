// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set up tab navigation
    document.getElementById('sales-tab').addEventListener('click', showSalesTab);
    document.getElementById('invoices-tab').addEventListener('click', showInvoicesTab);
    
    // Load sales data
    loadSalesData();
});

// Show sales tab
function showSalesTab() {
    document.getElementById('sales-tab').classList.add('active');
    document.getElementById('invoices-tab').classList.remove('active');
    
    document.getElementById('sales-content').classList.remove('d-none');
    document.getElementById('invoices-content').classList.add('d-none');
    
    // Load sales data
    loadSalesData();
}

// Show invoices tab
function showInvoicesTab() {
    document.getElementById('sales-tab').classList.remove('active');
    document.getElementById('invoices-tab').classList.add('active');
    
    document.getElementById('sales-content').classList.add('d-none');
    document.getElementById('invoices-content').classList.remove('d-none');
    
    // Load invoices
    loadInvoices();
}

// Load sales data
function loadSalesData() {
    // Load daily sales summary
    fetch('/api/reports/daily-sales')
        .then(response => response.json())
        .then(data => {
            document.getElementById('total-sales').textContent = `$${data.total.toFixed(2)}`;
            document.getElementById('transaction-count').textContent = data.count;
            document.getElementById('average-sale').textContent = `$${data.average.toFixed(2)}`;
        })
        .catch(error => {
            console.error('Error loading daily sales:', error);
        });
    
    // Load best selling products
    fetch('/api/reports/best-selling')
        .then(response => response.json())
        .then(products => {
            displayBestSellingProducts(products);
        })
        .catch(error => {
            console.error('Error loading best selling products:', error);
        });
    
    // Load sales trend
    fetch('/api/reports/sales-trend')
        .then(response => response.json())
        .then(data => {
            createSalesTrendChart(data);
        })
        .catch(error => {
            console.error('Error loading sales trend:', error);
        });
}

// Display best selling products
function displayBestSellingProducts(products) {
    const tableBody = document.getElementById('best-selling-table-body');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2" class="text-center py-3">No sales data available</td></tr>';
        return;
    }
    
    products.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Alternate row colors
        if (index % 2 === 0) {
            row.classList.add('table-light');
        }
        
        // Product name
        const nameCell = document.createElement('td');
        nameCell.textContent = product.name;
        row.appendChild(nameCell);
        
        // Units sold
        const soldCell = document.createElement('td');
        soldCell.textContent = product.total_sold;
        soldCell.classList.add('text-end');
        row.appendChild(soldCell);
        
        tableBody.appendChild(row);
    });
}

// Create sales trend chart
function createSalesTrendChart(data) {
    const ctx = document.getElementById('sales-trend-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.salesChart) {
        window.salesChart.destroy();
    }
    
    window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.dates,
            datasets: [{
                label: 'Daily Sales',
                data: data.sales,
                backgroundColor: '#2196F3',
                borderColor: '#1976D2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.raw.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Load invoices
function loadInvoices() {
    fetch('/api/reports/invoices')
        .then(response => response.json())
        .then(invoices => {
            displayInvoices(invoices);
        })
        .catch(error => {
            console.error('Error loading invoices:', error);
        });
}

// Display invoices
function displayInvoices(invoices) {
    const tableBody = document.getElementById('invoices-table-body');
    tableBody.innerHTML = '';
    
    if (invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-3">No invoices found</td></tr>';
        return;
    }
    
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        
        // Invoice #
        const idCell = document.createElement('td');
        idCell.textContent = invoice.id;
        row.appendChild(idCell);
        
        // Customer
        const customerCell = document.createElement('td');
        customerCell.textContent = invoice.customer_name;
        row.appendChild(customerCell);
        
        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = invoice.date;
        row.appendChild(dateCell);
        
        // Amount
        const amountCell = document.createElement('td');
        amountCell.textContent = `$${invoice.total.toFixed(2)}`;
        amountCell.classList.add('text-end');
        row.appendChild(amountCell);
        
        // Status
        const statusCell = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.classList.add('badge');
        
        if (invoice.paid) {
            statusBadge.classList.add('bg-success');
            statusBadge.textContent = 'Paid';
        } else {
            statusBadge.classList.add('bg-danger');
            statusBadge.textContent = 'Unpaid';
        }
        
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);
        
        // Actions
        const actionsCell = document.createElement('td');
        
        if (!invoice.paid) {
            const payBtn = document.createElement('button');
            payBtn.type = 'button';
            payBtn.classList.add('btn', 'btn-sm', 'btn-success', 'me-1');
            payBtn.textContent = 'Mark Paid';
            payBtn.addEventListener('click', () => markInvoicePaid(invoice.id));
            actionsCell.appendChild(payBtn);
        }
        
        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.classList.add('btn', 'btn-sm', 'btn-primary');
        viewBtn.textContent = 'View';
        viewBtn.addEventListener('click', () => viewInvoice(invoice.id));
        actionsCell.appendChild(viewBtn);
        
        row.appendChild(actionsCell);
        
        tableBody.appendChild(row);
    });
}

// Mark invoice as paid
function markInvoicePaid(invoiceId) {
    if (confirm('Mark this invoice as paid?')) {
        fetch(`/api/reports/invoices/${invoiceId}/mark-paid`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload invoices
                loadInvoices();
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error marking invoice as paid:', error);
            alert('Error marking invoice as paid. Please try again.');
        });
    }
}

// View invoice
function viewInvoice(invoiceId) {
    fetch(`/api/reports/invoices/${invoiceId}`)
        .then(response => response.json())
        .then(invoice => {
            // Show invoice modal
            document.getElementById('invoice-id').textContent = invoice.id;
            document.getElementById('invoice-customer').textContent = invoice.customer_name;
            document.getElementById('invoice-date').textContent = invoice.date;
            document.getElementById('invoice-total').textContent = `$${invoice.total.toFixed(2)}`;
            
            const statusBadge = document.getElementById('invoice-status');
            statusBadge.textContent = invoice.paid ? 'PAID' : 'UNPAID';
            statusBadge.className = 'badge ' + (invoice.paid ? 'bg-success' : 'bg-danger');
            
            // Declare bootstrap before using it
            const modal = new bootstrap.Modal(document.getElementById('invoice-modal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error loading invoice:', error);
            alert('Error loading invoice. Please try again.');
        });
}