/**
 * Brazil CLT Paycheck Module
 * Dynamic formula-based paycheck calculation system
 */

// --- State Management ---
const DEFAULT_CLT_CONFIG = {
    // IRRF (Imposto de Renda Retido na Fonte) brackets for 2024
    irrfBrackets: [
        { min: 0, max: 1903.98, rate: 0, deduction: 0 },
        { min: 1903.99, max: 2826.65, rate: 0.075, deduction: 142.80 },
        { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 354.80 },
        { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 636.13 },
        { min: 4664.69, max: Infinity, rate: 0.275, deduction: 869.36 }
    ],
    
    // INSS (Instituto Nacional do Seguro Social) contribution table for 2024
    inssTable: [
        { min: 0, max: 1412.00, rate: 0.075 },
        { min: 1412.01, max: 2666.68, rate: 0.09 },
        { min: 2666.69, max: 4000.03, rate: 0.12 },
        { min: 4000.04, max: 7786.02, rate: 0.14 }
    ],
    
    // FGTS (Fundo de Garantia do Tempo de Serviço)
    fgtsRate: 0.08,
    
    // Default deductions
    deductions: {
        valeTransporte: { enabled: true, rate: 0.06, maxAmount: 0 },
        valeRefeicao: { enabled: true, amount: 0 },
        valeAlimentacao: { enabled: true, amount: 0 },
        planoDeSaude: { enabled: false, amount: 0 },
        dependents: { count: 0, deductionPerDependent: 189.59 }
    },
    
    // Formulas for calculations
    formulas: {
        // Base formulas
        baseSalary: "input.baseSalary",
        
        // INSS calculation
        inssBase: "Math.min(input.baseSalary, 7786.02)",
        inssValue: `
            let base = Math.min(input.baseSalary, 7786.02);
            let total = 0;
            for (let bracket of config.inssTable) {
                if (base > bracket.min) {
                    let taxable = Math.min(base, bracket.max) - bracket.min;
                    total += taxable * bracket.rate;
                }
                if (base <= bracket.max) break;
            }
            return total;
        `,
        
        // IRRF calculation
        irrfBase: "input.baseSalary - result.inssValue - (config.deductions.dependents.count * config.deductions.dependents.deductionPerDependent)",
        irrfValue: `
            let base = result.irrfBase;
            let tax = 0;
            for (let bracket of config.irrfBrackets) {
                if (base > bracket.min) {
                    let taxable = Math.min(base, bracket.max) - bracket.min;
                    tax += taxable * bracket.rate;
                }
                if (base <= bracket.max) break;
            }
            // Apply deduction
            for (let bracket of config.irrfBrackets) {
                if (base >= bracket.min && base <= bracket.max) {
                    tax -= bracket.deduction;
                    break;
                }
            }
            return Math.max(tax, 0);
        `,
        
        // FGTS calculation
        fgtsValue: "input.baseSalary * config.fgtsRate",
        
        // Deductions
        valeTransporteValue: "config.deductions.valeTransporte.enabled ? Math.min(input.baseSalary * config.deductions.valeTransporte.rate, config.deductions.valeTransporte.maxAmount || Infinity) : 0",
        valeRefeicaoValue: "config.deductions.valeRefeicao.enabled ? config.deductions.valeRefeicao.amount : 0",
        valeAlimentacaoValue: "config.deductions.valeAlimentacao.enabled ? config.deductions.valeAlimentacao.amount : 0",
        planoDeSaudeValue: "config.deductions.planoDeSaude.enabled ? config.deductions.planoDeSaude.amount : 0",
        dependentsDeduction: "config.deductions.dependents.count * config.deductions.dependents.deductionPerDependent",
        
        // Totals
        totalDeductions: "result.inssValue + result.irrfValue + result.valeTransporteValue + result.valeRefeicaoValue + result.valeAlimentacaoValue + result.planoDeSaudeValue",
        netSalary: "input.baseSalary - result.totalDeductions",
        totalCostToCompany: "input.baseSalary + result.fgtsValue"
    }
};

let cltState = {
    config: JSON.parse(localStorage.getItem('tatu_clt_config')) || DEFAULT_CLT_CONFIG,
    templates: JSON.parse(localStorage.getItem('tatu_clt_templates')) || {},
    calculations: JSON.parse(localStorage.getItem('tatu_clt_calculations')) || [],
    currentInput: {
        baseSalary: 3000,
        employeeName: "",
        referenceMonth: new Date().toISOString().slice(0, 7)
    }
};

