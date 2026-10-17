
const transactionForm = document.querySelector("#transactionForm");
const titleInput = document.querySelector("#title");
const amountInput = document.querySelector("#amount");
const typeInput = document.querySelector("#type");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");

const transactionList = document.querySelector("#transactionList");
const searchInput = document.querySelector("#searchInput");
const filterType = document.querySelector("#filterType");

const submitBtn = document.querySelector("#submitBtn");
const cancelEdit = document.querySelector("#cancelEdit");
const emptyMessage = document.querySelector("#emptyMessage");
const message = document.querySelector("#message");

document.querySelector("#todayDate").textContent =
    new Date().toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });

dateInput.value = new Date().toLocaleDateString("en-CA");

// Load saved transactions
let transactions = [];

try {
    const savedData = localStorage.getItem("expenseTransactions");
    const parsedData = savedData ? JSON.parse(savedData) : [];

    if (Array.isArray(parsedData)) {
        transactions = parsedData.filter(item =>
            item &&
            typeof item.id === "number" &&
            typeof item.title === "string" &&
            Number.isFinite(item.amount) &&
            item.amount > 0 &&
            ["income", "expense"].includes(item.type) &&
            typeof item.category === "string" &&
            typeof item.date === "string"
        );
    }
} catch (error) {
    console.error("Could not load transactions:", error);
}

let editingId = null;

// Save data in localStorage
function saveTransactions() {
    try {
        localStorage.setItem(
            "expenseTransactions",
            JSON.stringify(transactions)
        );
        return true;
    } catch (error) {
        console.error("Could not save transactions:", error);
        showMessage("Data save nahi ho saka. Browser storage check karein.", "danger");
        return false;
    }
}

// Show a message
function showMessage(text, type) {
    message.textContent = text;
    message.className = `alert alert-${type}`;
}

// Update dashboard totals
function updateDashboard() {
    const totalIncome = transactions
        .filter(item => item.type === "income")
        .reduce((total, item) => total + item.amount, 0);

    const totalExpense = transactions
        .filter(item => item.type === "expense")
        .reduce((total, item) => total + item.amount, 0);

    const balance = totalIncome - totalExpense;

    document.querySelector("#totalIncome").textContent =
        formatAmount(totalIncome);

    document.querySelector("#totalExpense").textContent =
        formatAmount(totalExpense);

    document.querySelector("#balance").textContent =
        formatAmount(balance);

    document.querySelector("#totalTransactions").textContent =
        transactions.length;
}

// Format currency
function formatAmount(amount) {
    return "Rs. " + amount.toLocaleString("en-PK", {
        maximumFractionDigits: 2
    });
}

// Display transactions
function displayTransactions() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedType = filterType.value;

    const filteredTransactions = transactions
        .filter(item => {
            const matchesSearch =
                item.title.toLowerCase().includes(searchText) ||
                item.category.toLowerCase().includes(searchText);

            const matchesType =
                selectedType === "all" || item.type === selectedType;

            return matchesSearch && matchesType;
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    transactionList.replaceChildren();

    filteredTransactions.forEach(item => {
        const tr = document.createElement("tr");

        const titleCell = document.createElement("td");
        const icon = document.createElement("span");
        icon.className = "transaction-icon";
        icon.innerHTML = item.type === "income"
            ? '<i class="bi bi-arrow-down-left"></i>'
            : '<i class="bi bi-arrow-up-right"></i>';

        const title = document.createElement("span");
        title.className = "transaction-name";
        title.textContent = item.title;

        titleCell.append(icon, title);

        const categoryCell = document.createElement("td");
        categoryCell.textContent = item.category;

        const dateCell = document.createElement("td");
        dateCell.textContent = item.date;

        const amountCell = document.createElement("td");
        amountCell.className = item.type === "income"
            ? "income-text"
            : "expense-text";

        amountCell.textContent =
            (item.type === "income" ? "+ " : "- ") +
            formatAmount(item.amount);

        const actionsCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "action-btn";
        editButton.title = "Edit transaction";
        editButton.setAttribute("aria-label", "Edit " + item.title);
        editButton.innerHTML = '<i class="bi bi-pencil"></i>';
        editButton.addEventListener("click", () => editTransaction(item.id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "action-btn delete-btn";
        deleteButton.title = "Delete transaction";
        deleteButton.setAttribute("aria-label", "Delete " + item.title);
        deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
        deleteButton.addEventListener("click", () => deleteTransaction(item.id));

        actionsCell.append(editButton, deleteButton);
        tr.append(titleCell, categoryCell, dateCell, amountCell, actionsCell);
        transactionList.appendChild(tr);
    });

    emptyMessage.classList.toggle("d-none", filteredTransactions.length > 0);
    document.querySelector("#recordCount").textContent =
        `${filteredTransactions.length} record${filteredTransactions.length !== 1 ? "s" : ""}`;
}

// Add or update a transaction
transactionForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    if (!title || !date || !Number.isFinite(amount) || amount <= 0) {
        showMessage("Please enter valid transaction details.", "danger");
        return;
    }

    if (editingId !== null) {
        const index = transactions.findIndex(item => item.id === editingId);

        if (index === -1) {
            showMessage("Transaction nahi mili.", "danger");
            resetForm();
            return;
        }

        const oldTransaction = transactions[index];

        transactions[index] = {
            ...oldTransaction,
            title,
            amount,
            type,
            category,
            date
        };

        if (!saveTransactions()) {
            transactions[index] = oldTransaction;
            return;
        }

        showMessage("Transaction successfully updated!", "success");
    } else {
        const newTransaction = {
            id: Date.now(),
            title,
            amount,
            type,
            category,
            date
        };

        transactions.push(newTransaction);

        if (!saveTransactions()) {
            transactions = transactions.filter(item =>
                item.id !== newTransaction.id
            );
            return;
        }

        showMessage("Transaction successfully added!", "success");
    }

    resetForm();
    updateDashboard();
    displayTransactions();
});

// Edit transaction
function editTransaction(id) {
    const item = transactions.find(transaction => transaction.id === id);

    if (!item) return;

    editingId = id;
    titleInput.value = item.title;
    amountInput.value = item.amount;
    typeInput.value = item.type;
    categoryInput.value = item.category;
    dateInput.value = item.date;

    submitBtn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Update Transaction';
    cancelEdit.classList.remove("d-none");

    document.querySelector("#transactionForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Delete transaction
function deleteTransaction(id) {
    const item = transactions.find(transaction => transaction.id === id);

    if (!item) return;

    if (!confirm(`Delete "${item.title}" transaction?`)) {
        return;
    }

    const oldTransactions = transactions;
    transactions = transactions.filter(item => item.id !== id);

    if (!saveTransactions()) {
        transactions = oldTransactions;
        return;
    }

    if (editingId === id) {
        resetForm();
    }

    updateDashboard();
    displayTransactions();
    showMessage("Transaction deleted successfully!", "success");
}

// Reset form
function resetForm() {
    transactionForm.reset();
    editingId = null;
    dateInput.value = new Date().toLocaleDateString("en-CA");

    submitBtn.innerHTML = '<i class="bi bi-plus-lg me-2"></i>Add Transaction';
    cancelEdit.classList.add("d-none");
}

cancelEdit.addEventListener("click", resetForm);
searchInput.addEventListener("input", displayTransactions);
filterType.addEventListener("change", displayTransactions);

// Initial display
updateDashboard();
displayTransactions();
