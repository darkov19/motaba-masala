// ============================================
// Masala Inventory Demo — Business Calculations
// ============================================

/** Format number in Indian currency style: ₹1,23,456.78 */
export const formatCurrency = (amount: number): string => {
    const isNeg = amount < 0;
    const abs = Math.abs(amount);
    const [intPart, decPart] = abs.toFixed(2).split('.');

    let formatted: string;
    if (intPart.length <= 3) {
        formatted = intPart;
    } else {
        formatted = intPart.slice(-3);
        let rest = intPart.slice(0, -3);
        while (rest.length > 2) {
            formatted = rest.slice(-2) + ',' + formatted;
            rest = rest.slice(0, -2);
        }
        if (rest) formatted = rest + ',' + formatted;
    }
    return `${isNeg ? '-' : ''}₹${formatted}.${decPart}`;
};

/** Format a quantity with its unit: "200.00 KG" */
export const formatQty = (qty: number, unit: string): string =>
    `${qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;

/** Weighted average cost when adding new stock */
export const calcWeightedAvgCost = (
    existingQty: number,
    existingAvgCost: number,
    newQty: number,
    newUnitCost: number,
): number => {
    const total = existingQty + newQty;
    if (total === 0) return 0;
    return (existingQty * existingAvgCost + newQty * newUnitCost) / total;
};

/** Yield percentage */
export const calcYieldPct = (outputQty: number, inputQty: number): number => {
    if (inputQty === 0) return 0;
    return (outputQty / inputQty) * 100;
};

/** Wastage (input – output) */
export const calcWastage = (inputQty: number, outputQty: number): number =>
    Math.max(0, inputQty - outputQty);

/** Cost per KG of bulk output = totalInputCost / outputQty */
export const calcBulkCostPerKG = (totalInputCost: number, outputQty: number): number => {
    if (outputQty === 0) return 0;
    return totalInputCost / outputQty;
};

/** Cost per unit of finished good */
export const calcFGCostPerUnit = (
    bulkCostPerKG: number,
    packWeightGrams: number,
    packMaterialCostPerUnit: number,
): number => {
    return bulkCostPerKG * (packWeightGrams / 1000) + packMaterialCostPerUnit;
};

/** Stock value helper */
export const getStockValue = (qty: number, avgCost: number): number => qty * avgCost;

/** Today's date formatted for display */
export const todayFormatted = (): string =>
    new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
