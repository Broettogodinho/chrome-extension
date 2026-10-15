import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { classifyField, buildValues, normalize } = require('../chrome-extension/utils/formMapper.js');
const c = (text, extra = {}) => classifyField({ text, ...extra });

test('normaliza acentos e camelCase', () => {
    assert.equal(normalize('Endereço_Residencial'), 'endereco residencial');
    assert.equal(normalize('firstName'), 'first name');
});

test('reconhece campos comuns em PT e EN', () => {
    const casos = {
        'Nome completo': 'fullName', 'Full name': 'fullName', 'Primeiro nome': 'firstName', 'firstName': 'firstName',
        'Sobrenome': 'lastName', 'last_name': 'lastName', 'E-mail': 'email', 'Celular / WhatsApp': 'phone',
        'Telefone': 'phone', 'Cidade': 'city', 'Estado (UF)': 'state', 'Perfil do LinkedIn': 'linkedin',
        'GitHub': 'portfolio', 'Carta de apresentação': 'coverLetter', 'Empresa atual': 'currentCompany',
        'Cargo atual': 'currentTitle', 'Instituição de ensino': 'institution', 'Endereço': 'address'
    };
    for (const [texto, esperado] of Object.entries(casos)) assert.equal(c(texto), esperado, texto);
});

test('evita falsos positivos', () => {
    for (const texto of ['Nome da empresa', 'Nome de usuário', 'Nome da mãe', 'Estado civil', 'Nome de uma referência', 'Qualquer coisa']) {
        assert.equal(c(texto), null, texto);
    }
    assert.equal(c('Senha', { type: 'password' }), null);
    assert.equal(c('Currículo', { type: 'file' }), null);
});

test('autocomplete e tipo têm prioridade sobre o texto', () => {
    assert.equal(c('campo1', { autocomplete: 'given-name' }), 'firstName');
    assert.equal(c('campo2', { type: 'email' }), 'email');
    assert.equal(c('Site', { type: 'url' }), 'portfolio');
});

test('buildValues separa nome, escolhe experiência atual e personaliza a carta', () => {
    const v = buildValues({
        personal: { fullName: 'Bruno Silva Godinho', email: 'b@x.com' },
        experience: [{ cargo: 'Estagiário', empresa: 'A', dataFim: '2022-01' }, { cargo: 'Analista', empresa: 'B', dataFim: 'Atual' }],
        education: [{ curso: 'Estatística', instituicao: 'USP' }],
        skills: { hard: ['SQL'], soft: ['Comunicação'] },
        coverLetter: 'Vaga de {cargo} na {empresa}.'
    }, { company: 'Acme', jobTitle: 'Analista de Dados' });
    assert.equal(v.firstName, 'Bruno');
    assert.equal(v.lastName, 'Silva Godinho');
    assert.equal(v.currentCompany, 'B');
    assert.equal(v.skills, 'SQL, Comunicação');
    assert.equal(v.coverLetter, 'Vaga de Analista de Dados na Acme.');
    assert.equal(buildValues({ coverLetter: '{empresa}' }).coverLetter, 'sua empresa');
});
