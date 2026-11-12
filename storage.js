(function () {
    "use strict";

    const STORAGE_KEY = "feeflow-workspace-v1";
    const DAY_MS = 24 * 60 * 60 * 1000;

    function emptyState() {
        return { profile: null, records: [] };
    }

    function load() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (!parsed || typeof parsed !== "object") return emptyState();
            return {
                profile: parsed.profile && typeof parsed.profile === "object" ? parsed.profile : null,
                records: Array.isArray(parsed.records) ? parsed.records : []
            };
        } catch {
            return emptyState();
        }
    }

    function save(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch {
            return false;
        }
    }

    function createId() {
        if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
            return globalThis.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function dateFromInput(value) {
        if (!value) return null;
        const [year, month, day] = value.split("-").map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day, 12, 0, 0, 0);
    }

    function localDateValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function today() {
        return localDateValue(new Date());
    }

    function formatDate(value, options) {
        const date = dateFromInput(value);
        if (!date) return "—";
        return new Intl.DateTimeFormat("en-IN", options || {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function money(value) {
        const amount = Number(value) || 0;
        return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
    }

    function daysUntil(value) {
        const date = dateFromInput(value);
        const todayDate = dateFromInput(today());
        if (!date || !todayDate) return Infinity;
        return Math.round((date.getTime() - todayDate.getTime()) / DAY_MS);
    }

    function status(record) {
        if (record.frequency === "once" && record.paidOnce) return "paid";
        const days = daysUntil(record.dueDate);
        if (days < 0) return "overdue";
        if (days <= 7) return "due";
        return "upcoming";
    }

    function daysLate(value) {
        return Math.max(0, -daysUntil(value));
    }

    function nextCycle(value, frequency) {
        const date = dateFromInput(value) || dateFromInput(today());
        if (frequency === "weekly") {
            date.setDate(date.getDate() + 7);
            return localDateValue(date);
        }

        const months = frequency === "quarterly" ? 3 : 1;
        const dayOfMonth = date.getDate();
        date.setDate(1);
        date.setMonth(date.getMonth() + months);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(dayOfMonth, lastDay));
        return localDateValue(date);
    }

    function sortRecords(records) {
        const rank = { overdue: 0, due: 1, upcoming: 2, paid: 3 };
        return [...records].sort((a, b) => {
            const statusDiff = rank[status(a)] - rank[status(b)];
            if (statusDiff) return statusDiff;
            return String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
        });
    }

    function phoneDigits(value) {
        let digits = String(value || "").replace(/\D/g, "");
        if (digits.length === 10) digits = `91${digits}`;
        else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
        return digits;
    }

    function upiPaymentLink(upiId, name, amount, note) {
        if (!upiId) return "";
        const query = new URLSearchParams({
            pa: upiId.trim(),
            pn: (name || "FeeFlow").trim(),
            am: String(Number(amount) || 0),
            cu: "INR",
            tn: note || "Fee payment"
        });
        return `upi://pay?${query.toString()}`;
    }

    window.FeeFlowStore = {
        load,
        save,
        createId,
        today,
        formatDate,
        money,
        daysUntil,
        daysLate,
        status,
        nextCycle,
        sortRecords,
        phoneDigits,
        upiPaymentLink
    };
})();
