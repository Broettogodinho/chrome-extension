import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateInss, calculateIrrf, calculateThirteenthSalary, calculateVacationBonus,
    calculateCltResults, calculatePjResults, compareCltPj, pjRevenueToMatch
} from '../chrome-extension/utils/financialCalculator.js';

test('INSS 2026 é progressivo e respeita o teto', () => {
    assert.equal(calculateInss(0), 0);
    assert.equal(calculateInss(1621), 121.58);
    assert.equal(calculateInss(6000), 641.51);
    assert.equal(calculateInss(8475.55), 988.09);
    assert.equal(calculateInss(20000), 988.09);
});

test('IRRF: isento até R$ 5.000 pelo redutor da Lei 15.270/2025', () => {
    for (const s of [2000, 3500, 5000]) assert.equal(calculateIrrf(s, calculateInss(s)), 0, `salário ${s}`);
});

test('IRRF: faixa de transição bate com o exemplo publicado (R$ 6.000)', () => {
    // Exemplo do material de referência usa INSS de 649,58; resultado 382,88 (±1 centavo de arredondamento).
    assert.ok(Math.abs(calculateIrrf(6000, 649.58) - 382.88) <= 0.01);
});

test('IRRF: acima de R$ 7.350 não há redutor', () => {
    const inss = calculateInss(10000);
    assert.equal(calculateIrrf(10000, inss), Math.round(((10000 - inss) * 0.275 - 908.73) * 100) / 100);
});

test('IRRF: dependentes reduzem o imposto', () => {
    const inss = calculateInss(10000);
    assert.ok(calculateIrrf(10000, inss, 2) < calculateIrrf(10000, inss, 0));
});

test('13º e férias usam o salário MENSAL (regressão do bug anterior)', () => {
    assert.equal(calculateThirteenthSalary(10000, 1), 10000);
    assert.equal(calculateThirteenthSalary(10000, 0.5), 5000);
    assert.equal(calculateVacationBonus(9000, 1), 3000);
    assert.equal(calculateVacationBonus(9000, 0.5), 0);
});

test('CLT: líquido anual soma 12 salários + 13º + 1/3 férias + bônus', () => {
    const r = calculateCltResults({ salaryClt: 10000, vrClt: 800, healthPlanClt: 100, bonusClt: 1000 });
    const expected = r.netMonthlyClt * 12 + r.thirteenthSalary + r.vacation + 1000;
    assert.ok(Math.abs(r.netAnnualClt - expected) < 0.01);
    assert.ok(r.thirteenthSalary < 10000 && r.thirteenthSalary > 7000);
    assert.equal(r.fgtsMonthly, 800);
    assert.ok(Math.abs(r.totalPackageAnnualClt - (r.netAnnualClt + r.fgtsAnnual)) < 0.01);
});

test('PJ: impostos e custos fixos', () => {
    const r = calculatePjResults({ salaryPj: 10000, taxesPjPercent: 6, accountantCostPj: 300, healthPlanPj: 500 });
    assert.equal(r.taxesPjMonthly, 600);
    assert.equal(r.netMonthlyPj, 8600);
    assert.equal(r.netAnnualPj, 103200);
});

test('Comparativo e faturamento de empate são consistentes', () => {
    const inputs = { salaryClt: 10000, salaryPj: 14000, taxesPjPercent: 6, accountantCostPj: 300 };
    const cmp = compareCltPj(inputs);
    assert.equal(cmp.winner, 'PJ');
    const atBreakEven = calculatePjResults({ ...inputs, salaryPj: cmp.breakEvenPjRevenue });
    assert.ok(Math.abs(atBreakEven.netAnnualPj - cmp.clt.totalPackageAnnualClt) < 1);
    assert.equal(pjRevenueToMatch(1000, { taxesPjPercent: 100 }), Infinity);
});

test('Entradas inválidas viram zero', () => {
    const r = calculateCltResults({ salaryClt: -5, vrClt: 'abc' });
    assert.equal(r.netAnnualClt, 0);
});
