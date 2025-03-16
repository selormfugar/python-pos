// Cart management
let cart = [];
let isOnline = true;
let pendingTransactions = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Check connection status periodically
    setInterval(checkConnection, 5000);
    
    // Set up event listeners
    document.getElementById('product-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProduct();
        }
    });
    
    document.getElementById('search-btn').addEventListener('click', searchProduct);
    document.getElementById('cash-payment-btn').addEventListener('click', function() {
        processPayment('Cash');
    });
    document.getElementById('invoice-btn').addEventListener('click', createInvoice);
    document.getElementById('checkout-btn').addEventListener('click', function() {
        processPayment('Cash');
    });
    
    // Load any saved cart from localStorage
    loadCart();
    
    // Update UI
    updateCartUI();
    updateTotals();
});

// Check connection status
function checkConnection() {
    // In a real app, this would check the server connection
    // For demo, we'll randomly change status occasionally
    if (Math.random() < 0.1) {
        isOnline = !isOnline;
        updateConnectionStatus();
        
        if (isOnline && pendingTransactions.length > 0) {
            syncData();
        }
    }
}

// Update connection status indicator
function updateConnectionStatus() {
    const indicator = document.getElementById('connection-indicator');
    
    if (isOnline) {
        indicator.classList.remove('bg-danger');
        indicator.classList.add('bg-success');
    } else {
        indicator.classList.remove('bg-success');
        indicator.classList.add('bg-danger');
    }
}

// Sync pending transactions
function syncData() {
    if (pendingTransactions.length === 0) return;
    
    const syncStatus = document.getElementById('sync-status');
    syncStatus.textContent = `Syncing ${pendingTransactions.length} transactions...`;
    
    // In a real app, this would send the transactions to the server
    // For demo, we'll just simulate a delay
    setTimeout(function() {
        pendingTransactions = [];
        syncStatus.textContent = 'All data synced';
        localStorage.removeItem('pendingTransactions');
    }, 2000);
}

// Search for a product
function searchProduct() {
    const searchTerm = document.getElementById('product-search').value.trim();
    
    if (!searchTerm) return;
    
    // In a real app, this would search the database
    // For demo, we'll use the API
    fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(products => {
            if (products.length > 0) {
                addToCart(products[0]);
                document.getElementById('product-search').value = '';
            } else {
                alert(`No product found matching '${searchTerm}'`);
            }
        })
        .catch(error => {
            console.error('Error searching for product:', error);
            alert('Error searching for product. Please try again.');
        });
}

// Add a product to the cart
function addToCart(product) {
    // Check if product is already in cart
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    // Save cart to localStorage
    saveCart();
    
    // Update UI
    updateCartUI();
    updateTotals();
}

// Remove an item from the cart
function removeFromCart(index) {
    cart.splice(index, 1);
    
    // Save cart to localStorage
    saveCart();
    
    // Update UI
    updateCartUI();
    updateTotals();
}

// Update item quantity
function updateQuantity(index, change) {
    const item = cart[index];
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(index);
    } else {
        item.quantity = newQuantity;
        
        // Save cart to localStorage
        saveCart();
        
        // Update UI
        updateCartUI();
        updateTotals();
    }
}

