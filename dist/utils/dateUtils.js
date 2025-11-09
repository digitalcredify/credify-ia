"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCurrentMonth = isCurrentMonth;
exports.getCurrentMonth = getCurrentMonth;
function isCurrentMonth(targetMonth) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentYearMonth = `${currentYear}-${currentMonth}`;
    console.log(`[Date Utils] Mês alvo: ${targetMonth}`);
    console.log(`[Date Utils] Mês atual: ${currentMonth}`);
    console.log(`[Date Utils] É mês atual? ${targetMonth === currentMonth}`);
    return targetMonth === currentMonth;
}
function getCurrentMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return month;
}
