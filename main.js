/**
 * Finance App - Core Logic
 */

// --- State Management ---
const DEFAULT_CATEGORIES = {
    "Income": ["Salary", "Business/Freelance", "Investments/Dividends", "Other Income"],
    "Fixed Expenses": ["Housing", "Utilities", "Health", "Education", "Insurance & Taxes"],
    "Variable Expenses": ["Groceries", "Transport", "Dining & Delivery", "Entertainment", "Personal Care", "Miscellaneous"],
    "Savings & Investments": ["Emergency Fund", "Long-term Investments"]
};

let state = {
    transactions: JSON.parse(localStorage.getItem('tatu_finance_transactions')) || [],
    categories: JSON.parse(localStorage.getItem('tatu_finance_categories')) || DEFAULT_CATEGORIES,
    budgets: JSON.parse(localStorage.getItem('tatu_finance_budgets')) || {} // e.g {"2026": {"Housing": {"2026-01": 2000}}}
};

// Save to LocalStorage
function saveState() {
    localStorage.setItem('tatu_finance_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('tatu_finance_categories', JSON.stringify(state.categories));
    localStorage.setItem('tatu_finance_budgets', JSON.stringify(state.budgets));
}

// --- DOM Elements ---
const balanceDisplay = document.getElementById('display-balance');
const incomeDisplay = document.getElementById('display-income');
const expenseDisplay = document.getElementById('display-expense');
const transactionList = document.getElementById('transaction-list');
const categorySelect = document.getElementById('category');
const filterMonth = document.getElementById('filter-month');

// New Budget/Navigation Elements
const viewDashboard = document.getElementById('view-dashboard');
const viewBudget = document.getElementById('view-budget');
const navDashboard = document.getElementById('nav-dashboard');
const navBudget = document.getElementById('nav-budget');

const budgetYearPicker = document.getElementById('budget-year-picker');
const budgetList = document.getElementById('budget-list');
const displayBudgetStatus = document.getElementById('display-budget-status');
const displayBudgetTrend = document.getElementById('display-budget-trend');

// Modal Elements
const modal = document.getElementById('transaction-modal');
const btnOpenModal = document.getElementById('btn-add-transaction');
const btnCloseModal = document.getElementById('btn-close-modal');
const transactionForm = document.getElementById('transaction-form');

// Loading state
const loader = document.getElementById('transaction-loader');

// --- Utilities ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount);
};

