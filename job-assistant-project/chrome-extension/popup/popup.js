// chrome-extension/popup/popup.js

import { saveUserResume, loadUserResume } from '../utils/storageManager.js';
import { compareCltPj } from '../utils/financialCalculator.js';
import { autofillActiveTab } from '../utils/autofill.js';

let blockCounter = 0;

const $ = (id) => document.getElementById(id);
const formatCurrency = (value) =>
    Number.isFinite(value)
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
        : '—';

const FINANCE_FIELDS = [
    'salaryClt', 'vrClt', 'healthPlanClt', 'bonusClt', 'timeInCompanyYearsClt', 'dependents',
    'salaryPj', 'accountantCostPj', 'taxesPjPercent', 'healthPlanPj', 'bonusPj'
];
const FINANCE_DEFAULTS = { timeInCompanyYearsClt: 1, taxesPjPercent: 6 };
const PERSONAL_FIELDS = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'linkedin', 'portfolio'];

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

let statusTimer;
function showStatus(message, type = 'success') {
    const box = $('statusMessage');
    box.textContent = message;
    box.className = `status ${type}`;
    box.hidden = false;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { box.hidden = true; }, type === 'error' ? 6000 : 3500);
}

// ---------------------------------------------------------------------------
// Abas
// ---------------------------------------------------------------------------

function showTab(contentId) {
    document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    $(`tab${contentId.replace('Content', '')}`)?.classList.add('active');
    $(contentId)?.classList.add('active');
}

// ---------------------------------------------------------------------------
// Blocos dinâmicos (experiência / formação) — montados via DOM, sem innerHTML
// com dados do usuário, para não permitir injeção de HTML.
// ---------------------------------------------------------------------------

function field(labelText, input) {
    const id = `${input.className}-${blockCounter}`;
    input.id = id;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = labelText;
    return [label, input];
}

function makeInput(type, className, value = '', required = false) {
    const el = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') el.type = type;
    else el.rows = 3;
    el.className = className;
    el.value = value;
    el.required = required;
    return el;
}

