// chrome-extension/utils/formMapper.js

/**
 * @file Identifica campos de formulários de candidatura e os preenche com o currículo.
 *
 * É injetado como script clássico (chrome.scripting.executeScript) junto com
 * content.js e expõe `globalThis.JobAssistantFormMapper`. A parte de
 * reconhecimento (classifyField) é pura e também pode ser importada no Node
 * para testes via `module.exports`.
 */
(function (root) {
    'use strict';

    /** Remove acentos, caixa e pontuação para comparar textos de rótulos. */
    function normalize(text) {
        return String(text || '')
            .replace(/([a-z])([A-Z])/g, '$1 $2') // firstName -> first Name
            .normalize('NFD')
            .replace(/\p{M}/gu, '') // remove acentos
            .toLowerCase()
            .replace(/[_\-[\]().:*]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** Mapeamento direto do atributo HTML `autocomplete` (sinal mais confiável). */
    const AUTOCOMPLETE_MAP = {
        name: 'fullName',
        'given-name': 'firstName',
        'family-name': 'lastName',
        email: 'email',
        tel: 'phone',
        'tel-national': 'phone',
        'street-address': 'address',
        'address-line1': 'address',
        'address-level2': 'city',
        'address-level1': 'state',
        url: 'portfolio',
        organization: 'currentCompany',
        'organization-title': 'currentTitle'
    };

    /**
     * Regras por palavras-chave, em ordem de prioridade (a primeira que casar vence).
     * `exclude` evita falsos positivos (ex.: "nome da empresa" não é o nome do candidato).
     */
    const RULES = [
        { key: 'linkedin', include: [/linked ?in/] },
        { key: 'portfolio', include: [/portfolio|portifolio|github|site pessoal|website|personal site|behance/] },
        { key: 'email', include: [/e ?mail/], exclude: [/confirm.*senha|password/] },
        { key: 'phone', include: [/telefone|celular|whats ?app|phone|mobile|\bfone\b|contato tel/] },
        { key: 'coverLetter', include: [/carta|cover letter|apresentacao|por que voce|why do you|sobre voce|about you|motivacao|mensagem ao recrutador/] },
        { key: 'currentCompany', include: [/empresa atual|ultima empresa|current company|current employer|empregador atual/] },
        { key: 'currentTitle', include: [/cargo atual|ultimo cargo|current (job )?title|current position|headline|titulo profissional/] },
        { key: 'skills', include: [/habilidades|competencias|skills|conhecimentos|tecnologias/] },
        { key: 'institution', include: [/instituicao|universidade|faculdade|escola|university|college|school/] },
        { key: 'course', include: [/curso|formacao|graduacao|degree|field of study|area de estudo/] },
        { key: 'firstName', include: [/primeiro nome|first ?name|given name|^nome$|^name$|\bfname\b/], exclude: [/sobrenome|last|completo|full|empresa|company|mae|pai|social/] },
        { key: 'lastName', include: [/sobrenome|last ?name|family name|surname|\blname\b/] },
        { key: 'fullName', include: [/nome completo|full ?name|seu nome|your name|\bnome\b|\bname\b/], exclude: [/empresa|company|usuario|user ?name|login|mae|pai|arquivo|file|social|referencia|reference|cartao|card/] },
        { key: 'city', include: [/cidade|city|municipio/] },
        { key: 'state', include: [/estado|\buf\b|state|province/], exclude: [/civil|marital/] },
        { key: 'address', include: [/endereco|address|logradouro|\brua\b/], exclude: [/e ?mail|ip/] }
    ];

    const SKIPPED_TYPES = new Set(['hidden', 'password', 'file', 'submit', 'button', 'reset', 'image', 'checkbox', 'radio', 'range', 'color', 'search', 'date', 'month', 'number']);

    /**
     * Decide a qual dado do currículo um campo corresponde.
     * @param {{type?:string, autocomplete?:string, text:string}} descriptor
     *   `text` = junção de name, id, placeholder, aria-label e rótulo do campo.
     * @returns {string|null} chave do dado ou null.
     */
    function classifyField(descriptor) {
        const type = String(descriptor.type || 'text').toLowerCase();
        if (SKIPPED_TYPES.has(type)) return null;
        if (type === 'email') return 'email';
        if (type === 'tel') return 'phone';

        const auto = String(descriptor.autocomplete || '').toLowerCase().split(/\s+/).pop();
        if (AUTOCOMPLETE_MAP[auto]) return AUTOCOMPLETE_MAP[auto];

        const text = normalize(descriptor.text);
        if (!text) return null;
        for (const rule of RULES) {
            if (rule.include.some((re) => re.test(text)) && !(rule.exclude || []).some((re) => re.test(text))) {
                if (type === 'url' && !['linkedin', 'portfolio'].includes(rule.key)) continue;
                return rule.key;
            }
        }
        if (type === 'url') return 'portfolio';
        return null;
    }

    /** Monta o mapa chave → valor a partir do currículo salvo. */
    function buildValues(resume, pageContext = {}) {
        const p = (resume && resume.personal) || {};
        const nameParts = String(p.fullName || '').trim().split(/\s+/).filter(Boolean);
        const experiences = (resume && resume.experience) || [];
        const current = experiences.find((e) => e.dataFim === 'Atual') || experiences[0] || {};
        const education = ((resume && resume.education) || [])[0] || {};
        const skills = (resume && resume.skills) || {};

        const company = pageContext.company || 'sua empresa';
        const jobTitle = pageContext.jobTitle || 'esta vaga';
        const coverLetter = String((resume && resume.coverLetter) || '')
            .replace(/\{empresa\}/gi, company)
            .replace(/\{cargo\}/gi, jobTitle);

        return {
            fullName: p.fullName || '',
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' '),
            email: p.email || '',
            phone: p.phone || '',
            address: p.address || '',
            city: p.city || '',
            state: p.state || '',
            linkedin: p.linkedin || '',
            portfolio: p.portfolio || '',
            coverLetter,
            currentCompany: current.empresa || '',
            currentTitle: current.cargo || '',
            skills: [...(skills.hard || []), ...(skills.soft || [])].join(', '),
            institution: education.instituicao || '',
            course: education.curso || ''
        };
    }

    // -----------------------------------------------------------------------
    // Parte de DOM (só roda no navegador)
    // -----------------------------------------------------------------------

    function labelTextFor(el, doc) {
        const parts = [];
        if (el.labels) for (const label of el.labels) parts.push(label.textContent);
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
            for (const id of labelledBy.split(/\s+/)) {
                const ref = doc.getElementById(id);
                if (ref) parts.push(ref.textContent);
            }
        }
        if (!parts.length) {
            // Rótulo "solto" logo antes do campo, comum em formulários sem <label for>.
            const container = el.closest('div, li, td, p, fieldset');
            const candidate = container && container.querySelector('label, legend, span, p');
            if (candidate && !candidate.contains(el) && candidate.textContent.length < 80) parts.push(candidate.textContent);
        }
        return parts.join(' ');
    }

    function describe(el, doc) {
        return {
            type: el.tagName === 'TEXTAREA' ? 'textarea' : el.tagName === 'SELECT' ? 'select' : el.type,
            autocomplete: el.getAttribute('autocomplete'),
            text: [el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.getAttribute('data-testid'), labelTextFor(el, doc)]
                .filter(Boolean).join(' ')
        };
    }

    function isFillable(el) {
        if (el.disabled || el.readOnly) return false;
        const style = el.ownerDocument.defaultView.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    /** Define o valor de forma que frameworks (React/Vue/Angular) percebam a mudança. */
    function setNativeValue(el, value) {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value); else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    function selectOption(select, value) {
        const target = normalize(value);
        const option = [...select.options].find((o) => normalize(o.value) === target || normalize(o.textContent) === target)
            || [...select.options].find((o) => target.length > 2 && normalize(o.textContent).includes(target));
        if (!option) return false;
        setNativeValue(select, option.value);
        return true;
    }

    /** Tenta descobrir empresa e cargo da página para personalizar a carta. */
    function readPageContext(doc) {
        const meta = (name) => doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content?.trim();
        const heading = doc.querySelector('h1')?.textContent?.trim();
        return {
            company: meta('og:site_name') || '',
            jobTitle: heading && heading.length < 100 ? heading : ''
        };
    }

    const LABELS = {
        fullName: 'nome', firstName: 'nome', lastName: 'sobrenome', email: 'e-mail', phone: 'telefone',
        address: 'endereço', city: 'cidade', state: 'UF', linkedin: 'LinkedIn', portfolio: 'portfólio',
        coverLetter: 'carta', currentCompany: 'empresa atual', currentTitle: 'cargo atual',
        skills: 'habilidades', institution: 'instituição', course: 'curso'
    };

    /**
     * Preenche os campos reconhecidos do documento. Não sobrescreve campos já preenchidos.
     * @returns {{filled:number, total:number, fields:string[]}}
     */
    function fillForm(doc, resume) {
        const values = buildValues(resume, readPageContext(doc));
        const elements = [...doc.querySelectorAll('input, textarea, select')].filter(isFillable);
        const filledKeys = [];

        let classified = elements.map((el) => [el, classifyField(describe(el, doc))]);
        // "Nome" sozinho, sem campo de sobrenome no formulário, é o nome completo.
        if (!classified.some(([, key]) => key === 'lastName')) {
            classified = classified.map(([el, key]) => [el, key === 'firstName' ? 'fullName' : key]);
        }

        for (const [el, key] of classified) {
            const value = key && values[key];
            if (!value) continue;

            if (el.tagName === 'SELECT') {
                if (el.selectedIndex > 0) continue;
                if (selectOption(el, value)) filledKeys.push(key);
                continue;
            }
            if (el.value && el.value.trim()) continue; // respeita o que o usuário já digitou
            setNativeValue(el, value);
            el.classList.add('job-assistant-filled');
            filledKeys.push(key);
        }

        return {
            filled: filledKeys.length,
            total: elements.length,
            fields: [...new Set(filledKeys.map((k) => LABELS[k] || k))]
        };
    }

    const api = { normalize, classifyField, buildValues, fillForm };
    root.JobAssistantFormMapper = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
