# Architectural Update Document: Brazil CLT Paycheck Module

## Overview
This document outlines the architectural changes required to add a Brazil CLT Paycheck Module to the finance application. The module requires new UI components, backend services, data models, and configuration management systems.

## Target Repository Analysis
Based on the project name "finance app" and the existing directory structure, the `finance_app` directory is the correct target repository for implementing these changes.

## Required File Changes

### 1. Frontend Components (`finance_app/src/`)
- **New Directory**: `finance_app/src/modules/clt-paycheck/`
  - `CLTPaycheckMenu.vue` - Main menu component with sub-menu structure
  - `PaycheckCalculator.vue` - Interactive calculator with real-time updates
  - `TaxConfiguration.vue` - Editable tax bracket interface
  - `ContributionSettings.vue` - INSS/FGTS configuration
  - `CalculationHistory.vue` - Audit trail and scenario management
  - `ImportExport.vue` - CSV/Excel import/export functionality
  - `ReportGenerator.vue` - PDF/Excel export with company branding

- **Modified Files**:
  - `finance_app/src/App.vue` - Add CLT Paycheck to main navigation
  - `finance_app/src/router/index.js` - Add new routes for CLT module
  - `finance_app/src/store/index.js` - Add CLT-specific Vuex modules

### 2. Backend Services (`finance_app/api/`)
- **New Directory**: `finance_app/api/clt/`
  - `controllers/`
    - `PaycheckController.js` - Calculation engine and scenario management
    - `TaxConfigController.js` - CRUD for tax configurations
    - `ImportExportController.js` - Data import/export handlers
  - `models/`
    - `CLTConfiguration.js` - JSON-based formula storage with versioning
    - `PaycheckCalculation.js` - Calculation audit trail with timestamps
    - `TaxTable.js` - Effective-dated tax rates and brackets
  - `routes/cltRoutes.js` - API endpoints for CLT operations
  - `services/`
    - `CalculationService.js` - Dynamic formula evaluation engine
    - `ValidationService.js` - Input validation and business rules
    - `BackupService.js` - Configuration backup/restore functionality

- **Modified Files**:
  - `finance_app/api/server.js` - Register new CLT routes
  - `finance_app/api/middleware/auth.js` - Add role-based permissions for CLT

### 3. Database Schema (`finance_app/db/`)
- **New Migration Files**:
  - `migrations/YYYYMMDD_create_clt_tables.js` - Create CLT-specific tables
  - `migrations/YYYYMMDD_add_clt_permissions.js` - Add RBAC permissions

- **Schema Changes**:
  - `clt_configurations` - JSON-based formula storage with version control
  - `paycheck_calculations` - Audit trail with user and timestamp
  - `tax_tables` - Effective-dated tax rates and brackets
  - `user_scenarios` - Saved calculation scenarios

### 4. Configuration Management (`finance_app/config/`)
- **New Files**:
  - `clt-defaults.json` - Default CLT parameters and formulas
  - `import-mappings.json` - Column mappings for CSV/Excel imports
  - `permission-matrix.json` - Role-based access control for CLT features

### 5. Integration Layer (`finance_app/integrations/`)
- **New Directory**: `finance_app/integrations/clt/`
  - `GovernmentAPIClient.js` - Optional integration with tax table APIs
  - `HRSystemAdapter.js` - Integration with HR management systems
  - `AccountingExport.js` - Export to accounting software formats

### 6. Testing (`finance_app/tests/`)
- **New Test Files**:
  - `unit/clt/` - Unit tests for calculation engine and services
  - `integration/clt/` - Integration tests for API endpoints
  - `e2e/clt/` - End-to-end tests for user workflows

## Key Architectural Decisions

1. **Formula Storage**: JSON-based storage to avoid hardcoded logic and enable dynamic updates
2. **Separation of Concerns**: Clear separation between configuration data and calculation data
3. **Audit Trail**: Comprehensive logging of all calculations and configuration changes
4. **Role-Based Access**: Granular permissions for different user types (HR, Finance, Employee, Admin)
5. **Import/Export**: Support for multiple formats with validation and mapping capabilities

## Dependencies
- No external dependencies required for core calculations
- Optional integrations can be added as plugins
- PDF generation library for report exports
- CSV/Excel parsing library for imports

TARGET_REPO: finance_app