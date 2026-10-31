-- FinTrack Pro: Relational Database Schema (SQLite3)
-- Enhanced with User Management, Custom Categories, Budgets, and Indexed Transactions

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT 'demo1234',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    cat_type TEXT NOT NULL CHECK(cat_type IN ('income', 'expense')),
    color TEXT DEFAULT '#4f46e5',
    icon TEXT DEFAULT 'tag',
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    tx_type TEXT NOT NULL CHECK(tx_type IN ('income', 'expense')),
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    tx_date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    monthly_limit REAL NOT NULL CHECK(monthly_limit >= 0),
    UNIQUE(user_id, category),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- Seed Default Demo Student Account
INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (1, 'Demo Student', 'demo1234');

-- Seed Standard Categories for Demo User
INSERT OR IGNORE INTO categories (user_id, name, cat_type, color, icon) VALUES
(1, 'Food & Dining', 'expense', '#f59e0b', 'utensils'),
(1, 'Housing & Rent', 'expense', '#4f46e5', 'home'),
(1, 'Education & Books', 'expense', '#0ea5e9', 'book'),
(1, 'Transport', 'expense', '#8b5cf6', 'car'),
(1, 'Utilities & Bills', 'expense', '#06b6d4', 'receipt'),
(1, 'Entertainment', 'expense', '#ec4899', 'film'),
(1, 'Health & Wellness', 'expense', '#10b981', 'heart-pulse'),
(1, 'Shopping & Personal', 'expense', '#f97316', 'shopping-bag'),
(1, 'Income / Stipend', 'income', '#10b981', 'wallet'),
(1, 'Freelance / Projects', 'income', '#3b82f6', 'laptop');

-- Seed Standard Budgets for Demo User
INSERT OR IGNORE INTO budgets (user_id, category, monthly_limit) VALUES
(1, 'Food & Dining', 4500),
(1, 'Housing & Rent', 8000),
(1, 'Education & Books', 3500),
(1, 'Transport', 1800),
(1, 'Utilities & Bills', 1500),
(1, 'Entertainment', 1200),
(1, 'Health & Wellness', 1000),
(1, 'Shopping & Personal', 1500);

-- Seed Default Demo Transactions
INSERT OR IGNORE INTO transactions (id, user_id, title, amount, tx_type, category, payment_method, tx_date, notes) VALUES
(1, 1, 'Monthly Semester Stipend / Allowance', 25000, 'income', 'Income / Stipend', 'Net Banking', '2026-10-01', 'October family transfer'),
(2, 1, 'Hostel & Room Rent', 7500, 'expense', 'Housing & Rent', 'UPI / QR', '2026-10-03', 'Oct hostel fee'),
(3, 1, 'DBMS & Algorithms Textbooks', 2950, 'expense', 'Education & Books', 'UPI / QR', '2026-10-06', 'Semester reference books'),
(4, 1, 'Campus Canteen & Mess Pass', 3800, 'expense', 'Food & Dining', 'UPI / QR', '2026-10-10', 'Monthly meal plan'),
(5, 1, 'Metro & Bus Pass Recharge', 1100, 'expense', 'Transport', 'Debit Card', '2026-10-14', 'Student transit card'),
(6, 1, 'High-Speed Fiber & Mobile Data', 899, 'expense', 'Utilities & Bills', 'UPI / QR', '2026-10-19', 'Broadband bill'),
(7, 1, 'Weekend Movie & Pizza Night', 1350, 'expense', 'Entertainment', 'UPI / QR', '2026-10-24', 'Post-midterm outing');
