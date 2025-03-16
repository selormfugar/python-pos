// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('product-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    document.getElementById('search-btn').addEventListener('click', searchProducts);
    document.getElementById('add-product-btn').addEventListener('click', showAddProductModal);
    
    // Load products
    loadProducts();
});

// Load products from the server
function loadProducts() {
    const searchTerm = document.getElementById('product-search').value.trim();
    let url = '/api/products';
    
    if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
    }
    
    fetch(url)
        .then(response => response.json())
        .then(products => {
            displayProducts(products);
        })
        .catch(error => {
            console.error('Error loading products:', error);
            alert('Error loading products. Please try again.');
        });
}

// Display products in the table
function displayProducts(products) {
    const tableBody = document.getElementById('product-table-body');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-3">No products found</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const row = document.createElement('tr');
        
        // Determine row color based on stock level
        if (product.current_stock < product.min_stock) {
            row.classList.add('table-danger');
        }
        
        // Product name
        const nameCell = document.createElement('td');
        nameCell.textContent = product.name;
        row.appendChild(nameCell);
        
        // SKU
        const skuCell = document.createElement('td');
        skuCell.textContent = product.sku;
        row.appendChild(skuCell);
        
        // Price
        const priceCell = document.createElement('td');
        priceCell.textContent = `$${product.price.toFixed(2)}`;
        priceCell.classList.add('text-end');
        row.appendChild(priceCell);
        
        // Current stock
        const stockCell = document.createElement('td');
        stockCell.textContent = product.current_stock;
        stockCell.classList.add('text-center');
        
        if (product.current_stock < product.min_stock) {
            stockCell.classList.add('fw-bold', 'text-danger');
        }
        
        row.appendChild(stockCell);
        
        // Min stock
        const minStockCell = document.createElement('td');
        minStockCell.textContent = product.min_stock;
        minStockCell.classList.add('text-center');
        row.appendChild(minStockCell);
        
        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.classList.add('text-center');
        
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.classList.add('btn', 'btn-sm', 'btn-primary', 'me-1');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => showEditProductModal(product));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => confirmDeleteProduct(product));
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);
        
        tableBody.appendChild(row);
    });
}

// Search products
function searchProducts() {
    loadProducts();
}

// Show add product modal
function showAddProductModal() {
    // Reset form
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add Product';
    
    // Show modal
    const modalElement = document.getElementById('product-modal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Show edit product modal
function showEditProductModal(product) {
    // Fill form with product data
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-sku').value = product.sku;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-stock').value = product.current_stock;
    document.getElementById('product-min-stock').value = product.min_stock;
    
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    
    // Show modal
    const modalElement = document.getElementById('product-modal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

// Save product
function saveProduct() {
    const productId = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value.trim();
    const sku = document.getElementById('product-sku').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);
    const minStock = parseInt(document.getElementById('product-min-stock').value);
    
    if (!name || !sku) {
        alert('Name and SKU are required');
        return;
    }
    
    const productData = {
        name: name,
        sku: sku,
        price: price,
        current_stock: stock,
        min_stock: minStock
    };
    
    let url = '/api/products';
    let method = 'POST';
    
    if (productId) {
        url += `/${productId}`;
        method = 'PUT';
    }
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Hide modal
            const modalElement = document.getElementById('product-modal');
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
            
            // Reload products
            loadProducts();
        } else {
            alert(`Error: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error saving product:', error);
        alert('Error saving product. Please try again.');
    });
}

// Confirm delete product
function confirmDeleteProduct(product) {
    if (confirm(`Are you sure you want to delete '${product.name}'?`)) {
        deleteProduct(product.id);
    }
}

// Delete product
function deleteProduct(productId) {
    fetch(`/api/products/${productId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload products
            loadProducts();
        } else {
            alert(`Error: ${data.error}`);
        }
    })
    .catch(error => {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
    });
}