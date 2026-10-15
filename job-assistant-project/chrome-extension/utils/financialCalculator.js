/**
 * @file Cálculos financeiros CLT vs PJ.
 *
 * Tabelas vigentes em 2026:
 *  - INSS: Portaria Interministerial MPS/MF nº 13/2026 (teto R$ 8.475,55).
 *  - IRRF: tabela progressiva mensal 2026 + redutor da Lei nº 15.270/2025
 *    (isenção efetiva até R$ 5.000,00 de rendimento bruto mensal; redução
 *    decrescente até R$ 7.350,00).
 *
 * Tabelas fiscais mudam todo ano: para atualizar, altere apenas as constantes
 * deste bloco. Os resultados são estimativas e não substituem um contador.
 */

// ---------------------------------------------------------------------------
// Tabelas 2026
// ---------------------------------------------------------------------------

export const MINIMUM_WAGE = 1621.00;

/** Faixas progressivas do INSS do empregado. Cada alíquota incide só na parcela da faixa. */
export const INSS_TABLE = [
    { limit: 1621.00, percent: 0.075 },
    { limit: 2902.84, percent: 0.09 },
    { limit: 4354.27, percent: 0.12 },
    { limit: 8475.55, percent: 0.14 } // teto
];

/** Tabela progressiva mensal do IRRF (base = bruto − INSS − deduções). */
export const IRRF_TABLE = [
    { limit: 2428.80, percent: 0, deduction: 0 },
    { limit: 2826.65, percent: 0.075, deduction: 182.16 },
    { limit: 3751.05, percent: 0.15, deduction: 394.16 },
    { limit: 4664.68, percent: 0.225, deduction: 675.49 },
    { limit: Infinity, percent: 0.275, deduction: 908.73 }
];

export const DEDUCTION_PER_DEPENDENT = 189.59;
export const SIMPLIFIED_DISCOUNT = 607.20;

/** Redutor da Lei 15.270/2025, calculado sobre o rendimento bruto tributável. */
export const IRRF_REDUCTION = {
    fullExemptionUpTo: 5000.00,
    maxReduction: 312.89,
    phaseOutUpTo: 7350.00,
    constant: 978.62,
    coefficient: 0.133145
};

export const FGTS_RATE = 0.08;
export const FGTS_FINE_RATE = 0.40;

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

// toPrecision(12) remove o ruído binário (121.575 vira 121.57499999...) antes do arredondamento comercial.
const round2 = (value) => Math.round(Number((value * 100).toPrecision(12))) / 100;
const num = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

// ---------------------------------------------------------------------------
// CLT
// ---------------------------------------------------------------------------

/**
 * INSS mensal progressivo, limitado ao teto.
 * @param {number} grossSalary - Salário bruto mensal.
 * @returns {number}
 */
export function calculateInss(grossSalary) {
    const salary = num(grossSalary);
    let total = 0;
    let lowerLimit = 0;
    for (const range of INSS_TABLE) {
        if (salary <= lowerLimit) break;
        total += (Math.min(salary, range.limit) - lowerLimit) * range.percent;
        lowerLimit = range.limit;
    }
    return round2(total);
}

/**
 * Redutor mensal do IRRF (Lei 15.270/2025).
 * @param {number} grossTaxableIncome - Rendimento tributável bruto (sem descontos).
 * @param {number} taxBeforeReduction - Imposto calculado pela tabela.
 * @returns {number} Valor a abater do imposto.
 */
export function calculateIrrfReduction(grossTaxableIncome, taxBeforeReduction) {
    const income = num(grossTaxableIncome);
    const { fullExemptionUpTo, maxReduction, phaseOutUpTo, constant, coefficient } = IRRF_REDUCTION;
    let reduction = 0;
    if (income <= fullExemptionUpTo) {
        reduction = maxReduction;
    } else if (income <= phaseOutUpTo) {
        reduction = constant - coefficient * income;
    }
    return round2(Math.min(Math.max(reduction, 0), taxBeforeReduction));
}