const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatCompetence = (compString) => {
    if (!compString) return '';
    const [year, month] = compString.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// --- Currency Mask Utilities ---
const parseInputCurrency = (str) => {
    if (str === null || str === undefined || str === '') return NaN;
    if (typeof str === 'number') return str;
    let isNegative = str.toString().indexOf('-') !== -1;
    let digits = str.toString().replace(/\D/g, '');
    if (!digits) return NaN;
    let val = parseInt(digits, 10) / 100;
    return isNegative ? -val : val;
};

const formatInputCurrency = (amount) => {
    if (isNaN(amount) || amount === null || amount === '') return '';
    return parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const applyCurrencyMask = (e) => {
    let el = e.target;
    let value = el.value;
    if (value === '-') return;
    let isNegative = value.indexOf('-') !== -1;
    let digits = value.replace(/\D/g, '');
    if (!digits) {
        el.value = isNegative ? '-' : '';
        return;
    }
    let floatVal = parseInt(digits, 10) / 100;
    if (floatVal === 0 && isNegative) {
        el.value = '-0,00';
        return;
    }
    let formatted = floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    el.value = isNegative ? '-' + formatted : formatted;
};

// --- Core Functions ---

// 1. Initialize App
function init() {
    if (!filterMonth.value) {
        const now = new Date();
        filterMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        budgetYearPicker.value = now.getFullYear();
    }
    initBudgetYear(budgetYearPicker.value);
    populateCategories();
    updateUI();
    setupEventListeners();
}

function initBudgetYear(year) {
    if (!state.budgets[year]) {
        state.budgets[year] = {};
    }
}

// 2. Calculate Dashboard Totals
function calculateTotals() {
    let income = 0;
    let expenses = 0;

    state.transactions.forEach(t => {
        // Skip excluded transactions for balance calc
        if (t.exclude) return;

        // Filter by selected competence month
        if (t.competence && t.competence !== filterMonth.value) return;
        // Legacy fallback: if old tx doesn't have competence, skip or include? We'll include if matches date substring, or skip.
        if (!t.competence && t.date.substring(0, 7) !== filterMonth.value) return;

        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expenses += t.amount;
    });

    return { income, expenses, balance: income - expenses };
}

// 3. Update UI (Dashboard & List)
function updateUI() {
    // Show loader for polished feel
    loader.classList.remove('hidden');

    setTimeout(() => {
        const { income, expenses, balance } = calculateTotals();

        // Update Dashboard
        balanceDisplay.textContent = formatCurrency(balance);
        incomeDisplay.textContent = formatCurrency(income);
        expenseDisplay.textContent = formatCurrency(expenses);

        updateBudgetStatus(income, expenses);

        // Render Lists
        renderTransactions();
        renderBudgetGrid();

        loader.classList.add('hidden');
    }, 400); // Artificial delay to show loader animation
}

// 4. Update Budget vs Actual Dashboard Widget
function updateBudgetStatus(actualIncome, actualExpenses) {
    const year = filterMonth.value.substring(0, 4);
    const month = filterMonth.value; // e.g. "2026-02"

    if (!state.budgets[year]) {
        displayBudgetStatus.textContent = 'R$ 0,00';
        displayBudgetTrend.textContent = 'No budget planned';
        return;
    }

    let plannedExpenses = 0;

    // Sum only categories from "Fixed" and "Variable" groups for the specific month
    const expenseGroups = ["Fixed Expenses", "Variable Expenses"];
    if (!Array.isArray(state.categories)) {
        expenseGroups.forEach(group => {
            if (state.categories[group]) {
                state.categories[group].forEach(cat => {
                    if (state.budgets[year][cat] && state.budgets[year][cat][month]) {
                        plannedExpenses += parseFloat(state.budgets[year][cat][month]) || 0;
                    }
                });
            }
        });
    }

    const remaining = plannedExpenses - actualExpenses;

    displayBudgetStatus.textContent = formatCurrency(remaining);

    if (remaining >= 0) {
        displayBudgetTrend.innerHTML = `<i class="ph ph-trend-up"></i> Within Budget`;
        displayBudgetTrend.className = 'trend positive';
        displayBudgetStatus.style.color = "var(--text-primary)";
    } else {
        displayBudgetTrend.innerHTML = `<i class="ph ph-trend-down"></i> Over Budget`;
        displayBudgetTrend.className = 'trend negative';
        displayBudgetStatus.style.color = "var(--accent-negative)";
    }
}

// 5. Render Transactions
function renderTransactions() {
    transactionList.innerHTML = '';

    // Filter by competence month, then sort by date descending
    const filtered = state.transactions.filter(t => {
        return (t.competence === filterMonth.value) || (!t.competence && t.date.substring(0, 7) === filterMonth.value);
    });

    const sorted = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((t, index) => {
        const tr = document.createElement('tr');
        // Add staggered animation delay
        tr.style.animation = `fadeIn 0.3s ease forwards ${index * 0.05}s`;
        tr.style.opacity = '0';

        const amountClass = t.type === 'income' ? 'accent-positive' : 'accent-negative';
        const sign = t.type === 'income' ? '+' : '-';
        const excludeIcon = t.exclude ? `<i class="ph ph-eye-slash text-muted" title="Excluded from calc"></i>` : '';

        tr.innerHTML = `
            <td>
                <strong>${t.desc}</strong>
                ${excludeIcon}
            </td>
            <td><span class="tag">${t.category}</span></td>
            <td>${formatDate(t.date)}</td>
            <td>${formatCompetence(t.competence) || formatCompetence(t.date.substring(0, 7))}</td>
            <td style="color: var(--${amountClass}); font-weight: 600;">
                ${sign} ${formatCurrency(t.amount)}
            </td>
            <td>
                <button class="action-btn" onclick="editTransaction('${t.id}')"><i class="ph ph-pencil-simple"></i></button>
                <button class="action-btn delete" onclick="deleteTransaction('${t.id}')"><i class="ph ph-trash"></i></button>
            </td>
        `;
        transactionList.appendChild(tr);
    });
}

// 5. Populate Category Dropdown
function populateCategories() {
    categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';

    // Handle both old array structure and new object structure for backwards compatibility
    if (Array.isArray(state.categories)) {
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    } else {
        for (const [group, categories] of Object.entries(state.categories)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = group;
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                optgroup.appendChild(option);
            });
            categorySelect.appendChild(optgroup);
        }
    }
}

