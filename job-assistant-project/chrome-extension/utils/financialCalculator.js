// chrome-extension/utils/financialCalculator.js

/**
 * @file Contém todas as funções de cálculo financeiro para CLT e PJ.
 * Os valores das tabelas de impostos são referenciados para 2025.
 * ATENÇÃO: Estes valores são baseados em pesquisas realizadas em Junho de 2025.
 * Tabelas fiscais (INSS, IRRF, Salário Mínimo, DAS MEI, Simples Nacional)
 * são alteradas anualmente e podem ser ajustadas a qualquer momento por legislação governamental.
 * Para um projeto de portfólio, esta é uma representação válida dos cálculos.
 */

// Tabela INSS para Empregados, Empregados Domésticos e Trabalhadores Avulsos (2025)

export const INSS_TABLE_2025 = [
    { limit: 1518.00, percent: 0.075 }, // até 1 salário mínimo
    { limit: 2793.88, percent: 0.09 },
    { limit: 4190.83, percent: 0.12 },
    { limit: 8157.41, percent: 0.14 } // Teto de contribuição INSS para 2025
];
export const INSS_MAX_CONTRIBUTION_2025 = 951.62; // Valor máximo de desconto INSS (teto)

// Tabela IRRF (Imposto de Renda Retido na Fonte) - Base de cálculo mensal (2025)
export const IRRF_TABLE_2025 = [
    { limit: 2259.20, percent: 0, deduction: 0 },
    { limit: 2826.65, percent: 0.075, deduction: 169.44 },
    { limit: 3751.05, percent: 0.15, deduction: 381.44 },
    { limit: 4664.68, percent: 0.225, deduction: 662.77 },
    { limit: Infinity, percent: 0.275, deduction: 896.00 } 
];

// Dedução por Dependente (2025)
export const DEDUCTION_PER_DEPENDENT_2025 = 189.59;

// Valores fixos do DAS MEI (2025) - Referência para o INSS é o Salário Mínimo 2025 (R$ 1.518,00)
export const MEI_INSS_PERCENTAGE = 0.05;
export const MEI_MINIMUM_WAGE_2025 = 1518.00;
export const MEI_ICMS_TAX_2025 = 1.00;
export const MEI_ISS_TAX_2025 = 5.00;

// Exemplo para um anexo do Simples Nacional (Anexo III)
export const SN_ANEXO_III_2025 = [
    { limit: 180000.00, percent: 0.06, deduction: 0 },
    { limit: 360000.00, percent: 0.112, deduction: 9360.00 },
    { limit: 720000.00, percent: 0.135, deduction: 17640.00 },
    { limit: 1800000.00, percent: 0.16, deduction: 35640.00 },
    { limit: 3600000.00, percent: 0.21, deduction: 125640.00 },
    { limit: 4800000.00, percent: 0.33, deduction: 648000.00 }
];


// --- Funções de Cálculo CLT ---

/**
 * Calcula o valor do INSS mensal com base na tabela progressiva.
 * A lógica é somar as contribuições de cada faixa.
 * @param {number} grossSalary - Salário bruto mensal.
 * @returns {number} Valor do INSS mensal a ser descontado.
 */
export function calculateInss(grossSalary) {
    if (grossSalary <= 0) return 0;

    let totalInss = 0;
    let baseCalculoAtual = grossSalary;

    // Percorre as faixas da tabela do INSS
    for (let i = 0; i < INSS_TABLE_2025.length; i++) {
        const currentRange = INSS_TABLE_2025[i];
        // O limite inferior da faixa atual é o limite da faixa anterior + 1
        const lowerLimitCurrentRange = (i === 0) ? 0 : (INSS_TABLE_2025[i - 1].limit + 0.01);

        // Se o salário bruto for maior que o limite inferior da faixa atual
        if (grossSalary >= lowerLimitCurrentRange) {
            // O valor a ser contribuído nesta faixa é o menor entre:
            // o salário que sobra para ser taxado OU o tamanho da faixa
            const taxableAmountInThisRange = Math.min(grossSalary, currentRange.limit) - lowerLimitCurrentRange + (i === 0 ? 0 : 0.00); // Ajuste para o primeiro limite
            totalInss += taxableAmountInThisRange * currentRange.percent;
        } else {
            // Se o salário não alcança essa faixa, não contribui mais
            break;
        }
    }

    // Garante que não ultrapasse o teto de contribuição do INSS
    return Math.min(totalInss, INSS_MAX_CONTRIBUTION_2025);
}