/**
 * IRRF mensal. Usa o que for mais vantajoso entre deduções legais
 * (INSS + dependentes) e o desconto simplificado, e aplica o redutor.
 * @param {number} grossSalary - Rendimento bruto tributável do mês.
 * @param {number} inss - INSS descontado.
 * @param {number} [dependents=0] - Número de dependentes.
 * @returns {number}
 */
export function calculateIrrf(grossSalary, inss, dependents = 0) {
    const gross = num(grossSalary);
    if (gross <= 0) return 0;

    const legalDeductions = num(inss) + num(dependents) * DEDUCTION_PER_DEPENDENT;
    const base = gross - Math.max(legalDeductions, SIMPLIFIED_DISCOUNT);
    if (base <= 0) return 0;

    const range = IRRF_TABLE.find((r) => base <= r.limit);
    const tax = Math.max(0, base * range.percent - range.deduction);
    return round2(Math.max(0, tax - calculateIrrfReduction(gross, tax)));
}

/**
 * Valor líquido de um pagamento CLT (salário mensal, 13º ou 1/3 de férias).
 * @returns {{gross:number, inss:number, irrf:number, net:number}}
 */
export function calculateNetPayment(gross, dependents = 0) {
    const inss = calculateInss(gross);
    const irrf = calculateIrrf(gross, inss, dependents);
    return { gross: round2(gross), inss, irrf, net: round2(gross - inss - irrf) };
}

/**
 * 13º salário bruto. Com menos de 1 ano, é proporcional aos meses (1/12 por mês).
 * @param {number} monthlyGrossSalary - Salário bruto MENSAL.
 * @param {number} timeInCompanyYears - Tempo estimado na empresa, em anos.
 */
export function calculateThirteenthSalary(monthlyGrossSalary, timeInCompanyYears = 1) {
    const months = Math.min(12, Math.round(num(timeInCompanyYears, 1) * 12));
    return round2(num(monthlyGrossSalary) * (months / 12));
}

/**
 * Adicional de 1/3 de férias (o mês de férias em si já está nos 12 salários).
 * Só há direito após 12 meses (período aquisitivo).
 * @param {number} monthlyGrossSalary - Salário bruto MENSAL.
 * @param {number} timeInCompanyYears - Tempo estimado na empresa, em anos.
 */
export function calculateVacationBonus(monthlyGrossSalary, timeInCompanyYears = 1) {
    return num(timeInCompanyYears, 1) >= 1 ? round2(num(monthlyGrossSalary) / 3) : 0;
}

export const calculateFgtsMonthly = (grossSalary) => round2(num(grossSalary) * FGTS_RATE);

/**
 * Multa de 40% sobre o FGTS acumulado no tempo estimado (inclui o FGTS do 13º e do 1/3).
 * Só é paga em demissão sem justa causa; aqui é uma estimativa total.
 */
export function calculateRescissionFine(annualFgts, timeInCompanyYears = 1) {
    return round2(num(annualFgts) * num(timeInCompanyYears, 1) * FGTS_FINE_RATE);
}

/**
 * Resultado completo para o regime CLT.
 * @param {Object} inputs - salaryClt, vrClt, healthPlanClt, bonusClt, timeInCompanyYearsClt, dependents.
 */