// 6. Handle Form Submit
function handleTransactionSubmit(e) {
    e.preventDefault();

    const id = transactionForm.dataset.editingId || generateId();
    const type = document.querySelector('input[name="type"]:checked').value;
    const desc = document.getElementById('desc').value;
    const amount = parseInputCurrency(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const competence = document.getElementById('competence').value;
    const exclude = document.getElementById('exclude').checked;

    const newTransaction = { id, type, desc, amount, date, category, competence, exclude };

    if (transactionForm.dataset.editingId) {
        // Update existing
        const index = state.transactions.findIndex(t => t.id === id);
        state.transactions[index] = newTransaction;
        delete transactionForm.dataset.editingId;
    } else {
        // Add new
        state.transactions.push(newTransaction);
    }

    saveState();
    closeModal();
    updateUI();
}

// 7. Delete Transaction
window.deleteTransaction = (id) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        updateUI();
    }
}

// 10. Edit Transaction
window.editTransaction = (id) => {
    const t = state.transactions.find(x => x.id === id);
    if (!t) return;

    // Fill form
    document.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
    document.getElementById('desc').value = t.desc;
    document.getElementById('amount').value = formatInputCurrency(t.amount);
    document.getElementById('date').value = t.date;
    document.getElementById('category').value = t.category;
    document.getElementById('competence').value = t.competence || t.date.substring(0, 7);
    document.getElementById('exclude').checked = t.exclude;

    transactionForm.dataset.editingId = id;

    // Change modal title
    document.querySelector('.modal-header h3').textContent = 'Edit Transaction';

    openModal();
}

// 11. Render Budget Grid
function renderBudgetGrid() {
    budgetList.innerHTML = '';
    const year = budgetYearPicker.value;

    initBudgetYear(year);

    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    if (Array.isArray(state.categories)) return; // Fallback if using old legacy structure

    for (const [group, categories] of Object.entries(state.categories)) {
        categories.forEach((cat, index) => {
            const tr = document.createElement('tr');

            // Build Month Inputs
            let monthInputsHtml = '';
            months.forEach(m => {
                const compStr = `${year}-${m}`;
                const val = (state.budgets[year][cat] && state.budgets[year][cat][compStr]);
                const formattedVal = val !== undefined ? formatInputCurrency(val) : '';
                monthInputsHtml += `
                    <td>
                        <input type="text" class="budget-input" inputmode="numeric"
                            data-year="${year}" data-month="${compStr}" data-category="${cat}" 
                            value="${formattedVal}" placeholder="0,00">
                    </td>
                `;
            });

            tr.innerHTML = `
                <td class="sticky-col group-label">${index === 0 ? group : ''}</td>
                <td class="sticky-col-2"><strong>${cat}</strong></td>
                ${monthInputsHtml}
            `;
            budgetList.appendChild(tr);
        });

        // Add a visual separator row between groups
        const sepTr = document.createElement('tr');
        sepTr.innerHTML = `<td colspan="14" class="group-separator"></td>`;
        budgetList.appendChild(sepTr);
    }

    // Attach listeners to new inputs
    document.querySelectorAll('.budget-input').forEach(input => {
        input.addEventListener('input', applyCurrencyMask);
        input.addEventListener('change', handleBudgetChange);
    });
}

function handleBudgetChange(e) {
    const el = e.target;
    const year = el.dataset.year;
    const month = el.dataset.month;
    const cat = el.dataset.category;
    const val = parseInputCurrency(el.value);

    initBudgetYear(year);
    if (!state.budgets[year][cat]) state.budgets[year][cat] = {};

    if (isNaN(val)) {
        delete state.budgets[year][cat][month]; // clear if empty
    } else {
        state.budgets[year][cat][month] = val;
    }

    saveState();
    // Update dashboard widget if the changed budget is for the currently viewed dashboard month
    if (month === filterMonth.value) {
        updateUI();
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    filterMonth.addEventListener('change', updateUI);
    budgetYearPicker.addEventListener('change', renderBudgetGrid);

    // Tab Navigation
    navDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        navDashboard.classList.add('active');
        navBudget.classList.remove('active');
        viewDashboard.classList.remove('hidden');
        viewBudget.classList.add('hidden');
        updateUI();
    });

    navBudget.addEventListener('click', (e) => {
        e.preventDefault();
        navBudget.classList.add('active');
        navDashboard.classList.remove('active');
        viewBudget.classList.remove('hidden');
        viewDashboard.classList.add('hidden');
        renderBudgetGrid();
    });

    btnOpenModal.addEventListener('click', () => {
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('competence').value = filterMonth.value;
        delete transactionForm.dataset.editingId;
        document.querySelector('.modal-header h3').textContent = 'New Transaction';
        openModal();
    });

    btnCloseModal.addEventListener('click', closeModal);

    document.getElementById('amount').addEventListener('input', applyCurrencyMask);
    transactionForm.addEventListener('submit', handleTransactionSubmit);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function openModal() {
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

// Add CSS animation for table rows dynamically
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(styleSheet);


// Run
init();