// Update the cart UI
function updateCartUI() {
    const cartContainer = document.getElementById('cart-items');
    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<tr><td colspan="5" class="text-center py-3">Cart is empty</td></tr>';
        return;
    }
    
    cart.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Product name
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        row.appendChild(nameCell);
        
        // Price
        const priceCell = document.createElement('td');
        priceCell.textContent = `$${item.price.toFixed(2)}`;
        priceCell.classList.add('text-end');
        row.appendChild(priceCell);
        
        // Quantity
        const quantityCell = document.createElement('td');
        quantityCell.classList.add('text-center');
        
        const quantityControls = document.createElement('div');
        quantityControls.classList.add('btn-group');
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.type = 'button';
        decreaseBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
        decreaseBtn.textContent = '-';
        decreaseBtn.addEventListener('click', () => updateQuantity(index, -1));
        
        const quantitySpan = document.createElement('span');
        quantitySpan.classList.add('px-2', 'py-1');
        quantitySpan.textContent = item.quantity;
        
        const increaseBtn = document.createElement('button');
        increaseBtn.type = 'button';
        increaseBtn.classList.add('btn', 'btn-sm', 'btn-outline-secondary');
        increaseBtn.textContent = '+';
        increaseBtn.addEventListener('click', () => updateQuantity(index, 1));
        
        quantityControls.appendChild(decreaseBtn);
        quantityControls.appendChild(quantitySpan);
        quantityControls.appendChild(increaseBtn);
        
        quantityCell.appendChild(quantityControls);
        row.appendChild(quantityCell);
        
        // Total
        const totalCell = document.createElement('td');
        totalCell.textContent = `$${(item.price * item.quantity).toFixed(2)}`;
        totalCell.classList.add('text-end');
        row.appendChild(totalCell);
        
        // Remove button
        const actionCell = document.createElement('td');
        actionCell.classList.add('text-center');
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.classList.add('btn', 'btn-sm', 'btn-danger');
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', () => removeFromCart(index));
        
        actionCell.appendChild(removeBtn);
        row.appendChild(actionCell);
        
        cartContainer.appendChild(row);
    });
}

// Calculate totals
function calculateTotals() {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;
    
    return {
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2)
    };
}

// Update totals display
function updateTotals() {
    const totals = calculateTotals();
    
    document.getElementById('subtotal').textContent = `$${totals.subtotal}`;
    document.getElementById('tax').textContent = `$${totals.tax}`;
    document.getElementById('total').textContent = `$${totals.total}`;
}

// Process payment
function processPayment(paymentMethod) {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }
    
    const totals = calculateTotals();
    
    // If online, send to server
    if (isOnline) {
        fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart: cart,
                payment_method: paymentMethod
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Payment of $${totals.total} processed successfully`);
                clearCart();
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error processing payment:', error);
            alert('Error processing payment. Please try again.');
        });
    } else {
        // Store transaction for later sync
        const transaction = {
            date: new Date().toISOString().split('T')[0],
            total: parseFloat(totals.total),
            payment_method: paymentMethod,
            items: [...cart]
        };
        
        pendingTransactions.push(transaction);
        localStorage.setItem('pendingTransactions', JSON.stringify(pendingTransactions));
        
        const syncStatus = document.getElementById('sync-status');
        syncStatus.textContent = `${pendingTransactions.length} transactions pending sync`;
        
        alert(`Payment of $${totals.total} processed successfully (offline mode)`);
        clearCart();
    }
}

// Create invoice
function createInvoice() {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }
    
    const customerName = prompt('Enter customer name:');
    
    if (!customerName) return;
    
    const totals = calculateTotals();
    
    // If online, send to server
    if (isOnline) {
        fetch('/api/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cart: cart,
                payment_method: 'Invoice',
                customer_name: customerName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Invoice created for ${customerName}`);
                clearCart();
            } else {
                alert(`Error: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error creating invoice:', error);
            alert('Error creating invoice. Please try again.');
        });
    } else {
        // Store transaction for later sync
        const transaction = {
            date: new Date().toISOString().split('T')[0],
            total: parseFloat(totals.total),
            payment_method: 'Invoice',
            customer_name: customerName,
            items: [...cart]
        };
        
        pendingTransactions.push(transaction);
        localStorage.setItem('pendingTransactions', JSON.stringify(pendingTransactions));
        
        const syncStatus = document.getElementById('sync-status');
        syncStatus.textContent = `${pendingTransactions.length} transactions pending sync`;
        
        alert(`Invoice created for ${customerName} (offline mode)`);
        clearCart();
    }
}

// Clear the cart
function clearCart() {
    cart = [];
    saveCart();
    updateCartUI();
    updateTotals();
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    
    // Load pending transactions from localStorage
    const savedTransactions = localStorage.getItem('pendingTransactions');
    
    if (savedTransactions) {
        pendingTransactions = JSON.parse(savedTransactions);
        
        const syncStatus = document.getElementById('sync-status');
        syncStatus.textContent = `${pendingTransactions.length} transactions pending sync`;
    }
}