/**
 * Brazil CLT Paycheck Module - UI Implementation
 * Complete user interface for CLT paycheck calculations
 */

// --- DOM Elements ---
const viewCLT = document.getElementById('view-clt');
const navCLT = document.getElementById('nav-clt');
const navCLTConfig = document.getElementById('nav-clt-config');
const navCLTCalc = document.getElementById('nav-clt-calc');
const navCLTFormulas = document.getElementById('nav-clt-formulas');
const navCLTReports = document.getElementById('nav-clt-reports');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');

// --- State Management ---
let currentCLTView = 'calculator'; // 'calculator', 'configuration', 'formulas', 'reports'
let currentFormulaId = null;
let currentTemplateId = null;

// --- UI Initialization ---
function initCLTUI() {
    // Create CLT view container
    viewCLT.innerHTML = `
        <div class="clt-container">
            <!-- CLT Navigation Tabs -->
            <div class="clt-tabs glass-panel">
                <button class="clt-tab active" data-view="calculator">
                    <i class="ph ph-calculator"></i>
                    Calculator
                </button>
                <button class="clt-tab" data-view="configuration">
                    <i class="ph ph-gear"></i>
                    Configuration
                </button>
                <button class="clt-tab" data-view="formulas">
                    <i class="ph ph-function"></i>
                    Formulas
                </button>
                <button class="clt-tab" data-view="reports">
                    <i class="ph ph-file-text"></i>
                    Reports
                </button>
            </div>

            <!-- Calculator View -->
            <div id="clt-calculator-view" class="clt-view active">
                <div class="calculator-container">
                    <!-- Input Section -->
                    <div class="input-section glass-panel">
                        <h3><i class="ph ph-user"></i> Employee Information</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="employee-name">Employee Name</label>
                                <input type="text" id="employee-name" placeholder="Enter employee name">
                            </div>
                            <div class="form-group">
                                <label for="reference-month">Reference Month</label>
                                <input type="month" id="reference-month">
                            </div>
                        </div>
                        
                        <h3><i class="ph ph-currency-circle-dollar"></i> Salary & Benefits</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="base-salary">Base Salary (R$)</label>
                                <input type="text" id="base-salary" inputmode="numeric" value="3.000,00">
                            </div>
                            <div class="form-group">
                                <label for="dependents-count">Dependents</label>
                                <input type="number" id="dependents-count" min="0" value="0">
                            </div>
                        </div>
                        
                        <h3><i class="ph ph-receipt"></i> Benefits & Deductions</h3>
                        <div class="benefits-grid">
                            <div class="benefit-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="vale-transporte" checked>
                                    <span>Vale Transporte</span>
                                </label>
                                <input type="text" id="vale-transporte-rate" inputmode="numeric" value="6%" disabled>
                            </div>
                            <div class="benefit-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="vale-refeicao" checked>
                                    <span>Vale Refeição</span>
                                </label>
                                <input type="text" id="vale-refeicao-amount" inputmode="numeric" value="0,00" disabled>
                            </div>
                            <div class="benefit-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="vale-alimentacao" checked>
                                    <span>Vale Alimentação</span>
                                </label>
                                <input type="text" id="vale-alimentacao-amount" inputmode="numeric" value="0,00" disabled>
                            </div>
                            <div class="benefit-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="plano-saude">
                                    <span>Plano de Saúde</span>
                                </label>
                                <input type="text" id="plano-saude-amount" inputmode="numeric" value="0,00" disabled>
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button id="btn-calculate" class="btn btn-primary">
                                <i class="ph ph-calculator"></i>
                                Calculate Paycheck
                            </button>
                            <button id="btn-save-template" class="btn btn-secondary">
                                <i class="ph ph-floppy-disk"></i>
                                Save as Template
                            </button>
                            <button id="btn-clear" class="btn btn-outline">
                                <i class="ph ph-eraser"></i>
                                Clear
                            </button>
                        </div>
                    </div>

                    <!-- Results Section -->
                    <div class="results-section glass-panel">
                        <h3><i class="ph ph-chart-line-up"></i> Calculation Results</h3>
                        <div class="results-grid">
                            <div class="result-item">
                                <span class="result-label">Gross Salary</span>
                                <span id="result-gross-salary" class="result-value">R$ 0,00</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">INSS Contribution</span>
                                <span id="result-inss" class="result-value negative">R$ 0,00</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">IRRF Tax</span>
                                <span id="result-irrf" class="result-value negative">R$ 0,00</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">FGTS Deposit</span>
                                <span id="result-fgts" class="result-value positive">R$ 0,00</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">Vale Transporte</span>
                                <span id="result-vale-transporte" class="result-value negative">R$ 0,00</span>
                            </div>
                            <div class="result-item">
                                <span class="result-label">Total Deductions</span>
                                <span id="result-total-deductions" class="result-value negative">R$ 0,00</span>
                            </div>
                            <div class="result-item highlight">
                                <span class="result-label">Net Salary</span>
                                <span id="result-net-salary" class="result-value positive">R$ 0,00</span>
                            </div>
                            <div class="result-item highlight">
                                <span class="result-label">Total Cost to Company</span>
                                <span id="result-total-cost" class="result-value">R$ 0,00</span>
                            </div>
                        </div>
                        
                        <div class="results-breakdown">
                            <h4>Detailed Breakdown</h4>
                            <div id="detailed-breakdown">
                                <!-- Detailed breakdown will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Configuration View -->
            <div id="clt-configuration-view" class="clt-view">
                <div class="configuration-container">
                    <!-- IRRF Configuration -->
                    <div class="config-section glass-panel">
                        <div class="config-header">
                            <h3><i class="ph ph-money"></i> IRRF (Income Tax) Brackets</h3>
                            <button class="btn btn-small" id="btn-add-irrf-bracket">
                                <i class="ph ph-plus"></i> Add Bracket
                            </button>
                        </div>
                        <div class="config-table-container">
                            <table class="config-table">
                                <thead>
                                    <tr>
                                        <th>Min Value (R$)</th>
                                        <th>Max Value (R$)</th>
                                        <th>Tax Rate (%)</th>
                                        <th>Deduction (R$)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="irrf-brackets-table">
                                    <!-- IRRF brackets will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- INSS Configuration -->
                    <div class="config-section glass-panel">
                        <div class="config-header">
                            <h3><i class="ph ph-shield-check"></i> INSS Contribution Table</h3>
                            <button class="btn btn-small" id="btn-add-inss-bracket">
                                <i class="ph ph-plus"></i> Add Bracket
                            </button>
                        </div>
                        <div class="config-table-container">
                            <table class="config-table">
                                <thead>
                                    <tr>
                                        <th>Min Value (R$)</th>
                                        <th>Max Value (R$)</th>
                                        <th>Contribution Rate (%)</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="inss-table">
                                    <!-- INSS brackets will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- FGTS Configuration -->
                    <div class="config-section glass-panel">
                        <h3><i class="ph ph-bank"></i> FGTS Rate</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="fgts-rate">FGTS Rate (%)</label>
                                <input type="text" id="fgts-rate" inputmode="numeric" value="8%">
                            </div>
                            <button id="btn-save-fgts" class="btn btn-primary">
                                <i class="ph ph-floppy-disk"></i>
                                Save FGTS Rate
                            </button>
                        </div>
                    </div>

                    <!-- Deductions Configuration -->
                    <div class="config-section glass-panel">
                        <h3><i class="ph ph-receipt"></i> Default Deductions</h3>
                        <div class="deductions-grid">
                            <div class="deduction-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="config-vale-transporte" checked>
                                    <span>Vale Transporte</span>
                                </label>
                                <div class="deduction-inputs">
                                    <input type="text" id="config-vt-rate" inputmode="numeric" value="6%">
                                    <span>of salary</span>
                                </div>
                            </div>
                            <div class="deduction-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="config-vale-refeicao" checked>
                                    <span>Vale Refeição</span>
                                </label>
                                <input type="text" id="config-vr-amount" inputmode="numeric" value="0,00">
                            </div>
                            <div class="deduction-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="config-vale-alimentacao" checked>
                                    <span>Vale Alimentação</span>
                                </label>
                                <input type="text" id="config-va-amount" inputmode="numeric" value="0,00">
                            </div>
                            <div class="deduction-item">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="config-plano-saude">
                                    <span>Plano de Saúde</span>
                                </label>
                                <input type="text" id="config-ps-amount" inputmode="numeric" value="0,00">
                            </div>
                            <div class="deduction-item">
                                <label for="config-dependents-deduction">Dependent Deduction</label>
                                <input type="text" id="config-dependents-deduction" inputmode="numeric" value="189,59">
                            </div>
                        </div>
                        <button id="btn-save-deductions" class="btn btn-primary">
                            <i class="ph ph-floppy-disk"></i>
                            Save Deductions
                        </button>
                    </div>
                </div>
            </div>

            <!-- Formulas View -->
            <div id="clt-formulas-view" class="clt-view">
                <div class="formulas-container">
                    <div class="formulas-list glass-panel">
                        <div class="formulas-header">
                            <h3><i class="ph ph-function"></i> Formula Definitions</h3>
                            <button class="btn btn-small" id="btn-add-formula">
                                <i class="ph ph-plus"></i> Add Formula
                            </button>
                        </div>
                        <div class="formulas-table-container">
                            <table class="formulas-table">
                                <thead>
                                    <tr>
                                        <th>Formula Name</th>
                                        <th>Description</th>
                                        <th>Type</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="formulas-list">
                                    <!-- Formulas will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="formula-editor glass-panel">
                        <h3><i class="ph ph-code"></i> Formula Editor</h3>
                        <div class="form-group">
                            <label for="formula-name">Formula Name</label>
                            <input type="text" id="formula-name" placeholder="e.g., netSalary">
                        </div>
                        <div class="form-group">
                            <label for="formula-description">Description</label>
                            <input type="text" id="formula-description" placeholder="e.g., Calculates net salary after all deductions">
                        </div>
                        <div class="form-group">
                            <label for="formula-type">Formula Type</label>
                            <select id="formula-type">
                                <option value="simple">Simple Expression</option>
                                <option value="complex">Complex Function</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="formula-expression">Formula Expression</label>
                            <textarea id="formula-expression" rows="6" placeholder="Enter formula expression..."></textarea>
                        </div>
                        <div class="formula-variables">
                            <h4>Available Variables</h4>
                            <div class="variables-grid">
                                <div class="variable-item">
                                    <code>input.baseSalary</code>
                                    <span>Base salary input</span>
                                </div>
                                <div class="variable-item">
                                    <code>config.irrfBrackets</code>
                                    <span>IRRF tax brackets</span>
                                </div>
                                <div class="variable-item">
                                    <code>config.inssTable</code>
                                    <span>INSS contribution table</span>
                                </div>
                                <div class="variable-item">
                                    <code>result.inssValue</code>
                                    <span>Calculated INSS value</span>
                                </div>
                                <div class="variable-item">
                                    <code>Math.min()</code>
                                    <span>Math functions available</span>
                                </div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button id="btn-save-formula" class="btn btn-primary">
                                <i class="ph ph-floppy-disk"></i>
                                Save Formula
                            </button>
                            <button id="btn-test-formula" class="btn btn-secondary">
                                <i class="ph ph-play"></i>
                                Test Formula
                            </button>
                            <button id="btn-reset-formula" class="btn btn-outline">
                                <i class="ph ph-eraser"></i>
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Reports View -->
            <div id="clt-reports-view" class="clt-view">
                <div class="reports-container">
                    <!-- Calculation History -->
                    <div class="reports-section glass-panel">
                        <div class="reports-header">
                            <h3><i class="ph ph-clock-counter-clockwise"></i> Calculation History</h3>
                            <div class="report-filters">
                                <input type="month" id="report-month-filter">
                                <button class="btn btn-small" id="btn-export-history">
                                    <i class="ph ph-export"></i>
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div class="reports-table-container">
                            <table class="reports-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Employee</th>
                                        <th>Base Salary</th>
                                        <th>Net Salary</th>
                                        <th>Total Cost</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="calculation-history">
                                    <!-- Calculation history will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Templates Management -->
                    <div class="reports-section glass-panel">
                        <div class="reports-header">
                            <h3><i class="ph ph-bookmark"></i> Saved Templates</h3>
                            <button class="btn btn-small" id="btn-import-template">
                                <i class="ph ph-import"></i>
                                Import Template
                            </button>
                        </div>
                        <div class="templates-grid