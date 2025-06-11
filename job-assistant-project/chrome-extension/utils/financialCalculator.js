/**
 * @financialCalculator.js Contém todas as funções de cálculo financeiro para CLT e PJ.
 * Os valores das tabelas de impostos são referenciados para 2025.
 * ATENÇÃO: Estes valores são baseados em pesquisas realizadas em Junho de 2025.
 * Tabelas fiscais (INSS, IRRF, Salário Mínimo, DAS MEI, Simples Nacional)
 * são alteradas anualmente e podem ser ajustadas a qualquer momento por legislação governamental.
 * Para um projeto de portfólio, esta é uma representação válida dos cálculos.
 */

// --- Tabelas de Impostos (Valores de 2025) 
export const INSS_TABLE_2025 = [
    { limit: 1518.00, percent: 0.075 }, // até 1 salário mínimo
    { limit: 2793.88, percent: 0.09 },
    { limit: 4190.83, percent: 0.12 },
    { limit: 8157.41, percent: 0.14 } // Teto de contribuição INSS para 2025
];
export const INSS_MAX_CONTRIBUITION_2025 = 951.62; // Valor máximo de desconto INSS (teto)

// --- Tabela IRRF (Imposto de Renda Retido na Fonte) - Base de cálculo mensal (2025)
export const IRPF_TABLE_2025 = [
     { limit: 2259.20, percent: 0, deduction: 0 },
    { limit: 2826.65, percent: 0.075, deduction: 169.44 },
    { limit: 3751.05, percent: 0.15, deduction: 381.44 },
    { limit: 4664.68, percent: 0.225, deduction: 662.77 },
    { limit: Infinity, percent: 0.275, deduction: 896.00 }
];

// dedução por Dependente (2025)
export const DEDUCTION_PER_DEPENDENT_2025 = 189.59;

// Valores fixos do DAS MEI (2025) - Referência para o INSS é o Salário Mínimo 2025 (R$ 1.518,00)
export const MEI_INSS_PERCENTAGE = 0.05; //5% do valor do salário mínimo
export const MEI_MINIMUM_WAGE_2025 = 1518.00; // valor do salário minimo em 2025
export const MEI_ICMS_TAX_2025 = 1.00; //imposto para comérico/ industria 
export const MEI_ISS_TAX_2025 = 5.00; // imposto para serviço

// --- funções de calculo CLT 
/**
 * Calcula o valor do INSS mensal com base na tabela progressiva.
 * @param {number} grossSalary - Salário bruto mensal.
 * @returns {number} Valor do INSS mensal a ser descontado.
 */
export function calculateInss(grossSalary) {
    if (grossSalary <=0) return 0;

    let inss = 0;
    let base = grossSalary;

    // A lógica para INSS é por faixas de contribuição acumuladas ou por alíquota efetiva.
    // foi usada a forma de cálculo por faixas para ser mais precisa, como a Receita Federal.
    // Para simplificar, esta implementação usa a alíquota final da faixa menos a dedução,
    // que é como o imposto de renda, mas para INSS o cálculo é por faixas acumuladas.
   

    // Implementação simplificada (alíquota efetiva e parcela a deduzir) para INSS,
    // que é a forma como o IRRF é apresentado, mas que alguns sites usam para INSS também.
    for (const range of INSS_TABLE_2025) {
        if (grossSalary <= range.limit) {
            // o calculo do INSS é mais complexo, o que é apresentado é apenas simulação
            let previousLimit = 0;
            if(INSS_TABLE_2025.indexOf(range) > 0) {
                previousLimit = INSS_TABLE_2025[INSS_TABLE_2025.indexOf(range) - 1].limit
            }
            inss = (grossSalary - previousLimit) * range.percent;
            for (let i = 0; i < INSS_TABLE_2025.indexOf(range); i++){
                inss += (INSS_TABLE_2025[i].limit - (i === 0 ? 0 : INSS_TABLE_2025[i-1].limit)) * INSS_TABLE_2025[i].percent;
            }
            break;
        }
    }

    //GARANTIA QUE NAO ULTRAPASSARÁ O TETO
    return Math.min(inss, INSS_MAX_CONTRIBUITION_2025);
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

    if (baseCalculoComDeducoes <= 0) return 0; // Se a base for negativa ou zero após deduções

    let irrf = 0;
    for (const range of IRRF_TABLE_2025) {
        if (baseCalculoComDeducoes <= range.limit) {
            irrf = baseCalculoComDeducoes * range.percent - range.deduction;
            break;
        }
    }
    return Math.max(0, irrf); // Garante que o IRRF não seja negativo
}

