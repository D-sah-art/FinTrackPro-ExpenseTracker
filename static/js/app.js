/**
 * FinTrack Pro — Full-Stack Personal & Semester Expense Tracker
 * Frontend Application Engine (Dual SQLite REST API + Offline LocalStorage Fallback)
 */
if (window.__FINTRACK_APP_LOADED__) {
  console.log('FinTrack engine already active.');
} else {
window.__FINTRACK_APP_LOADED__ = true;


// Default starter data used for initial setup or offline mode
const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', cat_type: 'expense', color: '#f59e0b', icon: 'utensils' },
  { name: 'Housing & Rent', cat_type: 'expense', color: '#4f46e5', icon: 'home' },
  { name: 'Education & Books', cat_type: 'expense', color: '#0ea5e9', icon: 'book' },
  { name: 'Transport', cat_type: 'expense', color: '#8b5cf6', icon: 'car' },
  { name: 'Utilities & Bills', cat_type: 'expense', color: '#06b6d4', icon: 'receipt' },
  { name: 'Entertainment', cat_type: 'expense', color: '#ec4899', icon: 'film' },
  { name: 'Health & Wellness', cat_type: 'expense', color: '#10b981', icon: 'heart-pulse' },
  { name: 'Shopping & Personal', cat_type: 'expense', color: '#f97316', icon: 'shopping-bag' },
  { name: 'Income / Stipend', cat_type: 'income', color: '#10b981', icon: 'wallet' },
  { name: 'Freelance / Projects', cat_type: 'income', color: '#3b82f6', icon: 'laptop' }
];

const DEFAULT_BUDGETS = {
  'Food & Dining': 4500,
  'Housing & Rent': 8000,
  'Education & Books': 3500,
  'Transport': 1800,
  'Utilities & Bills': 1500,
  'Entertainment': 1200,
  'Health & Wellness': 1000,
  'Shopping & Personal': 1500
};

const DEFAULT_TRANSACTIONS = [
  { id: 1, user_id: 1, title: 'Monthly Semester Stipend / Allowance', amount: 25000, tx_type: 'income', category: 'Income / Stipend', payment_method: 'Net Banking', tx_date: '2026-10-01', notes: 'October family transfer' },
  { id: 2, user_id: 1, title: 'Hostel & Room Rent', amount: 7500, tx_type: 'expense', category: 'Housing & Rent', payment_method: 'UPI / QR', tx_date: '2026-10-03', notes: 'Oct hostel fee' },
  { id: 3, user_id: 1, title: 'DBMS & Algorithms Textbooks', amount: 2950, tx_type: 'expense', category: 'Education & Books', payment_method: 'UPI / QR', tx_date: '2026-10-06', notes: 'Semester reference books' },
  { id: 4, user_id: 1, title: 'Campus Canteen & Mess Pass', amount: 3800, tx_type: 'expense', category: 'Food & Dining', payment_method: 'UPI / QR', tx_date: '2026-10-10', notes: 'Monthly meal plan' },
  { id: 5, user_id: 1, title: 'Metro & Bus Pass Recharge', amount: 1100, tx_type: 'expense', category: 'Transport', payment_method: 'Debit Card', tx_date: '2026-10-14', notes: 'Student transit card' },
  { id: 6, user_id: 1, title: 'High-Speed Fiber & Mobile Data', amount: 899, tx_type: 'expense', category: 'Utilities & Bills', payment_method: 'UPI / QR', tx_date: '2026-10-19', notes: 'Broadband bill' },
  { id: 7, user_id: 1, title: 'Weekend Movie & Pizza Night', amount: 1350, tx_type: 'expense', category: 'Entertainment', payment_method: 'UPI / QR', tx_date: '2026-10-24', notes: 'Post-midterm outing' }
];

// App Global State
let state = {
  isServerMode: false,
  currentUser: 'Demo Student',
  currentUserId: 1,
  currency: '₹',
  selectedMonth: '2026-10',
  theme: 'dark',
  activeTab: 'dashboard',
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  budgets: { ...DEFAULT_BUDGETS },
  transactions: JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS)),
  allUsers: [{ id: 1, username: 'Demo Student' }],
  filters: {
    q: '',
    category: 'ALL',
    type: 'ALL',
    method: 'ALL',
    startDate: '',
    endDate: '',
    sortBy: 'tx_date',
    sortOrder: 'desc'
  }
};

// Chart instances
let categoryChart = null;
let trendChart = null;
let budgetCompareChart = null;
let paymentMethodChart = null;

// ==========================================
// 1. Persistence & API Synchronization Layer
// ==========================================

async function checkServerConnection() {
  if (!window.location.protocol.startsWith('http')) {
    state.isServerMode = false;
    updateConnectionIndicator();
    return false;
  }
  try {
    const res = await fetch('/api/status', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      state.isServerMode = (data.status === 'ok');
    } else {
      state.isServerMode = false;
    }
  } catch (err) {
    state.isServerMode = false;
  }
  updateConnectionIndicator();
  return state.isServerMode;
}

function updateConnectionIndicator() {
  const badge = document.getElementById('serverStatusBadge');
  if (!badge) return;
  if (state.isServerMode) {
    badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> SQLite API Synced`;
  } else {
    badge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30';
    badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> Local Offline Mode`;
  }
}

