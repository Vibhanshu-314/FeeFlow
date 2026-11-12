(function () {
    "use strict";

    const store = window.FeeFlowStore;
    let state = store ? store.load() : { profile: null, records: [] };
    let activeFilter = "all";
    let incomeRange = "month";
    let toastTimeout;

    function initializeSignup() {
        const form = document.querySelector("#signup-form");
        if (!form) return;

        const nameInput = document.querySelector("#signup-name");
        const workspaceInput = document.querySelector("#signup-organization");
        const phoneInput = document.querySelector("#signup-phone");
        const feedback = document.querySelector("#signup-feedback");
        const roleOptions = Array.from(form.querySelectorAll('input[name="account-role"]'));
        const labels = {
            tutor: { workspace: "Tuition or coaching name", placeholder: "Your tuition / coaching name", phone: "Your WhatsApp number" },
            gym: { workspace: "Gym or fitness studio name", placeholder: "Your gym / studio name", phone: "Your WhatsApp number" },
            student: { workspace: "School, gym or fee provider", placeholder: "Where you study or train", phone: "Your mobile number" }
        };

        function selectedRole() {
            return roleOptions.find((input) => input.checked)?.value || "";
        }

        function updateRoleCopy() {
            const role = selectedRole();
            const copy = labels[role];
            if (!copy) return;
            document.querySelector("[data-workspace-label]").textContent = copy.workspace;
            document.querySelector("[data-phone-label]").textContent = copy.phone;
            workspaceInput.placeholder = copy.placeholder;
        }

        roleOptions.forEach((input) => input.addEventListener("change", updateRoleCopy));
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            nameInput.setCustomValidity(nameInput.value.trim() ? "" : "Please enter your name.");
            workspaceInput.setCustomValidity(workspaceInput.value.trim() ? "" : "Please enter a name.");
            phoneInput.setCustomValidity(phoneInput.value.trim() ? "" : "Please enter a mobile number.");
            if (!form.reportValidity()) return;

            const role = selectedRole();
            if (!role) return;
            const current = store.load();
            if (current.profile && current.records.length && current.profile.role !== role) {
                feedback.hidden = false;
                feedback.textContent = "This browser already has fee records for a different workspace type. Open your existing dashboard to keep that data safe.";
                return;
            }

            state = current;
            state.profile = {
                ...(state.profile || {}),
                role,
                name: nameInput.value.trim(),
                workspaceName: workspaceInput.value.trim(),
                phone: phoneInput.value.trim(),
                upiId: state.profile?.upiId || "",
                qrImage: state.profile?.qrImage || ""
            };

            if (!store.save(state)) {
                feedback.hidden = false;
                feedback.textContent = "This browser could not save the workspace. Try another browser or free up local storage.";
                return;
            }
            window.location.assign("dashboard.html");
        });
    }

    function initializeLogin() {
        const openLink = document.querySelector("[data-login-open]");
        if (!openLink) return;
        const createLink = document.querySelector("[data-login-create]");
        const workspaceCard = document.querySelector("[data-login-workspace]");
        const emptyCard = document.querySelector("[data-login-empty]");
        const profile = state.profile;

        if (profile) {
            const roleLabel = profile.role === "gym" ? "Gym owner" : profile.role === "student" ? "Student / member" : "Tuition teacher";
            setText("[data-login-name]", profile.workspaceName || profile.name || "My workspace");
            setText("[data-login-role]", `${roleLabel} · ${profile.name || ""}`.trim());
            setText("[data-login-avatar]", initial(profile.workspaceName || profile.name));
            workspaceCard.hidden = false;
            openLink.hidden = false;
            createLink.hidden = true;
            emptyCard.hidden = true;
            setText("[data-login-copy]", "Your saved workspace is ready to open on this device.");
        } else {
            workspaceCard.hidden = true;
            openLink.hidden = true;
            createLink.hidden = false;
            emptyCard.hidden = false;
            setText("[data-login-copy]", "This preview keeps each workspace in the browser where it was created.");
        }
    }

    function initializeDashboard() {
        if (!document.body.classList.contains("dashboard-body")) return;
        if (!state.profile) {
            window.location.replace("signup.html");
            return;
        }

        configureDashboardForRole();
        initializeNavigation();
        initializeMenu();
        initializeIncomeChart();
        initializeRecordDialog();
        initializePaymentSetup();
        initializeFilters();
        initializeNotifications();
        initializeReportDownload();
        renderDashboard();
        notifyDueOwner();
    }

    function configureDashboardForRole() {
        const profile = state.profile;
        const isStudent = profile.role === "student";
        const isGym = profile.role === "gym";
        const roleName = isStudent ? "Student / member" : isGym ? "Gym owner" : "Tuition teacher";
        const singular = isStudent ? "fee record" : isGym ? "member" : "student";
        const plural = isStudent ? "Fee records" : isGym ? "Members" : "Students";

        document.querySelectorAll("[data-owner]").forEach((node) => { node.textContent = profile.name; });
        document.querySelectorAll("[data-organization]").forEach((node) => { node.textContent = profile.workspaceName; });
        setText("[data-role-label]", roleName);
        setText("[data-workspace-initial]", initial(profile.workspaceName));
        setText("[data-profile-initials]", initials(profile.name));
        setText("[data-role-kicker]", isStudent ? "PERSONAL FEE TRACKER" : isGym ? "MEMBERSHIP OVERVIEW" : "STUDENT FEE OVERVIEW");
        setText("[data-welcome-copy]", isStudent ? `Keep your ${profile.workspaceName} fee dates and payments together.` : `Your ${isGym ? "memberships" : "students"}, fee dates and follow-ups at a glance.`);
        setText("[data-overview-heading]", isStudent ? "My fee dates" : "Fee follow-ups");
        setText("[data-overview-subtitle]", isStudent ? "Your late fee dates appear first, then what's coming up." : "Late fees appear first, then upcoming dates.");
        setText("[data-record-nav-label]", plural);
        setText("[data-record-count-label]", isStudent ? "Fee records" : plural);
        setText("[data-records-title]", isStudent ? "My fees" : plural);
        setText("[data-record-kicker]", isStudent ? "YOUR TRACKER" : isGym ? "MEMBER ROSTER" : "STUDENT ROSTER");
        setText("[data-records-subtitle]", isStudent ? "Your payment dates, history and provider details." : "Joining dates, last payment and next due date, sorted by urgency.");
        setText("[data-add-label]", isStudent ? "Track a fee" : `Add ${singular}`);
        setText("[data-empty-heading]", isStudent ? "Add the first fee to track" : `Add your first ${singular}`);
        setText("[data-empty-copy]", isStudent ? "Keep your provider, due date and payment history together." : `Add a ${singular} to track joining dates, fees and WhatsApp reminders.`);
        setText("[data-record-name-label]", isStudent ? "School, gym or fee provider" : isGym ? "Member name" : "Student name");
        setText("[data-record-phone-label]", isStudent ? "Provider mobile number" : isGym ? "Member WhatsApp number" : "Student WhatsApp number");
        setText("[data-group-label]", isStudent ? "Class, batch or plan" : isGym ? "Membership plan" : "Class / batch");
        setText("[data-record-form-title]", isStudent ? "Track a fee" : isGym ? "Add a member" : "Add a student");
        setText("[data-dialog-kicker]", isStudent ? "NEW FEE TO TRACK" : "NEW FEE RECORD");
        setText("[data-save-record]", isStudent ? "Save fee details" : "Save fee record");
        setText("[data-overdue-caption]", "0 late");
        setText("[data-current-date]", new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date()));

        const recordPhone = document.querySelector("#record-phone");
        recordPhone.required = !isStudent;
        document.querySelector("[data-student-field]").hidden = !isStudent;
        document.querySelectorAll("[data-owner-only]").forEach((node) => { node.hidden = isStudent; });
        if (isStudent) {
            document.querySelectorAll("[data-enable-notifications]").forEach((node) => { node.hidden = true; });
        }

        document.querySelector("#payment-phone").value = profile.phone || "";
        document.querySelector("#payment-upi").value = profile.upiId || "";
        renderQrPreview();
    }

    function initializeNavigation() {
        const buttons = Array.from(document.querySelectorAll("[data-view-target]"));
        buttons.forEach((button) => {
            button.addEventListener("click", () => showView(button.dataset.viewTarget));
        });
        document.querySelectorAll("[data-open-record]").forEach((button) => {
            button.addEventListener("click", () => openRecordDialog());
        });
    }

    function initializeMenu() {
        const sidebar = document.querySelector("#app-sidebar");
        const toggle = document.querySelector("[data-menu-toggle]");
        const closeButton = document.querySelector("[data-menu-close]");
        if (!sidebar || !toggle || !closeButton) return;

        function closeMenu(restoreFocus) {
            document.body.classList.remove("menu-open");
            sidebar.setAttribute("aria-hidden", "true");
            sidebar.inert = true;
            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Open navigation menu");
            if (restoreFocus) toggle.focus();
        }

        toggle.addEventListener("click", () => {
            const opening = toggle.getAttribute("aria-expanded") !== "true";
            document.body.classList.toggle("menu-open", opening);
            sidebar.inert = !opening;
            sidebar.setAttribute("aria-hidden", String(!opening));
            toggle.setAttribute("aria-expanded", String(opening));
            toggle.setAttribute("aria-label", opening ? "Close navigation menu" : "Open navigation menu");
            if (opening) sidebar.querySelector("[data-view-target]")?.focus();
        });
        closeButton.addEventListener("click", () => closeMenu(true));
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && document.body.classList.contains("menu-open")) closeMenu(true);
        });
        sidebar.querySelectorAll("[data-view-target]").forEach((button) => {
            button.addEventListener("click", () => closeMenu(false));
        });
    }

    function initializeIncomeChart() {
        document.querySelectorAll("[data-income-range]").forEach((button) => {
            button.addEventListener("click", () => {
                incomeRange = button.dataset.incomeRange;
                document.querySelectorAll("[data-income-range]").forEach((item) => {
                    const active = item === button;
                    item.classList.toggle("active", active);
                    item.setAttribute("aria-pressed", String(active));
                });
                renderIncomeChart();
            });
        });
    }

    function showView(name) {
        document.querySelectorAll("[data-app-view]").forEach((view) => {
            view.hidden = view.dataset.appView !== name || (view.dataset.appView === "payments" && state.profile.role === "student");
        });
        document.querySelectorAll("[data-view-target]").forEach((button) => {
            const active = button.dataset.viewTarget === name;
            button.classList.toggle("active", active);
            if (active) button.setAttribute("aria-current", "page");
            else button.removeAttribute("aria-current");
        });
        const labels = { overview: "Overview", records: state.profile.role === "student" ? "My fees" : state.profile.role === "gym" ? "Members" : "Students", payments: "Payment details" };
        setText("[data-breadcrumb]", labels[name] || "Overview");
        if (name === "records") renderRecordList(document.querySelector("[data-full-records]"), filteredRecords());
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function initializeRecordDialog() {
        const dialog = document.querySelector("#record-dialog");
        const form = document.querySelector("#record-form");
        const today = store.today();

        document.querySelectorAll("[data-close-dialog]").forEach((button) => {
            button.addEventListener("click", () => dialog.close());
        });

        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) dialog.close();
        });

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const editId = dialog.dataset.editId;
            const existing = state.records.find((record) => record.id === editId);
            const record = {
                id: editId || store.createId(),
                name: document.querySelector("#record-name").value.trim(),
                phone: document.querySelector("#record-phone").value.trim(),
                group: document.querySelector("#record-group").value.trim(),
                amount: Number(document.querySelector("#record-amount").value),
                joinedDate: document.querySelector("#record-join-date").value,
                dueDate: document.querySelector("#record-due-date").value,
                frequency: document.querySelector("#record-frequency").value,
                upiId: document.querySelector("#record-upi").value.trim(),
                payments: existing?.payments || [],
                paidOnce: existing?.paidOnce || false
            };

            if (existing) state.records = state.records.map((item) => item.id === editId ? record : item);
            else state.records.push(record);
            if (!saveState()) return;
            dialog.close();
            delete dialog.dataset.editId;
            renderDashboard();
            showToast(existing ? "Fee record updated." : "Fee record added.");
        });

        document.querySelector("#record-join-date").value = today;
        document.querySelector("#record-due-date").value = today;
        document.querySelector("[data-records-empty] [data-open-record]")?.addEventListener("click", () => openRecordDialog());
    }

    function openRecordDialog(record) {
        const dialog = document.querySelector("#record-dialog");
        const form = document.querySelector("#record-form");
        form.reset();
        delete dialog.dataset.editId;
        document.querySelector("#record-join-date").value = store.today();
        document.querySelector("#record-due-date").value = store.today();
        if (record) {
            dialog.dataset.editId = record.id;
            document.querySelector("#record-name").value = record.name;
            document.querySelector("#record-phone").value = record.phone || "";
            document.querySelector("#record-group").value = record.group || "";
            document.querySelector("#record-amount").value = record.amount;
            document.querySelector("#record-frequency").value = record.frequency || "monthly";
            document.querySelector("#record-join-date").value = record.joinedDate || store.today();
            document.querySelector("#record-due-date").value = record.dueDate || store.today();
            document.querySelector("#record-upi").value = record.upiId || "";
            setText("[data-record-form-title]", state.profile.role === "student" ? "Edit fee details" : "Edit fee record");
            setText("[data-save-record]", "Save changes");
        } else {
            const isStudent = state.profile.role === "student";
            setText("[data-record-form-title]", isStudent ? "Track a fee" : state.profile.role === "gym" ? "Add a member" : "Add a student");
            setText("[data-save-record]", isStudent ? "Save fee details" : "Save fee record");
        }
        dialog.showModal();
        document.querySelector("#record-name").focus();
    }

    function initializeFilters() {
        document.querySelectorAll("[data-record-filter]").forEach((button) => {
            button.addEventListener("click", () => {
                activeFilter = button.dataset.recordFilter;
                document.querySelectorAll("[data-record-filter]").forEach((item) => {
                    const active = item === button;
                    item.classList.toggle("active", active);
                    item.setAttribute("aria-pressed", String(active));
                });
                renderRecordList(document.querySelector("[data-full-records]"), filteredRecords());
            });
        });
    }

    function filteredRecords() {
        const sorted = store.sortRecords(state.records);
        if (activeFilter === "all") return sorted;
        return sorted.filter((record) => {
            const recordStatus = store.status(record);
            if (activeFilter === "overdue") return recordStatus === "overdue";
            if (activeFilter === "due") return recordStatus === "due";
            return recordStatus === "paid";
        });
    }

    function renderDashboard() {
        const records = state.records;
        const sorted = store.sortRecords(records);
        const statuses = records.map((record) => store.status(record));
        const paymentsTotal = records.reduce((sum, record) => sum + (record.payments || []).reduce((total, payment) => total + Number(payment.amount || 0), 0), 0);
        const balance = records.reduce((sum, record) => sum + (store.status(record) === "paid" ? 0 : Number(record.amount || 0)), 0);
        const overdueCount = statuses.filter((status) => status === "overdue").length;

        setText('[data-metric="count"]', String(records.length));
        setText('[data-metric="income"]', store.money(paymentsTotal));
        setText('[data-metric="balance"]', store.money(balance));
        renderIncomeTrend(records);
        renderIncomeChart();
        setText("[data-overdue-caption]", `${overdueCount} late`);
        setText("[data-record-count]", String(records.length));
        setText('[data-filter-count="all"]', String(records.length));
        setText('[data-filter-count="overdue"]', String(statuses.filter((value) => value === "overdue").length));
        setText('[data-filter-count="due"]', String(statuses.filter((value) => value === "due").length));
        setText('[data-filter-count="paid"]', String(statuses.filter((value) => value === "paid").length));

        const overviewList = document.querySelector("[data-overview-records]");
        const followUps = sorted.filter((record) => store.status(record) !== "paid").slice(0, 5);
        overviewList.replaceChildren(...followUps.map((record) => createRecordCard(record, true)));
        document.querySelector("[data-overview-empty]").hidden = followUps.length > 0;
        if (!followUps.length && records.length) {
            setText("[data-empty-heading]", "No follow-ups right now");
            setText("[data-empty-copy]", "Everything is up to date. Your saved records are still available in the list.");
        } else {
            setText("[data-empty-heading]", state.profile.role === "student" ? "Add the first fee to track" : `Add your first ${state.profile.role === "gym" ? "member" : "student"}`);
            setText("[data-empty-copy]", state.profile.role === "student" ? "Keep your provider, due date and payment history together." : `Add a ${state.profile.role === "gym" ? "member" : "student"} to track joining dates, fees and WhatsApp reminders.`);
        }
        renderRecordList(document.querySelector("[data-full-records]"), filteredRecords());
        document.querySelector("[data-records-empty]").hidden = filteredRecords().length > 0;
    }

    function renderIncomeTrend(records) {
        const now = new Date();
        const thisMonth = now.getFullYear() * 12 + now.getMonth();
        let current = 0;
        let previous = 0;
        records.forEach((record) => (record.payments || []).forEach((payment) => {
            const date = parseLocalDate(payment.paidAt);
            if (!date) return;
            const monthKey = date.getFullYear() * 12 + date.getMonth();
            if (monthKey === thisMonth) current += Number(payment.amount) || 0;
            else if (monthKey === thisMonth - 1) previous += Number(payment.amount) || 0;
        }));

        const badge = document.querySelector("[data-income-trend]");
        if (!badge) return;
        badge.classList.remove("trend-up", "trend-down", "trend-neutral");
        if (!current && !previous) {
            badge.textContent = "No change vs last month";
            badge.classList.add("trend-neutral");
            return;
        }
        const change = previous ? ((current - previous) / previous) * 100 : 100;
        const rising = change >= 0;
        badge.textContent = `${rising ? "↑" : "↓"} ${rising ? "+" : ""}${Math.round(change)}% vs last month`;
        badge.classList.add(rising ? "trend-up" : "trend-down");
    }

    function renderIncomeChart() {
        const chart = document.querySelector("[data-income-chart]");
        if (!chart) return;
        const now = new Date();
        const year = now.getFullYear();
        let values;
        let labels;
        let total;
        if (incomeRange === "year") {
            values = Array(12).fill(0);
            labels = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(year, index, 1)));
            state.records.forEach((record) => (record.payments || []).forEach((payment) => {
                const date = parseLocalDate(payment.paidAt);
                if (date && date.getFullYear() === year) values[date.getMonth()] += Number(payment.amount) || 0;
            }));
        } else {
            const month = now.getMonth();
            values = Array(5).fill(0);
            labels = ["1–7", "8–14", "15–21", "22–28", "29–31"];
            state.records.forEach((record) => (record.payments || []).forEach((payment) => {
                const date = parseLocalDate(payment.paidAt);
                if (date && date.getFullYear() === year && date.getMonth() === month) {
                    values[Math.min(4, Math.floor((date.getDate() - 1) / 7))] += Number(payment.amount) || 0;
                }
            }));
        }
        total = values.reduce((sum, value) => sum + value, 0);
        const maxValue = Math.max(...values, 0);
        const positive = values.filter((value) => value > 0).sort((a, b) => b - a);
        const highCutoff = positive[0] || Infinity;
        const midCutoff = positive.length > 1 ? positive[Math.ceil(positive.length / 2) - 1] : -1;
        const columns = values.map((value, index) => {
            const column = document.createElement("div");
            column.className = "chart-column";
            column.setAttribute("role", "img");
            column.setAttribute("aria-label", `${labels[index]}: ${store.money(value)} received`);
            const amount = document.createElement("span");
            amount.className = "chart-column-value";
            amount.textContent = value ? store.money(value) : "";
            const track = document.createElement("span");
            track.className = "chart-bar-track";
            const bar = document.createElement("span");
            const height = maxValue ? Math.max(5, (value / maxValue) * 100) : 0;
            let tone = "bar-low";
            if (value > 0 && value === highCutoff) tone = "bar-high";
            else if (value > 0 && value >= midCutoff && positive.length > 2) tone = "bar-mid";
            bar.className = `chart-bar ${tone}${value ? "" : " chart-bar-empty"}`;
            bar.style.setProperty("--bar-height", `${height}%`);
            track.append(bar);
            const label = document.createElement("span");
            label.className = "chart-column-label";
            label.textContent = labels[index];
            column.append(amount, track, label);
            return column;
        });
        chart.replaceChildren(...columns);
        chart.dataset.range = incomeRange;
        chart.setAttribute("aria-label", incomeRange === "year" ? `Income by month for ${year}` : "Income by week this month");
        setText("[data-chart-range-total]", store.money(total));
        setText("[data-chart-range-label]", incomeRange === "year" ? "This year" : "This month");
        setText("[data-chart-caption]", incomeRange === "year" ? `Payments received in ${year}` : `Payments received in ${new Intl.DateTimeFormat("en-IN", { month: "long" }).format(now)}`);
    }

    function parseLocalDate(value) {
        if (!value) return null;
        const [year, month, day] = String(value).split("-").map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day, 12);
    }

    function renderRecordList(container, records) {
        if (!container) return;
        container.replaceChildren(...records.map((record) => createRecordCard(record, false)));
    }

    function createRecordCard(record, compact) {
        const card = document.createElement("article");
        card.className = `record-card${compact ? " record-card-compact" : ""}`;

        const main = document.createElement("div");
        main.className = "record-main";
        const avatar = document.createElement("span");
        avatar.className = "record-avatar";
        avatar.textContent = initials(record.name);
        avatar.setAttribute("aria-hidden", "true");
        const person = document.createElement("div");
        person.className = "record-person-copy";
        const name = document.createElement("strong");
        name.textContent = record.name;
        const subline = document.createElement("span");
        subline.textContent = [record.group, record.phone].filter(Boolean).join(" · ") || "No extra details";
        person.append(name, subline);
        const fee = document.createElement("div");
        fee.className = "record-fee-block";
        const amount = document.createElement("strong");
        amount.textContent = store.money(record.amount);
        const cycle = document.createElement("span");
        cycle.textContent = frequencyLabel(record.frequency);
        fee.append(amount, cycle);
        main.append(avatar, person, fee);

        const status = store.status(record);
        const details = document.createElement("div");
        details.className = "record-details-grid";
        details.append(
            detailCell("Joined", store.formatDate(record.joinedDate)),
            detailCell("Last paid", latestPaymentDate(record)),
            detailCell(status === "overdue" ? `Late since · ${store.daysLate(record.dueDate)}d` : "Next due", status === "paid" ? "Paid once" : store.formatDate(record.dueDate))
        );

        const statusChip = document.createElement("span");
        statusChip.className = `record-status status-${status}`;
        statusChip.textContent = status === "overdue" ? `${store.daysLate(record.dueDate)} days late` : status === "due" ? "Due soon" : status === "paid" ? "Paid" : "Upcoming";
        details.append(statusChip);

        const actions = document.createElement("div");
        actions.className = "record-actions";
        if (state.profile.role === "student" && status !== "paid") {
            actions.append(actionButton(record.upiId ? "Pay via UPI" : "Add UPI to pay", "pay", record.id, "action-pay"));
        }
        if (record.phone) {
            actions.append(
                actionButton("WhatsApp", "whatsapp", record.id, "action-whatsapp"),
                actionButton("SMS", "sms", record.id, "action-sms")
            );
        }
        if (status !== "paid") actions.append(actionButton("Mark paid", "paid", record.id, "action-paid"));
        const more = document.createElement("details");
        more.className = "record-more-menu";
        const summary = document.createElement("summary");
        summary.textContent = "More";
        more.append(summary, actionButton("Edit details", "edit", record.id), actionButton("Remove record", "remove", record.id, "action-remove"));
        actions.append(more);

        card.append(main, details, actions);
        if ((record.payments || []).length) card.append(createPaymentHistory(record));
        actions.addEventListener("click", (event) => handleRecordAction(event, record.id, card));
        return card;
    }

    function detailCell(label, value) {
        const cell = document.createElement("span");
        cell.className = "record-detail-cell";
        const heading = document.createElement("small");
        heading.textContent = label;
        const content = document.createElement("strong");
        content.textContent = value;
        cell.append(heading, content);
        return cell;
    }

    function actionButton(label, action, id, extraClass) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `record-action-button ${extraClass || ""}`.trim();
        button.dataset.action = action;
        button.dataset.recordId = id;
        button.textContent = label;
        return button;
    }

    function createPaymentHistory(record) {
        const details = document.createElement("details");
        details.className = "record-payment-history";
        const summary = document.createElement("summary");
        summary.textContent = `Payment history · ${record.payments.length}`;
        const list = document.createElement("ul");
        [...record.payments].reverse().forEach((payment) => {
            const row = document.createElement("li");
            const paymentDate = document.createElement("span");
            paymentDate.textContent = store.formatDate(payment.paidAt);
            const paymentAmount = document.createElement("strong");
            paymentAmount.textContent = store.money(payment.amount);
            row.append(paymentDate, paymentAmount);
            list.append(row);
        });
        details.append(summary, list);
        return details;
    }

    function handleRecordAction(event, id, card) {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const record = state.records.find((item) => item.id === id);
        if (!record) return;
        const action = button.dataset.action;
        if (action === "paid") recordPayment(record);
        else if (action === "pay") launchUpiPayment(record);
        else if (action === "whatsapp") sendReminder(record, "whatsapp");
        else if (action === "sms") sendReminder(record, "sms");
        else if (action === "edit") openRecordDialog(record);
        else if (action === "remove") removeRecord(record);
        if (card.querySelector("details.record-more-menu") && action !== "edit") card.querySelector("details.record-more-menu").open = false;
    }

    function recordPayment(record) {
        if (!window.confirm(`Record ${store.money(record.amount)} as received from ${record.name} today?`)) return;
        record.payments = Array.isArray(record.payments) ? record.payments : [];
        record.payments.push({ amount: Number(record.amount), paidAt: store.today(), dueDate: record.dueDate });
        if (record.frequency === "once") record.paidOnce = true;
        else record.dueDate = store.nextCycle(store.today(), record.frequency);
        if (!saveState()) return;
        renderDashboard();
        showToast(record.frequency === "once"
            ? `Payment of ${store.money(record.amount)} recorded for ${record.name}.`
            : `Payment recorded. Next fee date: ${store.formatDate(record.dueDate)}.`);
    }

    function launchUpiPayment(record) {
        const upiId = String(record.upiId || "").trim();
        if (!upiId || !upiId.includes("@")) {
            openRecordDialog(record);
            document.querySelector("#record-upi").focus();
            showToast("Add your fee provider's UPI ID to open a payment app.");
            return;
        }
        const paymentLink = store.upiPaymentLink(upiId, record.name, record.amount, `${record.group || "Fee"} payment`);
        window.location.assign(paymentLink);
    }

    function removeRecord(record) {
        if (!window.confirm(`Remove ${record.name} and their fee history from this browser?`)) return;
        state.records = state.records.filter((item) => item.id !== record.id);
        if (!saveState()) return;
        renderDashboard();
        showToast("Fee record removed.");
    }

    function latestPaymentDate(record) {
        const payments = record.payments || [];
        return payments.length ? store.formatDate(payments[payments.length - 1].paidAt) : "Not paid yet";
    }

    function frequencyLabel(value) {
        return ({ monthly: "Monthly", weekly: "Weekly", quarterly: "Every 3 months", once: "One-time" })[value] || "Monthly";
    }

    function initializePaymentSetup() {
        const form = document.querySelector("#payment-profile-form");
        const fileInput = document.querySelector("#payment-qr-file");
        const feedback = document.querySelector("#payment-feedback");
        const qrImage = document.querySelector("[data-qr-preview]");
        let selectedFile = null;

        fileInput.addEventListener("change", () => {
            selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            if (selectedFile) {
                const temporaryUrl = URL.createObjectURL(selectedFile);
                qrImage.src = temporaryUrl;
                qrImage.hidden = false;
                document.querySelector("[data-qr-empty]").hidden = true;
            }
        });

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            let qrImageData = state.profile.qrImage || "";
            try {
                if (selectedFile) qrImageData = await compressQrImage(selectedFile);
            } catch (error) {
                feedback.hidden = false;
                feedback.textContent = error.message || "That QR image could not be saved.";
                return;
            }

            state.profile.phone = document.querySelector("#payment-phone").value.trim();
            state.profile.upiId = document.querySelector("#payment-upi").value.trim();
            state.profile.qrImage = qrImageData;
            if (!saveState()) {
                feedback.hidden = false;
                feedback.textContent = "The payment details did not fit in this browser's local storage. Try a smaller QR image.";
                return;
            }
            feedback.hidden = true;
            selectedFile = null;
            fileInput.value = "";
            renderQrPreview();
            showToast("Payment details saved on this device.");
        });

        document.querySelector("[data-remove-qr]").addEventListener("click", () => {
            state.profile.qrImage = "";
            if (!saveState()) return;
            renderQrPreview();
            showToast("Payment QR removed.");
        });
    }

    async function compressQrImage(file) {
        if (!file.type.startsWith("image/")) throw new Error("Choose a PNG, JPG or WebP image.");
        if (file.size > 6 * 1024 * 1024) throw new Error("Choose a QR image smaller than 6 MB.");

        const source = URL.createObjectURL(file);
        try {
            const image = await new Promise((resolve, reject) => {
                const element = new Image();
                element.onload = () => resolve(element);
                element.onerror = () => reject(new Error("This image could not be opened."));
                element.src = source;
            });
            const canvas = document.createElement("canvas");
            canvas.width = 600;
            canvas.height = 600;
            const context = canvas.getContext("2d");
            context.fillStyle = "#fff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(560 / image.width, 560 / image.height, 1);
            const width = Math.round(image.width * scale);
            const height = Math.round(image.height * scale);
            context.imageSmoothingEnabled = false;
            context.drawImage(image, (600 - width) / 2, (600 - height) / 2, width, height);
            return canvas.toDataURL("image/png");
        } finally {
            URL.revokeObjectURL(source);
        }
    }

    function renderQrPreview() {
        const image = document.querySelector("[data-qr-preview]");
        const empty = document.querySelector("[data-qr-empty]");
        const download = document.querySelector("[data-qr-download]");
        const remove = document.querySelector("[data-remove-qr]");
        const data = state.profile?.qrImage || "";
        const upiId = state.profile?.upiId || "";
        image.src = data;
        image.hidden = !data;
        empty.hidden = Boolean(data);
        download.href = data || "#";
        download.hidden = !data;
        remove.hidden = !data;
        setText("[data-upi-caption]", upiId || "No UPI ID saved");
    }

    function initializeNotifications() {
        document.querySelectorAll("[data-enable-notifications]").forEach((button) => {
            button.addEventListener("click", async () => {
                if (!("Notification" in window)) {
                    showToast("This browser does not support desktop alerts. Your due list is still shown here.");
                    return;
                }
                let permission = Notification.permission;
                if (permission === "default") permission = await Notification.requestPermission();
                if (permission === "granted") {
                    setText("[data-notification-label]", "Due alerts are on");
                    showToast("Due alerts are on for this browser.");
                    notifyDueOwner(true);
                } else {
                    showToast("Browser alerts are off. You can still see late fees in the dashboard.");
                }
            });
        });
        if ("Notification" in window && Notification.permission === "granted") {
            setText("[data-notification-label]", "Due alerts are on");
        }
    }

    function notifyDueOwner(userRequested) {
        if (state.profile.role === "student" || !("Notification" in window) || Notification.permission !== "granted") return;
        const due = state.records.filter((record) => ["overdue", "due"].includes(store.status(record)));
        if (!due.length) return;
        const key = `feeflow-last-alert-${store.today()}`;
        if (!userRequested) {
            try {
                if (localStorage.getItem(key)) return;
                localStorage.setItem(key, "shown");
            } catch {
                // The in-app due list remains available if storage is blocked.
            }
        }
        try {
            new Notification("FeeFlow · fees to follow up", {
                body: `${due.length} ${state.profile.role === "gym" ? "membership" : "fee"} record${due.length === 1 ? "" : "s"} due soon or late.`,
                icon: ""
            });
        } catch {
            // Some browsers permit alerts only from a secure hosted page.
        }
    }

    function sendReminder(record, channel) {
        const phone = store.phoneDigits(record.phone);
        if (!phone) {
            showToast("Add a mobile number to this fee record first.");
            return;
        }
        const profile = state.profile;
        const amount = store.money(record.amount);
        const feeType = profile.role === "gym" ? "membership fee" : "fee";
        const dueText = store.formatDate(record.dueDate);
        let message;

        if (profile.role === "student") {
            message = `Hello ${record.name}, I am tracking my ${record.group || "fee"} of ${amount}, due on ${dueText}. Please share the payment details.\n— ${profile.name}${profile.phone ? `\nContact: ${profile.phone}` : ""}`;
        } else {
            message = `Hello ${record.name}, a friendly ${feeType} reminder from ${profile.workspaceName}: ${amount} was due on ${dueText}. If you have already paid, please ignore this message.`;
            if (profile.upiId) {
                const paymentLink = store.upiPaymentLink(profile.upiId, profile.workspaceName, record.amount, `${feeType} - ${record.name}`);
                message += `\nUPI ID: ${profile.upiId}\nPay via any UPI app: ${paymentLink}`;
            } else if (profile.qrImage) {
                message += "\nI can share the payment QR with you.";
            }
            message += `\n— ${profile.name}${profile.phone ? `\nContact: ${profile.phone}` : ""}`;
        }

        if (channel === "whatsapp" && profile.role !== "student" && profile.qrImage && tryShareQr(message)) return;
        if (channel === "whatsapp") {
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
            showToast("WhatsApp draft opened. Check it, then tap Send.");
        } else {
            window.open(`sms:+${phone}?body=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
            showToast("SMS draft opened. Check it, then tap Send.");
        }
    }

    function tryShareQr(message) {
        if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
        try {
            const file = dataUrlToFile(state.profile.qrImage, "feeflow-payment-qr.png");
            if (!navigator.canShare({ files: [file] })) return false;
            navigator.share({ title: "Fee payment reminder", text: message, files: [file] })
                .then(() => showToast("Choose WhatsApp in the share sheet and review the reminder before sending."))
                .catch((error) => {
                    if (error.name !== "AbortError") showToast("Sharing was not completed. Try the WhatsApp button again.");
                });
            return true;
        } catch {
            return false;
        }
    }

    function dataUrlToFile(dataUrl, fileName) {
        const [header, encoded] = dataUrl.split(",");
        const mime = (header.match(/data:(.*?);base64/) || [])[1] || "image/png";
        const binary = window.atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return new File([bytes], fileName, { type: mime });
    }

    function initializeReportDownload() {
        const button = document.querySelector("[data-export-report]");
        if (!button) return;
        button.addEventListener("click", () => {
            const headings = ["Name", "Phone", "Class / plan", "Joining date", "Last paid", "Next due", "Fee amount", "Status"];
            const rows = state.records.map((record) => [
                record.name,
                record.phone,
                record.group,
                record.joinedDate,
                latestPaymentDate(record),
                record.dueDate,
                record.amount,
                store.status(record)
            ]);
            const csv = [headings, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
            const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = "feeflow-fee-records.csv";
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast("Your fee records were downloaded as a CSV.");
        });
    }

    function escapeCsv(value) {
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
    }

    function saveState() {
        if (store.save(state)) return true;
        showToast("Could not save this change in browser storage. Try a smaller QR image.");
        return false;
    }

    function showToast(message) {
        const toast = document.querySelector("[data-app-toast]");
        if (!toast) return;
        toast.textContent = message;
        toast.hidden = false;
        window.clearTimeout(toastTimeout);
        toastTimeout = window.setTimeout(() => { toast.hidden = true; }, 5200);
    }

    function setText(selector, value) {
        const node = document.querySelector(selector);
        if (node) node.textContent = value;
    }

    function initial(value) {
        return String(value || "F").trim().charAt(0).toUpperCase() || "F";
    }

    function initials(value) {
        return String(value || "F").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "F";
    }

    function initializePreviewTabs() {
        const tabs = Array.from(document.querySelectorAll("[data-preview-tab]"));
        const panels = Array.from(document.querySelectorAll("[data-preview-panel]"));
        if (!tabs.length || !panels.length) return;
        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const selected = tab.dataset.previewTab;
                tabs.forEach((item) => {
                    const active = item === tab;
                    item.classList.toggle("active", active);
                    item.setAttribute("aria-selected", String(active));
                });
                panels.forEach((panel) => { panel.hidden = panel.dataset.previewPanel !== selected; });
            });
        });
    }

    initializeSignup();
    initializeLogin();
    initializeDashboard();
    initializePreviewTabs();
})();