/**
 * Calcula o 13º Salário Anual (valor bruto para estimativa de benefício).
 * @param {number} annualGrossSalaryClt - Salário bruto anual de referência.
 * @param {number} timeInCompanyYearsClt - Estimativa de tempo na empresa em anos (para proporcionalidade, se usada).
 * @returns {number} Valor do 13º Salário (bruto).
 */
export function calculateThirteenthSalary(annualGrossSalaryClt, timeInCompanyYearsClt) {
    // Simplificado para 1 salário anual de referência. INSS e IRRF incidem na prática.
    // Para estimativa de benefício anual, o valor bruto é usado como base.
    return annualGrossSalaryClt;
}

/**
 * Calcula as Férias + 1/3 Anual (valor bruto para estimativa de benefício).
 * @param {number} annualGrossSalaryClt - Salário bruto anual de referência.
 * @param {number} timeInCompanyYearsClt - Estimativa de tempo na empresa em anos (para proporcionalidade, se usada).
 * @returns {number} Valor das Férias + 1/3 (bruto).
 */
export function calculateVacation(annualGrossSalaryClt, timeInCompanyYearsClt) {
    // Simplificado para (Salário Anual + 1/3). Impostos incidem na prática.
    return annualGrossSalaryClt * (4 / 3);
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
    const salaryClt = financialInputs.salaryClt || 0; // Salário Bruto Mensal
    const vrClt = financialInputs.vrClt || 0; // Vale Refeição/Alimentação Mensal
    const healthPlanClt = financialInputs.healthPlanClt || 0; // Plano de Saúde CLT (parte paga pelo funcionário)
    const annualGrossSalaryClt = financialInputs.annualGrossSalaryClt || 0; // Salário Bruto Anual de referência
    const bonusClt = financialInputs.bonusClt || 0; // Outros Bônus/Premiações Anuais
    const timeInCompanyYearsClt = financialInputs.timeInCompanyYearsClt || 1; // Tempo na Empresa em Anos

    // --- Cálculos Mensais ---
    const inssMonthly = calculateInss(salaryClt);
    const baseIrrfMonthly = salaryClt - inssMonthly; // Base de cálculo IRRF
    const irrfMonthly = calculateIrrf(baseIrrfMonthly); // Assumindo 0 dependentes por enquanto

    // Salário Líquido Mensal Estimado CLT
    // Salário Bruto - INSS - IRRF - Plano de Saúde (parte do funcionário) + VR/VA (se for benefício líquido)
    const netMonthlyClt = salaryClt - inssMonthly - irrfMonthly - healthPlanClt + vrClt;

    // --- Cálculos Anuais ---
    const inssAnnual = inssMonthly * 12;
    const irrfAnnual = irrfMonthly * 12;
    const fgtsMonthly = calculateFgtsMonthly(salaryClt);
    const fgtsAnnual = fgtsMonthly * 12; // FGTS anual pago pela empresa

    const thirteenthSalary = calculateThirteenthSalary(annualGrossSalaryClt, timeInCompanyYearsClt);
    const vacation = calculateVacation(annualGrossSalaryClt, timeInCompanyYearsClt);
    const rescissionFine = calculateRescissionFine(fgtsMonthly, timeInCompanyYearsClt); // FGTS mensal * 12 meses/ano * anos * 0.40

    // Total Líquido Anual Estimado CLT
    // Salário Líquido Mensal * 12 meses + 13º + Férias + Bônus/Premiações
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
        rescissionFine: rescissionFine, // Multa rescisória do FGTS (anual)
        vrVa: vrClt, // VR/VA mensal
        healthPlanCltOut: healthPlanClt, // Valor que o funcionário paga do plano
        bonusClt: bonusClt, // Bônus anual
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
    const salaryPj = financialInputs.salaryPj || 0; // Salário Bruto PJ (mensal)
    const accountantCostPj = financialInputs.accountantCostPj || 0; // Custo de contador mensal
    const taxesPjPercent = (financialInputs.taxesPjPercent || 0) / 100; // Porcentagem de impostos PJ (converter para decimal)
    const healthPlanPj = financialInputs.healthPlanPj || 0; // Plano de saúde PJ (mensal)
    const bonusPj = financialInputs.bonusPj || 0; // Bônus anual PJ

    // Cálculos PJ Mensais
    const taxesPjMonthly = salaryPj * taxesPjPercent; // Imposto PJ sobre o pró-labore/faturamento mensal
    const netMonthlyPj = salaryPj - taxesPjMonthly - accountantCostPj - healthPlanPj;

    // Cálculos PJ Anuais
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