function loadLocalStorage() {
  try {
    const saved = localStorage.getItem('fintrack_v2_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentUser) state.currentUser = parsed.currentUser;
      if (parsed.currentUserId) state.currentUserId = parsed.currentUserId;
      if (parsed.currency) state.currency = parsed.currency;
      if (parsed.selectedMonth) state.selectedMonth = parsed.selectedMonth;
      if (parsed.theme) state.theme = parsed.theme;
      if (parsed.categories) state.categories = parsed.categories;
      if (parsed.budgets) state.budgets = parsed.budgets;
      if (parsed.transactions) state.transactions = parsed.transactions;
      if (parsed.allUsers) state.allUsers = parsed.allUsers;
    }
  } catch (e) {
    console.warn('LocalStorage load error', e);
  }
}

function saveLocalStorage() {
  try {
    localStorage.setItem('fintrack_v2_state', JSON.stringify({
      currentUser: state.currentUser,
      currentUserId: state.currentUserId,
      currency: state.currency,
      selectedMonth: state.selectedMonth,
      theme: state.theme,
      categories: state.categories,
      budgets: state.budgets,
      transactions: state.transactions,
      allUsers: state.allUsers
    }));
  } catch (e) {
    console.warn('LocalStorage save error', e);
  }
}

async function syncAllData() {
  if (state.isServerMode) {
    try {
      // 1. Fetch Users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) state.allUsers = await usersRes.json();

      // 2. Fetch Categories
      const catRes = await fetch(`/api/categories?user_id=${state.currentUserId}`);
      if (catRes.ok) state.categories = await catRes.json();

      // 3. Fetch Budgets
      const bRes = await fetch(`/api/budgets?user_id=${state.currentUserId}`);
      if (bRes.ok) state.budgets = await bRes.json();

      // 4. Fetch Transactions for active month or all
      const txRes = await fetch(`/api/transactions?user_id=${state.currentUserId}`);
      if (txRes.ok) state.transactions = await txRes.json();

      saveLocalStorage(); // keep offline copy updated
    } catch (err) {
      console.warn('API sync failed, falling back to local copy', err);
      state.isServerMode = false;
      updateConnectionIndicator();
    }
  }
}

// ==========================================
// 2. Data Access Operations (CRUD)
// ==========================================

async function createTransaction(payload) {
  if (state.isServerMode) {
    try {
      const res = await fetch(`/api/transactions?user_id=${state.currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        state.transactions.unshift(data.transaction);
        saveLocalStorage();
        return data.transaction;
      }
    } catch (err) {
      console.warn('Create tx API error', err);
    }
  }
  // Offline fallback
  payload.id = Date.now();
  payload.user_id = state.currentUserId;
  state.transactions.unshift(payload);
  saveLocalStorage();
  return payload;
}

async function updateTransaction(id, payload) {
  if (state.isServerMode) {
    try {
      const res = await fetch(`/api/transactions/${id}?user_id=${state.currentUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const idx = state.transactions.findIndex(t => t.id == id);
        if (idx !== -1) state.transactions[idx] = data.transaction;
        saveLocalStorage();
        return data.transaction;
      }
    } catch (err) {
      console.warn('Update tx API error', err);
    }
  }
  // Offline fallback
  const idx = state.transactions.findIndex(t => t.id == id);
  if (idx !== -1) {
    state.transactions[idx] = { ...state.transactions[idx], ...payload };
    saveLocalStorage();
  }
  return state.transactions[idx];
}

async function deleteTransaction(id) {
  if (state.isServerMode) {
    try {
      const res = await fetch(`/api/transactions/${id}?user_id=${state.currentUserId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        state.transactions = state.transactions.filter(t => t.id != id);
        saveLocalStorage();
        return true;
      }
    } catch (err) {
      console.warn('Delete tx API error', err);
    }
  }
  // Offline fallback
  state.transactions = state.transactions.filter(t => t.id != id);
  saveLocalStorage();
  return true;
}

async function saveBudgetLimits(budgetsObj) {
  state.budgets = { ...state.budgets, ...budgetsObj };
  if (state.isServerMode) {
    try {
      await fetch(`/api/budgets?user_id=${state.currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetsObj)
      });
    } catch (err) {
      console.warn('Save budgets API error', err);
    }
  }
  saveLocalStorage();
}

async function addCustomCategory(catData) {
  if (state.isServerMode) {
    try {
      const res = await fetch(`/api/categories?user_id=${state.currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
      });
      if (res.ok) {
        await syncAllData();
        return true;
      }
    } catch (err) {
      console.warn('Add category API error', err);
    }
  }
  // Offline fallback
  const exists = state.categories.find(c => c.name.toLowerCase() === catData.name.toLowerCase());
  if (!exists) {
    state.categories.push(catData);
    if (catData.cat_type === 'expense') {
      state.budgets[catData.name] = 2000;
    }
    saveLocalStorage();
  }
  return true;
}

async function deleteCustomCategory(name) {
  if (state.isServerMode) {
    try {
      await fetch(`/api/categories/${encodeURIComponent(name)}?user_id=${state.currentUserId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn('Delete category API error', err);
    }
  }
  state.categories = state.categories.filter(c => c.name !== name);
  delete state.budgets[name];
  saveLocalStorage();
}

async function loginOrCreateUser(username) {
  username = username.trim();
  if (!username) return;
  if (state.isServerMode) {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (res.ok) {
        const u = await res.json();
        state.currentUser = u.username;
        state.currentUserId = u.id;
        await syncAllData();
        return;
      }
    } catch (err) {
      console.warn('User login API error', err);
    }
  }
  // Offline fallback
  state.currentUser = username;
  let found = state.allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!found) {
    found = { id: Date.now(), username };
    state.allUsers.push(found);
  }
  state.currentUserId = found.id;
  saveLocalStorage();
}

