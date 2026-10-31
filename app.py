"""
FinTrack Pro — Full-Stack Personal & Semester Expense Tracker
Backend: Python 3 + Flask + SQLite3
"""
import csv
import io
import json
import os
import sqlite3
from datetime import datetime
from flask import Flask, jsonify, render_template, request, Response

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "expense_tracker.db")

DEFAULT_CATEGORIES = [
    {"name": "Food & Dining", "cat_type": "expense", "color": "#f59e0b", "icon": "utensils"},
    {"name": "Housing & Rent", "cat_type": "expense", "color": "#4f46e5", "icon": "home"},
    {"name": "Education & Books", "cat_type": "expense", "color": "#0ea5e9", "icon": "book"},
    {"name": "Transport", "cat_type": "expense", "color": "#8b5cf6", "icon": "car"},
    {"name": "Utilities & Bills", "cat_type": "expense", "color": "#06b6d4", "icon": "receipt"},
    {"name": "Entertainment", "cat_type": "expense", "color": "#ec4899", "icon": "film"},
    {"name": "Health & Wellness", "cat_type": "expense", "color": "#10b981", "icon": "heart-pulse"},
    {"name": "Shopping & Personal", "cat_type": "expense", "color": "#f97316", "icon": "shopping-bag"},
    {"name": "Income / Stipend", "cat_type": "income", "color": "#10b981", "icon": "wallet"},
    {"name": "Freelance / Projects", "cat_type": "income", "color": "#3b82f6", "icon": "laptop"},
]

DEFAULT_BUDGETS = {
    "Food & Dining": 4500,
    "Housing & Rent": 8000,
    "Education & Books": 3500,
    "Transport": 1800,
    "Utilities & Bills": 1500,
    "Entertainment": 1200,
    "Health & Wellness": 1000,
    "Shopping & Personal": 1500,
}


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_db() as conn:
        with open(os.path.join(os.path.dirname(__file__), "schema.sql"), "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status", methods=["GET"])
def server_status():
    """Health check endpoint used by the frontend to confirm active SQLite connection."""
    return jsonify({
        "status": "ok",
        "app": "FinTrack Pro",
        "storage": "sqlite",
        "version": "2.0"
    })


@app.route("/api/users", methods=["GET", "POST"])
def handle_users():
    conn = get_db()
    if request.method == "GET":
        rows = conn.execute("SELECT id, username, created_at FROM users ORDER BY id ASC").fetchall()
        return jsonify([dict(r) for r in rows])

    # POST: create user or find existing user
    data = request.get_json(force=True, silent=True) or {}
    username = data.get("username", "").strip()
    if not username:
        return jsonify({"error": "Username is required"}), 400

    row = conn.execute("SELECT id, username, created_at FROM users WHERE username = ?", (username,)).fetchone()
    if row:
        return jsonify(dict(row)), 200

    # Insert new user
    cur = conn.execute("INSERT INTO users (username, password_hash) VALUES (?, 'demo1234')", (username,))
    new_user_id = cur.lastrowid

    # Seed starter categories for new user
    for cat in DEFAULT_CATEGORIES:
        conn.execute(
            "INSERT OR IGNORE INTO categories (user_id, name, cat_type, color, icon) VALUES (?, ?, ?, ?, ?)",
            (new_user_id, cat["name"], cat["cat_type"], cat["color"], cat["icon"]),
        )

    # Seed starter budgets for new user
    for cat, limit_val in DEFAULT_BUDGETS.items():
        conn.execute(
            "INSERT OR IGNORE INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)",
            (new_user_id, cat, float(limit_val)),
        )

    conn.commit()
    return jsonify({"id": new_user_id, "username": username, "created_at": datetime.now().isoformat()}), 201


@app.route("/api/categories", methods=["GET", "POST"])
def handle_categories():
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))

    if request.method == "GET":
        rows = conn.execute(
            "SELECT id, user_id, name, cat_type, color, icon FROM categories WHERE user_id = ? ORDER BY cat_type DESC, name ASC",
            (user_id,),
        ).fetchall()

        if not rows:
            # Auto-seed if missing for this user
            for cat in DEFAULT_CATEGORIES:
                conn.execute(
                    "INSERT OR IGNORE INTO categories (user_id, name, cat_type, color, icon) VALUES (?, ?, ?, ?, ?)",
                    (user_id, cat["name"], cat["cat_type"], cat["color"], cat["icon"]),
                )
            conn.commit()
            rows = conn.execute(
                "SELECT id, user_id, name, cat_type, color, icon FROM categories WHERE user_id = ? ORDER BY cat_type DESC, name ASC",
                (user_id,),
            ).fetchall()

        return jsonify([dict(r) for r in rows])

    data = request.get_json(force=True, silent=True) or {}
    name = data.get("name", "").strip()
    cat_type = data.get("cat_type", "expense").strip().lower()
    color = data.get("color", "#4f46e5").strip()
    icon = data.get("icon", "tag").strip()

    if not name:
        return jsonify({"error": "Category name is required"}), 400
    if cat_type not in ("expense", "income"):
        return jsonify({"error": "cat_type must be 'expense' or 'income'"}), 400

    conn.execute(
        """
        INSERT INTO categories (user_id, name, cat_type, color, icon)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, name) DO UPDATE SET cat_type = excluded.cat_type, color = excluded.color, icon = excluded.icon
        """,
        (user_id, name, cat_type, color, icon),
    )
    conn.commit()
    return jsonify({"status": "created", "name": name, "cat_type": cat_type, "color": color, "icon": icon}), 201