/**
 * Calcula o valor do IRRF mensal.
 * @param {number} baseCalculo - Salário bruto menos INSS.
 * @param {number} numDependentes - Número de dependentes (0 para esta US, mas mantido para escalabilidade).
 * @returns {number} Valor do IRRF mensal a ser descontado.
 */
export function calculateIrrf(baseCalculo, numDependentes = 0) {
    if (baseCalculo <= 0) return 0;

    const deducaoPorDependente = numDependentes * DEDUCTION_PER_DEPENDENT_2025;
    const baseCalculoComDeducoes = baseCalculo - deducaoPorDependente;

    if (baseCalculoComDeducoes <= 0) return 0;

    let irrf = 0;
    for (const range of IRRF_TABLE_2025) {
        if (baseCalculoComDeducoes <= range.limit) {
            irrf = baseCalculoComDeducoes * range.percent - range.deduction;
            break;
        }
    }
    return Math.max(0, irrf);
}

/**
 * Calcula o 13º Salário Anual (valor bruto para estimativa de benefício).
 * @param {number} annualGrossSalaryClt - Salário bruto anual de referência.
 * @param {number} timeInCompanyYearsClt - Estimativa de tempo na empresa em anos (para proporcionalidade, se usada).
 * @returns {number} Valor do 13º Salário (bruto).
 */
export function calculateThirteenthSalary(monthlyGrossSalary, timeInCompanyYearsClt) {
    // Se a estimativa de tempo for 0, ou se for menor que 1 ano (para não ter 13º no primeiro ano proporcional de forma simples)
    // Para um cálculo mais preciso, o tempo precisaria ser em meses no ano de referência.
    // Vamos considerar que se o tempo for >= 1 ano, ele recebe 1 salário integral de 13º para o cálculo anual.
     if (timeInCompanyYearsClt >= 1) {
        return monthlyGrossSalary; 
     }
    return 0;
}

/**
 * Calcula as Férias + 1/3 Anual (valor bruto para estimativa de benefício).
 * @param {number} annualGrossSalaryClt - Salário bruto anual de referência.
 * @param {number} timeInCompanyYearsClt - Estimativa de tempo na empresa em anos (para proporcionalidade, se usada).
 * @returns {number} Valor das Férias + 1/3 (bruto).
 */
export function calculateVacation(monthlyGrossSalary, timeInCompanyYearsClt) {
    // Férias são adquiridas após 12 meses de trabalho (período aquisitivo).
    // Para simplificar, se o tempo for >= 1 ano, ele tem direito a férias + 1/3.
    if (timeInCompanyYearsClt >= 1) {
        return monthlyGrossSalary * (4 / 3); // Salário mensal + 1/3
    }
    return 0; // Se não completou 1 ano de período aquisitivo, assume 0 (simplificação)
}

/**
 * Calcula o FGTS mensal (8% do salário bruto, pago pelo empregador).
 * @param {number} grossSalary - Salário bruto mensal.
 * @returns {number} Valor do FGTS mensal.
 */
export function calculateFgtsMonthly(grossSalary) {
    return grossSalary * 0.08;
}

/**
 * Calcula a Multa Rescisória do FGTS (40% sobre o saldo do FGTS).
 * @param {number} fgtsMonthly - FGTS mensal.
 * @param {number} timeInCompanyYears - Tempo na empresa em anos.
 * @returns {number} Valor estimado da multa rescisória anual.
 */
export function calculateRescissionFine(fgtsMonthly, timeInCompanyYears) {
    const fgtsAccumulated = fgtsMonthly * 12 * timeInCompanyYears;
    return fgtsAccumulated * 0.40;
}