// ==========================================
// 3. UI Helpers & Formatting
// ==========================================

function formatMoney(amount) {
  const num = Number(amount) || 0;
  return state.currency + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : type === 'warning' ? 'bg-amber-600' : 'bg-indigo-600';
  toast.className = `${bg} text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-3 pointer-events-auto transition transform translate-y-2 opacity-0 duration-200`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<div class="flex items-center gap-2"><span>${icon}</span><span>${message}</span></div><button type="button" class="text-white/80 hover:text-white font-bold ml-3">✕</button>`;

  toast.querySelector('button').onclick = () => toast.remove();
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function getExpenseCategories() {
  return state.categories.filter(c => c.cat_type === 'expense');
}

function getIncomeCategories() {
  return state.categories.filter(c => c.cat_type === 'income');
}

function getCategoryColor(catName) {
  const cat = state.categories.find(c => c.name === catName);
  return cat ? cat.color : '#6366f1';
}

function getFilteredTransactions() {
  const m = state.selectedMonth;
  const f = state.filters;
  return state.transactions.filter(t => {
    // Month filter
    if (m && !f.startDate && !f.endDate) {
      if (!t.tx_date.startsWith(m)) return false;
    }
    // Custom date range
    if (f.startDate && t.tx_date < f.startDate) return false;
    if (f.endDate && t.tx_date > f.endDate) return false;
    // Category filter
    if (f.category !== 'ALL' && t.category !== f.category) return false;
    // Type filter
    if (f.type !== 'ALL' && t.tx_type !== f.type) return false;
    // Payment method filter
    if (f.method !== 'ALL' && t.payment_method !== f.method) return false;
    // Search query
    if (f.q) {
      const q = f.q.toLowerCase();
      const inTitle = (t.title || '').toLowerCase().includes(q);
      const inNotes = (t.notes || '').toLowerCase().includes(q);
      const inCat = (t.category || '').toLowerCase().includes(q);
      if (!inTitle && !inNotes && !inCat) return false;
    }
    return true;
  }).sort((a, b) => {
    if (f.sortBy === 'amount') {
      return f.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    if (f.sortBy === 'title') {
      return f.sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
    }
    // Default by date
    return f.sortOrder === 'asc' ? a.tx_date.localeCompare(b.tx_date) : b.tx_date.localeCompare(a.tx_date);
  });
}

// ==========================================
// 4. Rendering & Analytics Engine
// ==========================================

function renderAll() {
  // Update header and meta inputs
  const badge = document.getElementById('currentUserBadge');
  if (badge) badge.textContent = state.currentUser;
  
  const mInput = document.getElementById('monthFilter');
  if (mInput && mInput.value !== state.selectedMonth) mInput.value = state.selectedMonth;

  const curSelect = document.getElementById('currencySelect');
  if (curSelect) curSelect.value = state.currency;

  populateCategoryDropdowns();

  // Active month transactions for dashboard
  const monthTx = state.transactions.filter(t => !state.selectedMonth || t.tx_date.startsWith(state.selectedMonth));

  let totalIncome = 0;
  let incomeCount = 0;
  let totalExpense = 0;
  let expenseCount = 0;
  const catSpend = {};
  const pmSpend = {};
  const dailySpend = {};

  getExpenseCategories().forEach(c => { catSpend[c.name] = 0; });

  monthTx.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.tx_type === 'income') {
      totalIncome += amt;
      incomeCount++;
    } else {
      totalExpense += amt;
      expenseCount++;
      catSpend[t.category] = (catSpend[t.category] || 0) + amt;
      const pm = t.payment_method || 'Other';
      pmSpend[pm] = (pmSpend[pm] || 0) + amt;
      dailySpend[t.tx_date] = (dailySpend[t.tx_date] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;
  const totalBudget = Object.values(state.budgets).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalExpense / totalBudget) * 100) : 0;

  // Compute Daily Average & Projected Spend
  const daysInMonth = 30;
  const daysElapsed = Math.min(daysInMonth, new Date().getDate());
  const avgDailySpend = daysElapsed > 0 ? totalExpense / daysElapsed : 0;
  const projectedSpend = avgDailySpend * daysInMonth;

  // Render KPIs
  const elIncome = document.getElementById('kpiIncome');
  if (elIncome) elIncome.textContent = formatMoney(totalIncome);
  const elIncomeCount = document.getElementById('kpiIncomeCount');
  if (elIncomeCount) elIncomeCount.textContent = `${incomeCount} deposit(s) in ${state.selectedMonth}`;

  const elExpense = document.getElementById('kpiExpense');
  if (elExpense) elExpense.textContent = formatMoney(totalExpense);
  const elExpenseCount = document.getElementById('kpiExpenseCount');
  if (elExpenseCount) elExpenseCount.textContent = `Avg ${formatMoney(avgDailySpend)}/day (${expenseCount} total)`;

  const elBalance = document.getElementById('kpiBalance');
  if (elBalance) {
    elBalance.textContent = formatMoney(netBalance);
    elBalance.className = `text-2xl lg:text-3xl font-extrabold font-display mt-1 ${netBalance >= 0 ? 'text-indigo-400' : 'text-rose-400'}`;
  }
  const elSavingsRate = document.getElementById('kpiSavingsRate');
  if (elSavingsRate) elSavingsRate.textContent = `Savings rate: ${savingsRate}% (${netBalance >= 0 ? 'Surplus' : 'Deficit'})`;

  const elBudgetPct = document.getElementById('kpiBudgetPct');
  if (elBudgetPct) elBudgetPct.textContent = `${budgetPct}%`;

  const elBudgetRemaining = document.getElementById('kpiBudgetRemaining');
  if (elBudgetRemaining) {
    const rem = totalBudget - totalExpense;
    elBudgetRemaining.textContent = rem >= 0 ? `${formatMoney(rem)} remaining` : `${formatMoney(Math.abs(rem))} over budget`;
  }

  const kpiBar = document.getElementById('kpiBudgetBar');
  if (kpiBar) {
    kpiBar.style.width = `${Math.min(100, budgetPct)}%`;
    kpiBar.className = `h-full rounded-full transition-all duration-500 ${budgetPct >= 100 ? 'bg-rose-500' : budgetPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`;
  }

  // Render Alert Banners
  renderAlertBanners(catSpend);

  // Render Recent Transactions
  renderRecentTable(monthTx.slice(0, 6));

  // Render Full Transactions with Active Filters
  renderFullTransactionsTable();

  // Render Budgets Tab
  renderBudgetGrid(catSpend);

  // Render Categories Tab
  renderCategoriesGrid();

  // Render Analytics & Report Tab
  renderAnalyticsTab(totalIncome, totalExpense, netBalance, avgDailySpend, projectedSpend, catSpend);

  // Update Charts
  renderCharts(catSpend, pmSpend, dailySpend);
}

function renderAlertBanners(catSpend) {
  const area = document.getElementById('alertBannerArea');
  if (!area) return;

  const alerts = [];
  getExpenseCategories().forEach(c => {
    const spent = catSpend[c.name] || 0;
    const limit = Number(state.budgets[c.name] || 0);
    if (limit > 0) {
      const pct = Math.round((spent / limit) * 100);
      if (pct >= 100) {
        alerts.push({
          level: 'exceeded',
          category: c.name,
          text: `Budget Exceeded for ${c.name}: ${pct}% used (${formatMoney(spent)} / ${formatMoney(limit)})`
        });
      } else if (pct >= 80) {
        alerts.push({
          level: 'warning',
          category: c.name,
          text: `Budget Warning for ${c.name}: ${pct}% of limit reached (${formatMoney(spent)} / ${formatMoney(limit)})`
        });
      }
    }
  });

  if (alerts.length === 0) {
    area.innerHTML = '';
    return;
  }

  area.innerHTML = alerts.map(a => `
    <div class="mb-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-3 ${
      a.level === 'exceeded'
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    }">
      <div class="flex items-center gap-2">
        <span class="text-base">${a.level === 'exceeded' ? '🚨' : '⚠️'}</span>
        <span>${a.text}</span>
      </div>
      <button type="button" onclick="switchTab('budgets')" class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition">
        Adjust Cap &rarr;
      </button>
    </div>
  `).join('');
}

function createTxRowHtml(tx) {
  const isInc = tx.tx_type === 'income';
  const catColor = getCategoryColor(tx.category);
  return `
    <tr class="hover:bg-slate-500/5 transition border-b border-slate-200/50 dark:border-slate-800/80">
      <td class="py-3 px-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">${tx.tx_date}</td>
      <td class="py-3 px-3.5">
        <div class="font-semibold text-slate-900 dark:text-slate-100 text-sm">${escapeHtml(tx.title)}</div>
        ${tx.notes ? `<div class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">${escapeHtml(tx.notes)}</div>` : ''}
      </td>
      <td class="py-3 px-3.5">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style="background-color: ${catColor}15; color: ${catColor}; border: 1px solid ${catColor}30;">
          <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${catColor}"></span>
          ${escapeHtml(tx.category)}
        </span>
      </td>
      <td class="py-3 px-3.5 text-xs text-slate-500 dark:text-slate-400">${escapeHtml(tx.payment_method || 'UPI / QR')}</td>
      <td class="py-3 px-3.5 text-right font-display font-bold text-sm whitespace-nowrap ${isInc ? 'text-emerald-500' : 'text-rose-500'}">
        ${isInc ? '+' : '-'}${formatMoney(tx.amount)}
      </td>
      <td class="py-3 px-3.5 text-right whitespace-nowrap no-print">
        <button type="button" data-action="edit" data-id="${tx.id}" class="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline mr-3">Edit</button>
        <button type="button" data-action="delete" data-id="${tx.id}" class="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline">Delete</button>
      </td>
    </tr>
  `;
}

function renderRecentTable(list) {
  const tbody = document.getElementById('recentTxTableBody');
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No transactions logged for ${state.selectedMonth}. Click "+ Add Transaction" or use a Quick Chip above.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(createTxRowHtml).join('');
}

function renderFullTransactionsTable() {
  const tbody = document.getElementById('fullTxTableBody');
  const countStrip = document.getElementById('txCountStrip');
  if (!tbody) return;

  const list = getFilteredTransactions();
  let subtotalExp = 0;
  let subtotalInc = 0;
  list.forEach(t => {
    if (t.tx_type === 'income') subtotalInc += Number(t.amount);
    else subtotalExp += Number(t.amount);
  });

  if (countStrip) {
    countStrip.innerHTML = `Showing <strong>${list.length}</strong> records • Total Expense: <strong class="text-rose-400">${formatMoney(subtotalExp)}</strong> • Total Income: <strong class="text-emerald-400">${formatMoney(subtotalInc)}</strong>`;
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No matching transactions found with the active filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(createTxRowHtml).join('');
}

function renderBudgetGrid(catSpend) {
  const grid = document.getElementById('budgetCardsGrid');
  if (!grid) return;

  const categories = getExpenseCategories();
  grid.innerHTML = categories.map(c => {
    const spent = catSpend[c.name] || 0;
    const limit = Number(state.budgets[c.name] || 0);
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const statusColor = pct >= 100 ? 'text-rose-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400';
    const barBg = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

    return `
      <div class="glass-card p-4 rounded-xl flex flex-col justify-between space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background-color: ${c.color}"></span>
            <span class="font-semibold text-sm text-slate-900 dark:text-slate-100">${escapeHtml(c.name)}</span>
          </div>
          <span class="text-xs font-bold ${statusColor}">${pct}% used</span>
        </div>

        <div class="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full overflow-hidden">
          <div class="${barBg} h-full transition-all duration-500" style="width: ${Math.min(100, pct)}%"></div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Spent: <strong class="text-slate-900 dark:text-slate-100">${formatMoney(spent)}</strong></span>
          <div class="flex items-center gap-1.5">
            <span>Limit:</span>
            <input type="number" data-budget-cat="${escapeHtml(c.name)}" value="${limit}" min="0" step="100" class="w-24 text-right border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCategoriesGrid() {
  const expenseListEl = document.getElementById('expenseCategoriesList');
  const incomeListEl = document.getElementById('incomeCategoriesList');

  if (expenseListEl) {
    const exp = getExpenseCategories();
    expenseListEl.innerHTML = exp.map(c => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 dark:border-slate-800/80">
        <div class="flex items-center gap-2.5">
          <span class="w-3.5 h-3.5 rounded-full" style="background-color: ${c.color}"></span>
          <span class="font-medium text-sm text-slate-900 dark:text-slate-100">${escapeHtml(c.name)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">Expense</span>
          <button type="button" data-delete-cat="${escapeHtml(c.name)}" class="text-xs text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg">✕</button>
        </div>
      </div>
    `).join('');
  }

  if (incomeListEl) {
    const inc = getIncomeCategories();
    incomeListEl.innerHTML = inc.map(c => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-500/5 border border-slate-200/50 dark:border-slate-800/80">
        <div class="flex items-center gap-2.5">
          <span class="w-3.5 h-3.5 rounded-full" style="background-color: ${c.color}"></span>
          <span class="font-medium text-sm text-slate-900 dark:text-slate-100">${escapeHtml(c.name)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-emerald-400 font-medium">Income</span>
          <button type="button" data-delete-cat="${escapeHtml(c.name)}" class="text-xs text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg">✕</button>
        </div>
      </div>
    `).join('');
  }
}

function renderAnalyticsTab(totalIncome, totalExpense, netBalance, avgDailySpend, projectedSpend, catSpend) {
  const topCatEl = document.getElementById('analyticsTopCategory');
  const avgSpendEl = document.getElementById('analyticsAvgDaily');
  const projSpendEl = document.getElementById('analyticsProjectedSpend');
  const highestTxEl = document.getElementById('analyticsHighestTx');

  // Find top spending category
  let topCat = 'None';
  let topAmt = 0;
  for (const [cat, amt] of Object.entries(catSpend)) {
    if (amt > topAmt) {
      topAmt = amt;
      topCat = cat;
    }
  }

  // Find highest single expense
  const monthExpenses = state.transactions.filter(t => t.tx_type === 'expense' && (!state.selectedMonth || t.tx_date.startsWith(state.selectedMonth)));
  let highestTx = null;
  monthExpenses.forEach(t => {
    if (!highestTx || Number(t.amount) > Number(highestTx.amount)) highestTx = t;
  });

  if (topCatEl) topCatEl.textContent = topAmt > 0 ? `${topCat} (${formatMoney(topAmt)})` : 'None';
  if (avgSpendEl) avgSpendEl.textContent = formatMoney(avgDailySpend) + ' / day';
  if (projSpendEl) projSpendEl.textContent = formatMoney(projectedSpend);
  if (highestTxEl) highestTxEl.textContent = highestTx ? `${highestTx.title} (${formatMoney(highestTx.amount)})` : 'None';
}

function renderCharts(catSpend, pmSpend, dailySpend) {
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  // 1. Category Doughnut Chart
  const expCategories = getExpenseCategories();
  const catLabels = expCategories.map(c => c.name);
  const catValues = catLabels.map(l => catSpend[l] || 0);
  const catColors = expCategories.map(c => c.color);

  const ctx1 = document.getElementById('categoryChart')?.getContext('2d');
  if (ctx1) {
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catValues,
          backgroundColor: catColors,
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, color: textColor, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 2. Daily Spending Trend Line Chart
  const sortedDates = Object.keys(dailySpend).sort();
  const trendLabels = sortedDates.length > 0 ? sortedDates.map(d => d.slice(8)) : ['01', '10', '20', '30'];
  const trendValues = sortedDates.length > 0 ? sortedDates.map(d => dailySpend[d]) : [0, 0, 0, 0];

  const ctx2 = document.getElementById('trendChart')?.getContext('2d');
  if (ctx2) {
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Daily Outflow',
          data: trendValues,
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129, 140, 248, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#6366f1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Day ${ctx.label}: ${formatMoney(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 3. Budget vs Actual Grouped Bar Chart
  const budgetValues = catLabels.map(l => Number(state.budgets[l] || 0));
  const ctx3 = document.getElementById('budgetCompareChart')?.getContext('2d');
  if (ctx3) {
    if (budgetCompareChart) budgetCompareChart.destroy();
    budgetCompareChart = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [
          {
            label: 'Monthly Limit',
            data: budgetValues,
            backgroundColor: isDark ? '#334155' : '#cbd5e1',
            borderRadius: 6
          },
          {
            label: 'Actual Spent',
            data: catValues,
            backgroundColor: '#6366f1',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 9 }, maxRotation: 45 } }
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, color: textColor, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 4. Payment Method Distribution Chart
  const pmLabels = Object.keys(pmSpend).length > 0 ? Object.keys(pmSpend) : ['UPI / QR', 'Debit Card', 'Cash', 'Net Banking'];
  const pmValues = pmLabels.map(l => pmSpend[l] || 0);
  const ctx4 = document.getElementById('paymentMethodChart')?.getContext('2d');
  if (ctx4) {
    if (paymentMethodChart) paymentMethodChart.destroy();
    paymentMethodChart = new Chart(ctx4, {
      type: 'doughnut',
      data: {
        labels: pmLabels,
        datasets: [{
          data: pmValues,
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
          borderWidth: 2,
          borderColor: isDark ? '#111827' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, color: textColor, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatMoney(ctx.raw)}`
            }
          }
        }
      }
    });
  }
}

function populateCategoryDropdowns() {
  const modalSelect = document.getElementById('txCategory');
  const filterSelect = document.getElementById('filterCategorySelect');
  const txType = document.getElementById('txType')?.value || 'expense';

  if (modalSelect) {
    const list = txType === 'income' ? getIncomeCategories() : getExpenseCategories();
    const currentVal = modalSelect.value;
    modalSelect.innerHTML = list.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join('');
    if (list.some(c => c.name === currentVal)) modalSelect.value = currentVal;
  }

  if (filterSelect) {
    const prev = filterSelect.value;
    filterSelect.innerHTML = `<option value="ALL">All Categories</option>` +
      state.categories.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${c.cat_type})</option>`).join('');
    filterSelect.value = prev || 'ALL';
  }
}

// ==========================================
// 5. Navigation & Modal Handling
// ==========================================

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-tab').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.className = 'nav-tab px-3.5 py-1.5 rounded-xl font-semibold text-xs sm:text-sm bg-indigo-600 text-white shadow-sm transition';
    } else {
      btn.className = 'nav-tab px-3.5 py-1.5 rounded-xl font-medium text-xs sm:text-sm text-slate-400 hover:text-white transition';
    }
  });
}

function openTxModal(editTx = null, prefill = null) {
  const modal = document.getElementById('txModal');
  const titleEl = document.getElementById('txModalTitle');
  titleEl.textContent = editTx ? 'Edit Transaction' : 'Record New Transaction';

  document.getElementById('txEditId').value = editTx ? editTx.id : '';
  const txTypeEl = document.getElementById('txType');
  txTypeEl.value = editTx ? editTx.tx_type : (prefill ? prefill.type : 'expense');

  populateCategoryDropdowns();

  document.getElementById('txDate').value = editTx ? editTx.tx_date : `${state.selectedMonth}-15`;
  document.getElementById('txTitle').value = editTx ? editTx.title : (prefill ? prefill.title : '');
  document.getElementById('txAmount').value = editTx ? editTx.amount : (prefill ? prefill.amount : '');

  if (editTx) {
    document.getElementById('txCategory').value = editTx.category;
    document.getElementById('txMethod').value = editTx.payment_method;
    document.getElementById('txNotes').value = editTx.notes || '';
  } else if (prefill) {
    if (prefill.category) document.getElementById('txCategory').value = prefill.category;
    if (prefill.method) document.getElementById('txMethod').value = prefill.method;
    document.getElementById('txNotes').value = '';
  } else {
    document.getElementById('txMethod').value = 'UPI / QR';
    document.getElementById('txNotes').value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeTxModal() {
  const modal = document.getElementById('txModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function setTheme(theme) {
  state.theme = theme;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.getElementById('themeToggleBtn').innerHTML = '☀️ Light Mode';
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('themeToggleBtn').innerHTML = '🌙 Dark Mode';
  }
  saveLocalStorage();
  renderCharts(
    {}, // will recompute in renderAll()
    {},
    {}
  );
  renderAll();
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ==========================================
// 6. Export, Import & Statement Generator
// ==========================================

function exportCsvFile() {
  if (state.isServerMode) {
    window.location.href = `/api/export/csv?user_id=${state.currentUserId}&month=${state.selectedMonth}`;
    showToast('Exporting CSV from SQLite backend...', 'success');
    return;
  }
  // Client-side CSV generation
  const list = getFilteredTransactions();
  const rows = [['ID', 'Date', 'Type', 'Category', 'Title', 'Amount', 'Payment Method', 'Notes']];
  list.forEach(t => {
    rows.push([
      t.id,
      t.tx_date,
      t.tx_type,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.payment_method || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);
  });
  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FinTrack_${state.currentUser.replace(/\s+/g, '_')}_${state.selectedMonth || 'all'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported filtered transactions to CSV!', 'success');
}

function exportJsonBackup() {
  if (state.isServerMode) {
    window.location.href = `/api/export/json?user_id=${state.currentUserId}`;
    showToast('Exported complete backup from SQLite database!', 'success');
    return;
  }
  const payload = {
    version: '2.0',
    exported_at: new Date().toISOString(),
    currentUser: state.currentUser,
    currency: state.currency,
    categories: state.categories,
    budgets: state.budgets,
    transactions: state.transactions
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FinTrack_Backup_${state.currentUser.replace(/\s+/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported complete JSON backup file!', 'success');
}

async function importJsonBackup(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (state.isServerMode) {
      const res = await fetch(`/api/import/json?user_id=${state.currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        await syncAllData();
        renderAll();
        showToast('JSON backup imported and synchronized with SQLite!', 'success');
        return;
      }
    }
    // Offline import
    if (data.categories) state.categories = data.categories;
    if (data.budgets) state.budgets = data.budgets;
    if (data.transactions) state.transactions = data.transactions;
    saveLocalStorage();
    renderAll();
    showToast('JSON backup restored into local storage!', 'success');
  } catch (err) {
    showToast('Failed to import backup file. Ensure it is valid JSON.', 'error');
  }
}

function printStatement() {
  // Update printable statement metadata elements
  const elName = document.getElementById('statementUserName');
  const elMonth = document.getElementById('statementMonth');
  const elDate = document.getElementById('statementGenDate');
  if (elName) elName.textContent = state.currentUser;
  if (elMonth) elMonth.textContent = state.selectedMonth;
  if (elDate) elDate.textContent = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  window.print();
}

// Security HTML escape utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 7. Initialization & Event Listeners
// ==========================================

window.addEventListener('DOMContentLoaded', async () => {
  loadLocalStorage();
  setTheme(state.theme || 'dark');

  // Check connection to Flask SQLite REST server
  await checkServerConnection();
  await syncAllData();

  renderAll();

  // Tab switching
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('viewAllTxBtn')?.addEventListener('click', () => switchTab('transactions'));
  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);

  // Month & Currency
  document.getElementById('monthFilter')?.addEventListener('change', e => {
    state.selectedMonth = e.target.value;
    saveLocalStorage();
    renderAll();
  });

  document.getElementById('currencySelect')?.addEventListener('change', e => {
    state.currency = e.target.value;
    saveLocalStorage();
    renderAll();
  });

  // Transaction form dynamic category update when switching type
  document.getElementById('txType')?.addEventListener('change', () => {
    populateCategoryDropdowns();
  });

  // Transaction Modal Open/Close
  document.getElementById('openAddModalBtn')?.addEventListener('click', () => openTxModal(null));
  document.getElementById('closeTxModalBtn')?.addEventListener('click', closeTxModal);
  document.getElementById('cancelTxModalBtn')?.addEventListener('click', closeTxModal);

  // Quick Chips
  document.querySelectorAll('.quick-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title;
      const amount = parseFloat(btn.dataset.amount);
      const category = btn.dataset.category;
      openTxModal(null, { title, amount, category, type: 'expense', method: 'UPI / QR' });
    });
  });

  // Transaction Form Submit
  document.getElementById('txForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = document.getElementById('txEditId').value;
    const payload = {
      title: document.getElementById('txTitle').value.trim(),
      amount: parseFloat(document.getElementById('txAmount').value) || 0,
      tx_type: document.getElementById('txType').value,
      category: document.getElementById('txCategory').value,
      payment_method: document.getElementById('txMethod').value,
      tx_date: document.getElementById('txDate').value,
      notes: document.getElementById('txNotes').value.trim()
    };

    if (editId) {
      await updateTransaction(editId, payload);
      showToast('Transaction updated successfully!', 'success');
    } else {
      await createTransaction(payload);
      showToast('New transaction recorded!', 'success');
    }

    if (payload.tx_date && payload.tx_date.slice(0, 7) !== state.selectedMonth) {
      state.selectedMonth = payload.tx_date.slice(0, 7);
    }

    closeTxModal();
    renderAll();
  });

  // Table Action Delegation (Edit / Delete)
  const handleTableClicks = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this transaction?')) {
        await deleteTransaction(id);
        renderAll();
        showToast('Transaction deleted.', 'error');
      }
    } else if (action === 'edit') {
      const tx = state.transactions.find(t => t.id == id);
      if (tx) openTxModal(tx);
    }
  };

  document.getElementById('recentTxTableBody')?.addEventListener('click', handleTableClicks);
  document.getElementById('fullTxTableBody')?.addEventListener('click', handleTableClicks);

  // Search & Filter Listeners
  const updateFilters = () => {
    state.filters.q = document.getElementById('searchTxInput')?.value.trim() || '';
    state.filters.category = document.getElementById('filterCategorySelect')?.value || 'ALL';
    state.filters.type = document.getElementById('filterTypeSelect')?.value || 'ALL';
    state.filters.method = document.getElementById('filterMethodSelect')?.value || 'ALL';
    state.filters.startDate = document.getElementById('filterStartDate')?.value || '';
    state.filters.endDate = document.getElementById('filterEndDate')?.value || '';
    state.filters.sortBy = document.getElementById('sortTxSelect')?.value || 'tx_date';
    state.filters.sortOrder = document.getElementById('sortOrderSelect')?.value || 'desc';
    renderFullTransactionsTable();
  };

  ['searchTxInput', 'filterCategorySelect', 'filterTypeSelect', 'filterMethodSelect', 'filterStartDate', 'filterEndDate', 'sortTxSelect', 'sortOrderSelect'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateFilters);
    document.getElementById(id)?.addEventListener('change', updateFilters);
  });

  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    document.getElementById('searchTxInput').value = '';
    document.getElementById('filterCategorySelect').value = 'ALL';
    document.getElementById('filterTypeSelect').value = 'ALL';
    document.getElementById('filterMethodSelect').value = 'ALL';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('sortTxSelect').value = 'tx_date';
    document.getElementById('sortOrderSelect').value = 'desc';
    updateFilters();
  });

  // Save Budgets Button
  document.getElementById('saveBudgetsBtn')?.addEventListener('click', async () => {
    const updates = {};
    document.querySelectorAll('input[data-budget-cat]').forEach(inp => {
      updates[inp.dataset.budgetCat] = Math.max(0, parseFloat(inp.value) || 0);
    });
    await saveBudgetLimits(updates);
    renderAll();
    showToast('Monthly category budget caps saved!', 'success');
  });

  // Custom Category Form
  document.getElementById('customCategoryForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('customCatName').value.trim();
    const cat_type = document.getElementById('customCatType').value;
    const color = document.getElementById('customCatColor').value;
    if (!name) return;

    await addCustomCategory({ name, cat_type, color, icon: 'tag' });
    document.getElementById('customCatName').value = '';
    renderAll();
    showToast(`Added custom category "${name}"!`, 'success');
  });

  // Delete Category delegation
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-delete-cat]');
    if (!btn) return;
    const name = btn.dataset.deleteCat;
    if (confirm(`Delete category "${name}" and its budget cap?`)) {
      await deleteCustomCategory(name);
      renderAll();
      showToast(`Category "${name}" removed.`, 'warning');
    }
  });

  // Export / Print / Reset Actions
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsvFile);
  document.getElementById('exportJsonBtn')?.addEventListener('click', exportJsonBackup);
  document.getElementById('printReportBtn')?.addEventListener('click', printStatement);

  document.getElementById('importJsonInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJsonBackup(file);
    e.target.value = '';
  });

  document.getElementById('resetDemoBtn')?.addEventListener('click', async () => {
    if (confirm('Reset to factory demo student records? All current changes will be overwritten.')) {
      if (state.isServerMode) {
        await fetch('/api/reset-demo', { method: 'POST' });
        await syncAllData();
      } else {
        state.transactions = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
        state.budgets = { ...DEFAULT_BUDGETS };
        state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        saveLocalStorage();
      }
      state.selectedMonth = '2026-10';
      renderAll();
      showToast('Demo data restored successfully!', 'success');
    }
  });

  // User Profile / Switch Modal
  const authModal = document.getElementById('authModal');
  const openAuthBtn = document.getElementById('openAuthModalBtn');
  const closeAuthBtn = document.getElementById('closeAuthModalBtn');
  const cancelAuthBtn = document.getElementById('cancelAuthModalBtn');

  const closeAuth = () => {
    authModal?.classList.add('hidden');
    authModal?.classList.remove('flex');
  };

  openAuthBtn?.addEventListener('click', () => {
    document.getElementById('authUsername').value = state.currentUser;
    // Populate user profiles list
    const listEl = document.getElementById('existingUsersList');
    if (listEl) {
      listEl.innerHTML = state.allUsers.map(u => `
        <button type="button" data-switch-user="${escapeHtml(u.username)}" class="w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm font-medium ${u.username === state.currentUser ? 'bg-indigo-600 text-white' : 'bg-slate-500/10 text-slate-300 hover:bg-slate-500/20'} flex items-center justify-between">
          <span>👤 ${escapeHtml(u.username)}</span>
          ${u.username === state.currentUser ? '<span class="text-xs">Active</span>' : ''}
        </button>
      `).join('');
    }
    authModal?.classList.remove('hidden');
    authModal?.classList.add('flex');
  });

  closeAuthBtn?.addEventListener('click', closeAuth);
  cancelAuthBtn?.addEventListener('click', closeAuth);

  document.getElementById('existingUsersList')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-switch-user]');
    if (!btn) return;
    const name = btn.dataset.switchUser;
    await loginOrCreateUser(name);
    closeAuth();
    renderAll();
    showToast(`Switched user profile to "${name}"`, 'success');
  });

  document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('authUsername').value.trim();
    if (!name) return;
    await loginOrCreateUser(name);
    closeAuth();
    renderAll();
    showToast(`Switched active profile to "${name}"`, 'success');
  });
});
}