export function calculateCltResults(inputs = {}) {
    const salary = num(inputs.salaryClt);
    const vr = num(inputs.vrClt);
    const healthPlan = num(inputs.healthPlanClt);
    const bonus = num(inputs.bonusClt);
    const years = num(inputs.timeInCompanyYearsClt, 1) || 1;
    const dependents = num(inputs.dependents);

    const monthly = calculateNetPayment(salary, dependents);
    const netMonthlyClt = round2(monthly.net - healthPlan + vr);

    // 13º e 1/3 de férias são tributados separadamente do salário do mês.
    const thirteenth = calculateNetPayment(calculateThirteenthSalary(salary, years), dependents);
    const vacationBonus = calculateNetPayment(calculateVacationBonus(salary, years), dependents);
    // PLR/bônus tem tabela própria; aqui tratado como valor líquido informado pelo usuário.

    const fgtsMonthly = calculateFgtsMonthly(salary);
    const fgtsAnnual = round2((salary * 12 + thirteenth.gross + vacationBonus.gross) * FGTS_RATE);
    const rescissionFine = calculateRescissionFine(fgtsAnnual, years);

    const netAnnualClt = round2(netMonthlyClt * 12 + thirteenth.net + vacationBonus.net + bonus);
    const totalPackageAnnualClt = round2(netAnnualClt + fgtsAnnual);

    return {
        grossSalaryClt: salary,
        inssMonthly: monthly.inss,
        inssAnnual: round2(monthly.inss * 12 + thirteenth.inss + vacationBonus.inss),
        irrfMonthly: monthly.irrf,
        irrfAnnual: round2(monthly.irrf * 12 + thirteenth.irrf + vacationBonus.irrf),
        thirteenthSalary: thirteenth.net,
        vacation: vacationBonus.net,
        fgtsMonthly,
        fgtsAnnual,
        rescissionFine,
        vrVa: vr,
        healthPlanCltOut: healthPlan,
        bonusClt: bonus,
        netMonthlyClt,
        netAnnualClt,
        totalPackageAnnualClt
    };
}

// ---------------------------------------------------------------------------
// PJ
// ---------------------------------------------------------------------------

/**
 * Resultado para o regime PJ (faturamento mensal com alíquota efetiva informada).
 * @param {Object} inputs - salaryPj, accountantCostPj, taxesPjPercent, healthPlanPj, bonusPj.
 */
export function calculatePjResults(inputs = {}) {
    const revenue = num(inputs.salaryPj);
    const accountant = num(inputs.accountantCostPj);
    const taxRate = Math.min(num(inputs.taxesPjPercent), 100) / 100;
    const healthPlan = num(inputs.healthPlanPj);
    const bonus = num(inputs.bonusPj);

    const taxesPjMonthly = round2(revenue * taxRate);
    const netMonthlyPj = round2(revenue - taxesPjMonthly - accountant - healthPlan);
    const bonusNet = round2(bonus * (1 - taxRate));

    return {
        grossSalaryPj: revenue,
        taxesPjMonthly,
        taxesPjAnnual: round2(taxesPjMonthly * 12 + bonus * taxRate),
        accountantCostPj: accountant,
        healthPlanPj: healthPlan,
        bonusPj: bonusNet,
        netMonthlyPj,
        netAnnualPj: round2(netMonthlyPj * 12 + bonusNet)
    };
}

// ---------------------------------------------------------------------------
// Comparativo
// ---------------------------------------------------------------------------

/**
 * Faturamento PJ mensal necessário para igualar um valor líquido anual alvo.
 */
export function pjRevenueToMatch(targetNetAnnual, inputs = {}) {
    const taxRate = Math.min(num(inputs.taxesPjPercent), 100) / 100;
    if (taxRate >= 1) return Infinity;
    const fixedCosts = num(inputs.accountantCostPj) + num(inputs.healthPlanPj);
    const bonusNet = num(inputs.bonusPj) * (1 - taxRate);
    return round2(((num(targetNetAnnual) - bonusNet) / 12 + fixedCosts) / (1 - taxRate));
}

/**
 * Compara CLT e PJ. A comparação principal inclui o FGTS no pacote CLT,
 * pois é dinheiro do trabalhador (ainda que com saque restrito).
 */
export function compareCltPj(inputs = {}) {
    const clt = calculateCltResults(inputs);
    const pj = calculatePjResults(inputs);
    const difference = round2(pj.netAnnualPj - clt.totalPackageAnnualClt);
    const percent = clt.totalPackageAnnualClt > 0
        ? round2((difference / clt.totalPackageAnnualClt) * 100)
        : 0;

    let winner = 'empate';
    if (difference > 0.005) winner = 'PJ';
    else if (difference < -0.005) winner = 'CLT';

    return {
        clt,
        pj,
        difference,
        percent,
        winner,
        breakEvenPjRevenue: pjRevenueToMatch(clt.totalPackageAnnualClt, inputs)
    };
}