// Save to LocalStorage
function saveCLTState() {
    localStorage.setItem('tatu_clt_config', JSON.stringify(cltState.config));
    localStorage.setItem('tatu_clt_templates', JSON.stringify(cltState.templates));
    localStorage.setItem('tatu_clt_calculations', JSON.stringify(cltState.calculations));
}

// --- Formula Evaluation Engine ---
function evaluateFormula(formulaName, input, config, results) {
    const formula = config.formulas[formulaName];
    if (!formula) return 0;
    
    try {
        // If formula is a simple expression
        if (typeof formula === 'string' && !formula.includes('\n')) {
            // Create a safe evaluation context
            const context = {
                input: input,
                config: config,
                result: results,
                Math: Math
            };
            
            // Replace variable references
            let expr = formula
                .replace(/input\.(\w+)/g, (match, p1) => `input["${p1}"]`)
                .replace(/config\.(\w+(?:\.\w+)*)/g, (match, p1) => {
                    const parts = p1.split('.');
                    let value = config;
                    for (const part of parts) {
                        value = value[part];
                        if (value === undefined) break;
                    }
                    return value !== undefined ? value : 0;
                })
                .replace(/result\.(\w+)/g, (match, p1) => `result["${p1}"]`);
            
            // Evaluate the expression
            const func = new Function('input', 'config', 'result', 'Math', `return ${expr};`);
            return func(input, config, results, Math);
        }
        
        // If formula is a multi-line function
        if (typeof formula === 'string' && formula.includes('\n')) {
            const func = new Function('input', 'config', 'result', 'Math', formula);
            return func(input, config, results, Math);
        }
        
        // If formula is already a function
        if (typeof formula === 'function') {
            return formula(input, config, results);
        }
        
        return 0;
    } catch (error) {
        console.error(`Error evaluating formula ${formulaName}:`, error);
        return 0;
    }
}

// --- Calculation Engine ---
function calculatePaycheck(input = cltState.currentInput) {
    const config = cltState.config;
    const results = {};
    
    // Define calculation order
    const calculationOrder = [
        'baseSalary',
        'inssBase',
        'inssValue',
        'dependentsDeduction',
        'irrfBase',
        'irrfValue',
        'fgtsValue',
        'valeTransporteValue',
        'valeRefeicaoValue',
        'valeAlimentacaoValue',
        'planoDeSaudeValue',
        'totalDeductions',
        'netSalary',
        'totalCostToCompany'
    ];
    
    // Calculate in order
    calculationOrder.forEach(formulaName => {
        results[formulaName] = evaluateFormula(formulaName, input, config, results);
    });
    
    // Round all monetary values to 2 decimal places
    Object.keys(results).forEach(key => {
        if (typeof results[key] === 'number') {
            results[key] = Math.round(results[key] * 100) / 100;
        }
    });
    
    // Save calculation to history
    const calculation = {
        id: '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        input: { ...input },
        results: { ...results },
        configVersion: JSON.stringify(config)
    };
    
    cltState.calculations.unshift(calculation);
    if (cltState.calculations.length > 100) {
        cltState.calculations = cltState.calculations.slice(0, 100);
    }
    
    saveCLTState();
    return results;
}

// --- Template Management ---
function saveTemplate(name, input, config = cltState.config) {
    const template = {
        id: '_' + Math.random().toString(36).substr(2, 9),
        name: name,
        timestamp: new Date().toISOString(),
        input: { ...input },
        config: { ...config }
    };
    
    cltState.templates[template.id] = template;
    saveCLTState();
    return template;
}

function loadTemplate(templateId) {
    const template = cltState.templates[templateId];
    if (template) {
        cltState.currentInput = { ...template.input };
        return template;
    }
    return null;
}

function deleteTemplate(templateId) {
    if (cltState.templates[templateId]) {
        delete cltState.templates[templateId];
        saveCLTState();
        return true;
    }
    return false;
}

// --- Configuration Management ---
function updateIRRFBrackets(brackets) {
    cltState.config.irrfBrackets = brackets;
    saveCLTState();
}

function updateINSSTable(table) {
    cltState.config.inssTable = table;
    saveCLTState();
}