function makeBlock(cssClass, title, rows, endKey, onRemove) {
    blockCounter++;
    const div = document.createElement('div');
    div.className = `dynamic-item ${cssClass}`;

    const header = document.createElement('div');
    header.className = 'item-header';
    const h3 = document.createElement('h3');
    h3.textContent = title;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-btn';
    remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover ${title.toLowerCase()}`);
    remove.addEventListener('click', () => { div.remove(); onRemove?.(); });
    header.append(h3, remove);
    div.append(header);

    for (const [label, input] of rows) div.append(...field(label, input));

    if (endKey) {
        const { checkboxLabel, isCurrent } = endKey;
        const wrap = document.createElement('label');
        wrap.className = 'checkbox';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'current-checkbox';
        box.checked = isCurrent;
        wrap.append(box, ` ${checkboxLabel}`);
        const endInput = div.querySelector('.end-date');
        endInput.disabled = isCurrent;
        box.addEventListener('change', () => {
            endInput.disabled = box.checked;
            if (box.checked) endInput.value = '';
        });
        endInput.after(wrap);
    }
    return div;
}

function createExperienceBlock(exp = {}) {
    const isCurrent = exp.dataFim === 'Atual';
    return makeBlock('experience-item', 'Experiência', [
        ['Cargo', makeInput('text', 'job-title', exp.cargo || '', true)],
        ['Empresa', makeInput('text', 'company', exp.empresa || '', true)],
        ['Início', makeInput('month', 'start-date', exp.dataInicio || '')],
        ['Fim', makeInput('month', 'end-date', isCurrent ? '' : exp.dataFim || '')],
        ['Descrição das atividades', makeInput('textarea', 'description', exp.descricao || '')]
    ], { checkboxLabel: 'Emprego atual', isCurrent });
}

function createEducationBlock(edu = {}) {
    const isCurrent = edu.dataFim === 'Cursando';
    const degree = document.createElement('select');
    degree.className = 'degree';
    for (const option of ['', 'Ensino Médio', 'Técnico', 'Tecnólogo', 'Graduação', 'Pós-graduação / MBA', 'Mestrado', 'Doutorado', 'Curso livre']) {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option || 'Selecione…';
        degree.append(opt);
    }
    degree.value = edu.grau || '';
    return makeBlock('education-item', 'Formação', [
        ['Curso', makeInput('text', 'course', edu.curso || '', true)],
        ['Instituição', makeInput('text', 'institution', edu.instituicao || '', true)],
        ['Nível', degree],
        ['Início', makeInput('month', 'start-date', edu.dataInicio || '')],
        ['Conclusão', makeInput('month', 'end-date', isCurrent ? '' : edu.dataFim || '')]
    ], { checkboxLabel: 'Cursando', isCurrent });
}

// ---------------------------------------------------------------------------
// Habilidades e carta
// ---------------------------------------------------------------------------

const parseList = (text) => [...new Set(text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean))];

function renderSkillChips() {
    const preview = $('skillsPreview');
    preview.replaceChildren();
    for (const [kind, id] of [['hard', 'hardSkills'], ['soft', 'softSkills']]) {
        for (const skill of parseList($(id).value)) {
            const chip = document.createElement('span');
            chip.className = `chip ${kind}`;
            chip.textContent = skill;
            preview.append(chip);
        }
    }
}

const updateCoverLetterCount = () => { $('coverLetterCount').textContent = $('coverLetter').value.length; };
const updateAnnualSalary = () => {
    $('annualGrossSalaryClt').value = ((parseFloat($('salaryClt').value) || 0) * 12).toFixed(2);
};

// ---------------------------------------------------------------------------
// Carregar / salvar
// ---------------------------------------------------------------------------

async function loadAllData() {
    const resume = await loadUserResume();

    for (const key of PERSONAL_FIELDS) $(key).value = resume.personal[key] || '';

    blockCounter = 0;
    const experiences = resume.experience.length ? resume.experience : [{}];
    $('experiencesContainer').replaceChildren(...experiences.map(createExperienceBlock));
    const education = resume.education.length ? resume.education : [{}];
    $('educationContainer').replaceChildren(...education.map(createEducationBlock));

    $('hardSkills').value = resume.skills.hard.join(', ');
    $('softSkills').value = resume.skills.soft.join(', ');
    renderSkillChips();

    $('coverLetter').value = resume.coverLetter;
    updateCoverLetterCount();

    const fin = resume.financial;
    for (const key of FINANCE_FIELDS) $(key).value = fin[key] ?? FINANCE_DEFAULTS[key] ?? 0;
    updateAnnualSalary();
    if (fin.salaryClt || fin.salaryPj) displayComparison(compareCltPj(fin));
}

function collectBlocks(selector, mapper) {
    return [...document.querySelectorAll(selector)].map(mapper).filter(Boolean);
}

/** Valida o currículo e devolve uma lista de erros (vazia = válido). */
function validateResume(personal, blocksInvalid) {
    const errors = [];
    if (!personal.fullName) errors.push('Informe seu nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email)) errors.push('Informe um e-mail válido.');
    if (personal.phone && personal.phone.replace(/\D/g, '').length < 10) errors.push('Telefone deve ter DDD + número.');
    for (const key of ['linkedin', 'portfolio']) {
        if (personal[key] && !/^https?:\/\/\S+\.\S+/.test(personal[key])) errors.push(`O link de ${key === 'linkedin' ? 'LinkedIn' : 'portfólio'} deve começar com http(s)://`);
    }
    if (blocksInvalid) errors.push('Preencha os campos obrigatórios (cargo/empresa, curso/instituição) ou remova o bloco vazio.');
    return errors;
}

async function saveResume() {
    const personal = Object.fromEntries(PERSONAL_FIELDS.map((k) => [k, $(k).value.trim()]));
    personal.state = personal.state.toUpperCase();
    let blocksInvalid = false;

    const experience = collectBlocks('.experience-item', (item) => {
        const cargo = item.querySelector('.job-title').value.trim();
        const empresa = item.querySelector('.company').value.trim();
        const dataInicio = item.querySelector('.start-date').value;
        const descricao = item.querySelector('.description').value.trim();
        if (!cargo && !empresa && !dataInicio && !descricao) return null; // bloco vazio é ignorado
        if (!cargo || !empresa) { blocksInvalid = true; return null; }
        const atual = item.querySelector('.current-checkbox').checked;
        return { cargo, empresa, dataInicio, dataFim: atual ? 'Atual' : item.querySelector('.end-date').value, descricao };
    });

    const education = collectBlocks('.education-item', (item) => {
        const curso = item.querySelector('.course').value.trim();
        const instituicao = item.querySelector('.institution').value.trim();
        const grau = item.querySelector('.degree').value;
        if (!curso && !instituicao && !grau) return null;
        if (!curso || !instituicao) { blocksInvalid = true; return null; }
        const cursando = item.querySelector('.current-checkbox').checked;
        return {
            curso, instituicao, grau,
            dataInicio: item.querySelector('.start-date').value,
            dataFim: cursando ? 'Cursando' : item.querySelector('.end-date').value
        };
    });

    const errors = validateResume(personal, blocksInvalid);
    if (errors.length) {
        showStatus(errors.join(' '), 'error');
        return false;
    }

    const resume = await loadUserResume();
    resume.personal = personal;
    resume.experience = experience;
    resume.education = education;
    resume.skills = { hard: parseList($('hardSkills').value), soft: parseList($('softSkills').value) };
    resume.coverLetter = $('coverLetter').value.trim();

    await saveUserResume(resume);
    showStatus('Currículo salvo.');
    return true;
}