/**
 * Função principal para calcular todos os resultados para o regime CLT.
 * @param {Object} financialInputs - Dados de entrada financeira da US07.
 * @returns {Object} Um objeto com todos os resultados calculados para CLT.
 */
export function calculateCltResults(financialInputs) {
    const salaryClt = financialInputs.salaryClt || 0;
    const vrClt = financialInputs.vrClt || 0;
    const healthPlanClt = financialInputs.healthPlanClt || 0;
    const annualGrossSalaryClt = financialInputs.annualGrossSalaryClt || 0;
    const bonusClt = financialInputs.bonusClt || 0;
    const timeInCompanyYearsClt = financialInputs.timeInCompanyYearsClt || 1;

    // --- Cálculos Mensais ---
    const inssMonthly = calculateInss(salaryClt);
    const baseIrrfMonthly = salaryClt - inssMonthly; 
    const irrfMonthly = calculateIrrf(baseIrrfMonthly);

    const netMonthlyBeforeBenefits = salaryClt - inssMonthly - irrfMonthly - healthPlanClt;
    const netMonthlyClt = netMonthlyBeforeBenefits + vrClt;

    // --- Cálculos Anuais ---
    const inssAnnual = inssMonthly * 12;
    const irrfAnnual = irrfMonthly * 12;
    const fgtsMonthly = calculateFgtsMonthly(salaryClt);
    const fgtsAnnual = fgtsMonthly * 12;

    const thirteenthSalary = calculateThirteenthSalary(annualGrossSalaryClt, timeInCompanyYearsClt);
    const vacation = calculateVacation(annualGrossSalaryClt, timeInCompanyYearsClt);
    const rescissionFine = calculateRescissionFine(fgtsMonthly, timeInCompanyYearsClt);

    const totalNetAnnualClt = (netMonthlyClt * 12) + thirteenthSalary + vacation + bonusClt;


    return {
        grossSalaryClt: salaryClt,
        inssMonthly: inssMonthly,
        inssAnnual: inssAnnual,
        irrfMonthly: irrfMonthly,
        irrfAnnual: irrfAnnual,
        thirteenthSalary: thirteenthSalary,
        vacation: vacation,
        fgtsMonthly: fgtsMonthly,
        fgtsAnnual: fgtsAnnual,
        rescissionFine: rescissionFine,
        vrVa: vrClt,
        healthPlanCltOut: healthPlanClt,
        bonusClt: bonusClt,
        netMonthlyClt: netMonthlyClt,
        netAnnualClt: totalNetAnnualClt
    };
}

// --- Funções de Cálculo PJ (para US09 - a ser implementada) ---

/**
 * Função principal para calcular todos os resultados para o regime PJ.
 * @param {Object} financialInputs - Dados de entrada financeira da US07.
 * @returns {Object} Um objeto com todos os resultados calculados para PJ.
 */
export function calculatePjResults(financialInputs) {
    const salaryPj = financialInputs.salaryPj || 0;
    const accountantCostPj = financialInputs.accountantCostPj || 0;
    const taxesPjPercent = (financialInputs.taxesPjPercent || 0) / 100;
    const healthPlanPj = financialInputs.healthPlanPj || 0;
    const bonusPj = financialInputs.bonusPj || 0;

    const taxesPjMonthly = salaryPj * taxesPjPercent;
    const netMonthlyPj = salaryPj - taxesPjMonthly - accountantCostPj - healthPlanPj;

    const netAnnualPj = (netMonthlyPj * 12) + bonusPj;

    return {
        grossSalaryPj: salaryPj,
        taxesPjMonthly: taxesPjMonthly,
        taxesPjAnnual: taxesPjMonthly * 12,
        accountantCostPj: accountantCostPj,
        healthPlanPj: healthPlanPj,
        bonusPj: bonusPj,
        netMonthlyPj: netMonthlyPj,
        netAnnualPj: netAnnualPj
    };
}