function updateFGTSRate(rate) {
    cltState.config.fgtsRate = rate;
    saveCLTState();
}

function updateDeductions(deductions) {
    cltState.config.deductions = { ...cltState.config.deductions, ...deductions };
    saveCLTState();
}

function updateFormula(formulaName, formula) {
    cltState.config.formulas[formulaName] = formula;
    saveCLTState();
}

// --- Export/Import ---
function exportConfiguration() {
    return JSON.stringify(cltState.config, null, 2);
}

function importConfiguration(jsonString) {
    try {
        const config = JSON.parse(jsonString);
        cltState.config = config;
        saveCLTState();
        return true;
    } catch (error) {
        console.error('Error importing configuration:', error);
        return false;
    }
}

function exportTemplate(templateId) {
    const template = cltState.templates[templateId];
    return template ? JSON.stringify(template, null, 2) : null;
}

function importTemplate(jsonString) {
    try {
        const template = JSON.parse(jsonString);
        template.id = '_' + Math.random().toString(36).substr(2, 9);
        template.timestamp = new Date().toISOString();
        cltState.templates[template.id] = template;
        saveCLTState();
        return template.id;
    } catch (error) {
        console.error('Error importing template:', error);
        return null;
    }
}

// --- Utility Functions ---
function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatMonthYear(monthYearString) {
    const [year, month] = monthYearString.split('-');
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });
}

// --- Validation Functions ---
function validateIRRFBrackets(brackets) {
    if (!Array.isArray(brackets) || brackets.length === 0) {
        return { valid: false, error: 'IRRF brackets must be a non-empty array' };
    }
    
    for (let i = 0; i < brackets.length; i++) {
        const bracket = brackets[i];
        if (typeof bracket.min !== 'number' || typeof bracket.max !== 'number' || typeof bracket.rate !== 'number' || typeof bracket.deduction !== 'number') {
            return { valid: false, error: `Bracket ${i + 1} has invalid data types` };
        }
        if (bracket.min < 0 || bracket.max < 0 || bracket.rate < 0 || bracket.rate > 1 || bracket.deduction < 0) {
            return { valid: false, error: `Bracket ${i + 1} has invalid values` };
        }
        if (i > 0 && bracket.min !== brackets[i - 1].max) {
            return { valid: false, error: `Bracket ${i + 1} min (${bracket.min}) should equal previous bracket max (${brackets[i - 1].max})` };
        }
    }
    
    return { valid: true };
}

function validateINSSTable(table) {
    if (!Array.isArray(table) || table.length === 0) {
        return { valid: false, error: 'INSS table must be a non-empty array' };
    }
    
    for (let i = 0; i < table.length; i++) {
        const bracket = table[i];
        if (typeof bracket.min !== 'number' || typeof bracket.max !== 'number' || typeof bracket.rate !== 'number') {
            return { valid: false, error: `INSS bracket ${i + 1} has invalid data types` };
        }
        if (bracket.min < 0 || bracket.max < 0 || bracket.rate < 0 || bracket.rate > 1) {
            return { valid: false, error: `INSS bracket ${i + 1} has invalid values` };
        }
        if (i > 0 && bracket.min !== table[i - 1].max) {
            return { valid: false, error: `INSS bracket ${i + 1} min (${bracket.min}) should equal previous bracket max (${table[i - 1].max})` };
        }
    }
    
    return { valid: true };
}

// --- Initialization ---
function initCLTModule() {
    // Ensure localStorage has CLT data
    if (!localStorage.getItem('tatu_clt_config')) {
        saveCLTState();
    }
    
    // Set default current input
    if (!cltState.currentInput.referenceMonth) {
        cltState.currentInput.referenceMonth = new Date().toISOString().slice(0, 7);
    }
}

// Initialize on load
initCLTModule();

// Export for use in main application
window.CLTModule = {
    // State
    state: cltState,
    
    // Core functions
    calculatePaycheck,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    
    // Configuration management
    updateIRRFBrackets,
    updateINSSTable,
    updateFGTSRate,
    updateDeductions,
    updateFormula,
    
    // Export/Import
    exportConfiguration,
    importConfiguration,
    exportTemplate,
    importTemplate,
    
    // Utilities
    formatCurrency,
    formatDate,
    formatMonthYear,
    
    // Validation
    validateIRRFBrackets,
    validateINSSTable,
    
    // Save state
    saveCLTState
};