function collectFinance() {
    return Object.fromEntries(FINANCE_FIELDS.map((key) => {
        const value = parseFloat($(key).value);
        return [key, Number.isFinite(value) && value >= 0 ? value : (FINANCE_DEFAULTS[key] ?? 0)];
    }));
}

async function calculateAndSave() {
    const inputs = collectFinance();
    if (!inputs.salaryClt && !inputs.salaryPj) {
        showStatus('Informe ao menos o salário CLT ou o faturamento PJ.', 'error');
        return;
    }
    const resume = await loadUserResume();
    resume.financial = inputs; // os resultados são sempre recalculados, não persistidos
    await saveUserResume(resume);
    displayComparison(compareCltPj(inputs));
    $('comparisonArea').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// Resultados
// ---------------------------------------------------------------------------

function fillResults(prefix, results) {
    for (const [key, value] of Object.entries(results)) {
        const el = $(`${prefix}${key[0].toUpperCase()}${key.slice(1)}`);
        if (el) el.textContent = formatCurrency(value);
    }
}

function displayComparison(cmp) {
    fillResults('result', cmp.clt);
    fillResults('result', cmp.pj);
    $('cmpClt').textContent = formatCurrency(cmp.clt.totalPackageAnnualClt);
    $('cmpPj').textContent = formatCurrency(cmp.pj.netAnnualPj);
    $('cmpDiff').textContent = `${formatCurrency(cmp.difference)} (${cmp.percent.toLocaleString('pt-BR')}%)`;
    $('cmpBreakEven').textContent = `${formatCurrency(cmp.breakEvenPjRevenue)}/mês`;

    const verdict = $('comparisonVerdict');
    const amount = formatCurrency(Math.abs(cmp.difference));
    verdict.className = `verdict-text ${cmp.winner.toLowerCase()}`;
    verdict.textContent = cmp.winner === 'empate'
        ? 'As propostas empatam financeiramente.'
        : `${cmp.winner} rende ${amount} a mais por ano.`;

    $('comparisonArea').hidden = false;
    $('cltResultsArea').hidden = !cmp.clt.grossSalaryClt;
    $('pjResultsArea').hidden = !cmp.pj.grossSalaryPj;
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    $('tabresume').addEventListener('click', () => showTab('resumeContent'));
    $('tabfinance').addEventListener('click', () => showTab('financeContent'));

    $('addExperienceBtn').addEventListener('click', () => {
        $('experiencesContainer').append(createExperienceBlock());
    });
    $('addEducationBtn').addEventListener('click', () => {
        $('educationContainer').append(createEducationBlock());
    });
    $('hardSkills').addEventListener('input', renderSkillChips);
    $('softSkills').addEventListener('input', renderSkillChips);
    $('coverLetter').addEventListener('input', updateCoverLetterCount);
    $('salaryClt').addEventListener('input', updateAnnualSalary);

    $('resumeForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        try { await saveResume(); } catch (e) { showStatus(e.message, 'error'); }
    });

    $('financeForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        try { await calculateAndSave(); } catch (e) { showStatus(e.message, 'error'); }
    });

    $('autofillBtn').addEventListener('click', async () => {
        const button = $('autofillBtn');
        button.disabled = true;
        try {
            const result = await autofillActiveTab();
            showStatus(result.filled
                ? `${result.filled} campo(s) preenchido(s): ${result.fields.join(', ')}.`
                : 'Nenhum campo reconhecido nesta página.', result.filled ? 'success' : 'warning');
        } catch (e) {
            showStatus(e.message, 'error');
        } finally {
            button.disabled = false;
        }
    });

    loadAllData().catch((e) => showStatus(`Não foi possível carregar os dados: ${e.message}`, 'error'));
});
