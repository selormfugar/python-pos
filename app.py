from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
import sqlite3
import json
import os
import datetime
import random
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Change this in production

# Database setup
DB_PATH = 'pos_database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if os.path.exists(DB_PATH):
        return
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    ''')
    
    # Create products table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        price REAL NOT NULL,
        current_stock INTEGER NOT NULL,
        min_stock INTEGER NOT NULL
    )
    ''')
    
    # Create sales table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY,
        date TEXT NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL
    )
    ''')
    
    # Create sale_items table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )
    ''')
    
    # Create invoices table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY,
        customer_name TEXT NOT NULL,
        date TEXT NOT NULL,
        total REAL NOT NULL,
        paid BOOLEAN NOT NULL
    )
    ''')
    
    # Add default admin user
    cursor.execute('''
    INSERT INTO users (username, password, role)
    VALUES (?, ?, ?)
    ''', ('admin', generate_password_hash('admin123'), 'admin'))
    
    # Add sample products
    products = [
        ("Coffee", "COF001", 3.50, 45, 10),
        ("Tea", "TEA001", 2.75, 38, 10),
        ("Sandwich", "SAN001", 5.99, 15, 5),
        ("Muffin", "MUF001", 2.50, 8, 10),
        ("Croissant", "CRO001", 2.25, 12, 8),
        ("Bottled Water", "WAT001", 1.50, 30, 15),
        ("Soda", "SOD001", 1.75, 25, 10),
        ("Salad", "SAL001", 6.99, 7, 5),
        ("Cookie", "COO001", 1.25, 20, 10),
        ("Bagel", "BAG001", 2.00, 14, 8)
    ]
    
    for product in products:
        try:
            cursor.execute('''
            INSERT INTO products (name, sku, price, current_stock, min_stock)
            VALUES (?, ?, ?, ?, ?)
            ''', product)
        except sqlite3.IntegrityError:
            pass  # Skip if product already exists
    
    # Sample sales for the past week
    today = datetime.datetime.now()
    for i in range(7):
        date = today - datetime.timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        
        # Generate 5-10 sales per day
        for _ in range(random.randint(5, 10)):
            payment = random.choice(["Cash", "Invoice"])
            total = random.uniform(5.0, 50.0)
            
            cursor.execute('''
            INSERT INTO sales (date, total, payment_method)
            VALUES (?, ?, ?)
            ''', (date_str, round(total, 2), payment))
            
            sale_id = cursor.lastrowid
            
            # Add 1-5 items to each sale
            for _ in range(random.randint(1, 5)):
                product_id = random.randint(1, len(products))
                quantity = random.randint(1, 3)
                price = products[product_id-1][2]  # Get price from sample products
                
                cursor.execute('''
                INSERT INTO sale_items (sale_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
                ''', (sale_id, product_id, quantity, price))
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return redirect(url_for('index'))
        
        flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Main routes
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('checkout.html', active_tab='checkout')

@app.route('/inventory')
def inventory():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('inventory.html', active_tab='inventory')

@app.route('/reports')
def reports():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    return render_template('reports.html', active_tab='reports')

# API routes for checkout
@app.route('/api/products', methods=['GET'])
def get_products():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    search = request.args.get('search', '')
    
    conn = get_db_connection()
    
    if search:
        products = conn.execute('''
        SELECT id, name, sku, price, current_stock, min_stock
        FROM products
        WHERE name LIKE ? OR sku LIKE ?
        ORDER BY name
        ''', (f'%{search}%', f'%{search}%')).fetchall()
    else:
        products = conn.execute('''
        SELECT id, name, sku, price, current_stock, min_stock
        FROM products
        ORDER BY name
        ''').fetchall()
    
    conn.close()
    
    return jsonify([dict(product) for product in products])

@app.route('/api/product/<int:product_id>', methods=['GET'])
def get_product(product_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
    conn.close()
    
    if product:
        return jsonify(dict(product))
    
    return jsonify({'error': 'Product not found'}), 404

@app.route('/api/checkout', methods=['POST'])
def checkout():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    cart = data.get('cart', [])
    payment_method = data.get('payment_method', 'Cash')
    customer_name = data.get('customer_name', '')
    
    if not cart:
        return jsonify({'error': 'Cart is empty'}), 400
    
    conn = get_db_connection()
    
    try:
        # Calculate total
        total = sum(item['price'] * item['quantity'] for item in cart)
        
        # Create sale record
        current_date = datetime.datetime.now().strftime("%Y-%m-%d")
        
        conn.execute('''
        INSERT INTO sales (date, total, payment_method)
        VALUES (?, ?, ?)
        ''', (current_date, total, payment_method))
        
        sale_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        
        # Add sale items
        for item in cart:
            conn.execute('''
            INSERT INTO sale_items (sale_id, product_id, quantity, price)
            VALUES (?, ?, ?, ?)
            ''', (sale_id, item['id'], item['quantity'], item['price']))
            
            # Update inventory
            conn.execute('''
            UPDATE products
            SET current_stock = current_stock - ?
            WHERE id = ?
            ''', (item['quantity'], item['id']))
        
        # Create invoice if needed
        if payment_method == 'Invoice' and customer_name:
            conn.execute('''
            INSERT INTO invoices (customer_name, date, total, paid)
            VALUES (?, ?, ?, ?)
            ''', (customer_name, current_date, total, False))
        
        conn.commit()
        
        return jsonify({'success': True, 'sale_id': sale_id})
    
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    
    finally:
        conn.close()

# API routes for inventory
@app.route('/api/products', methods=['POST'])
def add_product():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    
    name = data.get('name', '').strip()
    sku = data.get('sku', '').strip()
    price = data.get('price', 0)
    current_stock = data.get('current_stock', 0)
    min_stock = data.get('min_stock', 0)
    
    if not name or not sku:
        return jsonify({'error': 'Name and SKU are required'}), 400
    
    conn = get_db_connection()
    
    try:
        conn.execute('''
        INSERT INTO products (name, sku, price, current_stock, min_stock)
        VALUES (?, ?, ?, ?, ?)
        ''', (name, sku, price, current_stock, min_stock))
        
        conn.commit()
        
        return jsonify({'success': True})
    
    except sqlite3.IntegrityError:
        return jsonify({'error': f'SKU "{sku}" already exists'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    finally:
        conn.close()

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    
    name = data.get('name', '').strip()
    sku = data.get('sku', '').strip()
    price = data.get('price', 0)
    current_stock = data.get('current_stock', 0)
    min_stock = data.get('min_stock', 0)
    
    if not name or not sku:
        return jsonify({'error': 'Name and SKU are required'}), 400
    
    conn = get_db_connection()
    
    try:
        conn.execute('''
        UPDATE products
        SET name = ?, sku = ?, price = ?, current_stock = ?, min_stock = ?
        WHERE id = ?
        ''', (name, sku, price, current_stock, min_stock, product_id))
        
        conn.commit()
        
        return jsonify({'success': True})
    
    except sqlite3.IntegrityError:
        return jsonify({'error': f'SKU "{sku}" already exists'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    finally:
        conn.close()

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    
    try:
        conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
        conn.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    finally:
        conn.close()

# API routes for reports
@app.route('/api/reports/daily-sales', methods=['GET'])
def get_daily_sales():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    
    conn = get_db_connection()
    
    result = conn.execute('''
    SELECT SUM(total) as total_sales, COUNT(id) as transaction_count
    FROM sales
    WHERE date = ?
    ''', (today,)).fetchone()
    
    conn.close()
    
    total_sales = result['total_sales'] if result['total_sales'] else 0
    transaction_count = result['transaction_count'] if result['transaction_count'] else 0
    average_sale = total_sales / transaction_count if transaction_count > 0 else 0
    
    return jsonify({
        'total': round(total_sales, 2),
        'count': transaction_count,
        'average': round(average_sale, 2)
    })

@app.route('/api/reports/best-selling', methods=['GET'])
def get_best_selling():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    limit = request.args.get('limit', 5, type=int)
    
    conn = get_db_connection()
    
    products = conn.execute('''
    SELECT p.name, SUM(si.quantity) as total_sold
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.date >= date('now', '-7 days')
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT ?
    ''', (limit,)).fetchall()
    
    conn.close()
    
    return jsonify([{'name': p['name'], 'total_sold': p['total_sold']} for p in products])

@app.route('/api/reports/sales-trend', methods=['GET'])
def get_sales_trend():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    days = request.args.get('days', 7, type=int)
    
    conn = get_db_connection()
    
    dates = []
    sales = []
    
    today = datetime.datetime.now()
    
    for i in range(days):
        date = today - datetime.timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        formatted_date = date.strftime("%m/%d")
        
        result = conn.execute('''
        SELECT SUM(total) as daily_sales
        FROM sales
        WHERE date = ?
        ''', (date_str,)).fetchone()
        
        daily_sales = result['daily_sales'] if result['daily_sales'] else 0
        
        dates.append(formatted_date)
        sales.append(round(daily_sales, 2))
    
    conn.close()
    
    # Reverse lists to show chronological order
    dates.reverse()
    sales.reverse()
    
    return jsonify({
        'dates': dates,
        'sales': sales
    })

@app.route('/api/reports/invoices', methods=['GET'])
def get_invoices():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    
    invoices = conn.execute('''
    SELECT id, customer_name, date, total, paid
    FROM invoices
    ORDER BY date DESC
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict(invoice) for invoice in invoices])

@app.route('/api/reports/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    
    invoice = conn.execute('''
    SELECT id, customer_name, date, total, paid
    FROM invoices
    WHERE id = ?
    ''', (invoice_id,)).fetchone()
    
    conn.close()
    
    if invoice:
        return jsonify(dict(invoice))
    
    return jsonify({'error': 'Invoice not found'}), 404

@app.route('/api/reports/invoices/<int:invoice_id>/mark-paid', methods=['POST'])
def mark_invoice_paid(invoice_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    
    try:
        conn.execute('''
        UPDATE invoices
        SET paid = 1
        WHERE id = ?
        ''', (invoice_id,))
        
        conn.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(debug=True)