@app.route("/api/categories/<path:category_name>", methods=["DELETE"])
def delete_category(category_name):
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))
    conn.execute("DELETE FROM categories WHERE user_id = ? AND name = ?", (user_id, category_name))
    conn.execute("DELETE FROM budgets WHERE user_id = ? AND category = ?", (user_id, category_name))
    conn.commit()
    return jsonify({"status": "deleted", "category": category_name})


@app.route("/api/transactions", methods=["GET", "POST"])
def handle_transactions():
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))

    if request.method == "GET":
        month = request.args.get("month", "").strip()
        start_date = request.args.get("start_date", "").strip()
        end_date = request.args.get("end_date", "").strip()
        category = request.args.get("category", "").strip()
        tx_type = request.args.get("tx_type", "").strip()
        payment_method = request.args.get("payment_method", "").strip()
        q = request.args.get("q", "").strip().lower()
        sort_by = request.args.get("sort_by", "tx_date").strip()
        order = request.args.get("order", "desc").strip().lower()

        query = "SELECT * FROM transactions WHERE user_id = ?"
        params = [user_id]

        if month:
            query += " AND tx_date LIKE ?"
            params.append(f"{month}%")
        if start_date:
            query += " AND tx_date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND tx_date <= ?"
            params.append(end_date)
        if category and category != "ALL":
            query += " AND category = ?"
            params.append(category)
        if tx_type and tx_type != "ALL":
            query += " AND tx_type = ?"
            params.append(tx_type)
        if payment_method and payment_method != "ALL":
            query += " AND payment_method = ?"
            params.append(payment_method)
        if q:
            query += " AND (LOWER(title) LIKE ? OR LOWER(notes) LIKE ?)"
            params.extend([f"%{q}%", f"%{q}%"])

        # Sorting
        valid_sort_cols = {"tx_date": "tx_date", "amount": "amount", "title": "title", "id": "id"}
        col = valid_sort_cols.get(sort_by, "tx_date")
        dir_sql = "ASC" if order == "asc" else "DESC"
        query += f" ORDER BY {col} {dir_sql}, id DESC"

        rows = conn.execute(query, params).fetchall()
        return jsonify([dict(r) for r in rows])

    # POST: Create transaction
    data = request.get_json(force=True, silent=True) or {}
    title = data.get("title", "").strip()
    try:
        amount = float(data.get("amount", 0))
    except (ValueError, TypeError):
        amount = 0

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    tx_type = data.get("tx_type", "expense").strip().lower()
    if tx_type not in ("income", "expense"):
        return jsonify({"error": "tx_type must be 'income' or 'expense'"}), 400

    category = data.get("category", "Uncategorized").strip()
    payment_method = data.get("payment_method", "UPI / QR").strip()
    tx_date = data.get("tx_date", datetime.today().strftime("%Y-%m-%d")).strip()
    notes = data.get("notes", "").strip()

    cur = conn.execute(
        """
        INSERT INTO transactions (user_id, title, amount, tx_type, category, payment_method, tx_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, title, amount, tx_type, category, payment_method, tx_date, notes),
    )
    conn.commit()
    new_id = cur.lastrowid
    created = conn.execute("SELECT * FROM transactions WHERE id = ?", (new_id,)).fetchone()
    return jsonify({"status": "created", "transaction": dict(created)}), 201


@app.route("/api/transactions/<int:tx_id>", methods=["GET", "PUT", "DELETE"])
def modify_transaction(tx_id):
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))

    if request.method == "GET":
        row = conn.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id)).fetchone()
        if not row:
            return jsonify({"error": "Transaction not found"}), 404
        return jsonify(dict(row))

    if request.method == "DELETE":
        conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
        conn.commit()
        return jsonify({"status": "deleted", "id": tx_id})

    data = request.get_json(force=True, silent=True) or {}
    title = data.get("title", "").strip()
    try:
        amount = float(data.get("amount", 0))
    except (ValueError, TypeError):
        amount = 0

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    tx_type = data.get("tx_type", "expense").strip().lower()
    category = data.get("category", "Uncategorized").strip()
    payment_method = data.get("payment_method", "UPI / QR").strip()
    tx_date = data.get("tx_date", "").strip()
    notes = data.get("notes", "").strip()

    conn.execute(
        """
        UPDATE transactions
        SET title = ?, amount = ?, tx_type = ?, category = ?, payment_method = ?, tx_date = ?, notes = ?
        WHERE id = ? AND user_id = ?
        """,
        (title, amount, tx_type, category, payment_method, tx_date, notes, tx_id, user_id),
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,)).fetchone()
    return jsonify({"status": "updated", "transaction": dict(updated) if updated else {}})


@app.route("/api/budgets", methods=["GET", "POST"])
def handle_budgets():
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))

    if request.method == "GET":
        rows = conn.execute("SELECT category, monthly_limit FROM budgets WHERE user_id = ?", (user_id,)).fetchall()
        budgets_dict = {r["category"]: r["monthly_limit"] for r in rows}
        if not budgets_dict:
            # Seed default budgets
            for cat, limit in DEFAULT_BUDGETS.items():
                conn.execute(
                    "INSERT OR IGNORE INTO budgets (user_id, category, monthly_limit) VALUES (?, ?, ?)",
                    (user_id, cat, float(limit)),
                )
            conn.commit()
            rows = conn.execute("SELECT category, monthly_limit FROM budgets WHERE user_id = ?", (user_id,)).fetchall()
            budgets_dict = {r["category"]: r["monthly_limit"] for r in rows}
        return jsonify(budgets_dict)

    data = request.get_json(force=True, silent=True) or {}
    for category, limit_val in data.items():
        try:
            val = max(0.0, float(limit_val))
        except (ValueError, TypeError):
            val = 0.0
        conn.execute(
            """
            INSERT INTO budgets (user_id, category, monthly_limit)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit = excluded.monthly_limit
            """,
            (user_id, category.strip(), val),
        )
    conn.commit()
    return jsonify({"status": "budgets_updated"})


@app.route("/api/summary", methods=["GET"])
def get_summary():
    """Aggregated analytical KPIs, category spending, daily spend curve, and budget status."""
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))
    month = request.args.get("month", "").strip()

    # Get transactions for month
    query = "SELECT * FROM transactions WHERE user_id = ?"
    params = [user_id]
    if month:
        query += " AND tx_date LIKE ?"
        params.append(f"{month}%")
    query += " ORDER BY tx_date ASC"
    rows = conn.execute(query, params).fetchall()

    # Get budgets
    budget_rows = conn.execute("SELECT category, monthly_limit FROM budgets WHERE user_id = ?", (user_id,)).fetchall()
    budgets = {r["category"]: float(r["monthly_limit"]) for r in budget_rows}

    total_income = 0.0
    income_count = 0
    total_expense = 0.0
    expense_count = 0
    category_spending = {}
    payment_methods = {}
    daily_spend = {}

    for r in rows:
        amt = float(r["amount"])
        if r["tx_type"] == "income":
            total_income += amt
            income_count += 1
        else:
            total_expense += amt
            expense_count += 1
            cat = r["category"]
            category_spending[cat] = category_spending.get(cat, 0.0) + amt
            pm = r["payment_method"] or "Other"
            payment_methods[pm] = payment_methods.get(pm, 0.0) + amt
            date_key = r["tx_date"]
            daily_spend[date_key] = daily_spend.get(date_key, 0.0) + amt

    net_balance = total_income - total_expense
    savings_rate = round((net_balance / total_income) * 100) if total_income > 0 else 0
    total_budget = sum(budgets.values())
    budget_used_pct = round((total_expense / total_budget) * 100) if total_budget > 0 else 0

    # Build category budget comparison
    budget_comparison = []
    all_categories = set(list(category_spending.keys()) + list(budgets.keys()))
    for cat in sorted(all_categories):
        spent = category_spending.get(cat, 0.0)
        limit = budgets.get(cat, 0.0)
        pct = round((spent / limit) * 100) if limit > 0 else 0
        budget_comparison.append({
            "category": cat,
            "spent": spent,
            "limit": limit,
            "percent_used": pct,
            "is_over": spent > limit and limit > 0,
            "is_warning": 80 <= pct < 100 and limit > 0
        })

    return jsonify({
        "month": month,
        "total_income": total_income,
        "income_count": income_count,
        "total_expense": total_expense,
        "expense_count": expense_count,
        "net_balance": net_balance,
        "savings_rate": savings_rate,
        "total_budget": total_budget,
        "budget_used_pct": budget_used_pct,
        "category_spending": category_spending,
        "payment_methods": payment_methods,
        "daily_spend": [{"date": d, "amount": amt} for d, amt in sorted(daily_spend.items())],
        "budget_comparison": budget_comparison
    })


@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))
    month = request.args.get("month", "").strip()

    query = "SELECT id, tx_date, tx_type, category, title, amount, payment_method, notes FROM transactions WHERE user_id = ?"
    params = [user_id]
    if month:
        query += " AND tx_date LIKE ?"
        params.append(f"{month}%")
    query += " ORDER BY tx_date DESC, id DESC"

    rows = conn.execute(query, params).fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Type", "Category", "Title", "Amount", "Payment Method", "Notes"])
    for r in rows:
        writer.writerow([r["id"], r["tx_date"], r["tx_type"], r["category"], r["title"], r["amount"], r["payment_method"], r["notes"]])

    filename = f"FinTrack_User{user_id}_{month or 'all'}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.route("/api/export/json", methods=["GET"])
def export_json():
    """Exports full database snapshot for the active user as JSON."""
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))

    user = conn.execute("SELECT id, username, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    transactions = [dict(r) for r in conn.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY tx_date ASC", (user_id,)).fetchall()]
    budgets = {r["category"]: r["monthly_limit"] for r in conn.execute("SELECT category, monthly_limit FROM budgets WHERE user_id = ?", (user_id,)).fetchall()}
    categories = [dict(r) for r in conn.execute("SELECT name, cat_type, color, icon FROM categories WHERE user_id = ?", (user_id,)).fetchall()]

    payload = {
        "version": "2.0",
        "exported_at": datetime.now().isoformat(),
        "user": dict(user) if user else {"id": user_id, "username": "Demo Student"},
        "categories": categories,
        "budgets": budgets,
        "transactions": transactions,
    }

    return Response(
        json.dumps(payload, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename=FinTrack_Backup_User{user_id}.json"},
    )


@app.route("/api/import/json", methods=["POST"])
def import_json():
    """Imports transactions, categories, and budgets from JSON payload."""
    conn = get_db()
    user_id = int(request.args.get("user_id", 1))
    data = request.get_json(force=True, silent=True) or {}

    imported_tx_count = 0
    imported_budget_count = 0

    try:
        # Import categories if provided
        for cat in data.get("categories", []):
            if isinstance(cat, dict) and cat.get("name"):
                conn.execute(
                    """
                    INSERT INTO categories (user_id, name, cat_type, color, icon)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(user_id, name) DO UPDATE SET cat_type = excluded.cat_type, color = excluded.color
                    """,
                    (user_id, cat["name"], cat.get("cat_type", "expense"), cat.get("color", "#4f46e5"), cat.get("icon", "tag")),
                )

        # Import budgets if provided
        budgets = data.get("budgets", {})
        if isinstance(budgets, dict):
            for cat, limit in budgets.items():
                conn.execute(
                    """
                    INSERT INTO budgets (user_id, category, monthly_limit)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id, category) DO UPDATE SET monthly_limit = excluded.monthly_limit
                    """,
                    (user_id, cat, float(limit)),
                )
                imported_budget_count += 1

        # Import transactions if provided
        for tx in data.get("transactions", []):
            if isinstance(tx, dict) and tx.get("title") and tx.get("amount"):
                conn.execute(
                    """
                    INSERT INTO transactions (user_id, title, amount, tx_type, category, payment_method, tx_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        user_id,
                        tx["title"],
                        float(tx["amount"]),
                        tx.get("tx_type", "expense"),
                        tx.get("category", "Uncategorized"),
                        tx.get("payment_method", "UPI / QR"),
                        tx.get("tx_date", datetime.today().strftime("%Y-%m-%d")),
                        tx.get("notes", ""),
                    ),
                )
                imported_tx_count += 1

        conn.commit()
        return jsonify({
            "status": "imported",
            "transactions_imported": imported_tx_count,
            "budgets_imported": imported_budget_count,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": f"Failed to import JSON: {str(e)}"}), 400


@app.route("/api/reset-demo", methods=["POST"])
def reset_demo():
    """Resets Demo Student user (id=1) to original factory starter state."""
    conn = get_db()
    with open(os.path.join(os.path.dirname(__file__), "schema.sql"), "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()
    return jsonify({"status": "demo_reset_complete"})


if __name__ == "__main__":
    init_db()
    print("Starting FinTrack Pro Flask Server at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
