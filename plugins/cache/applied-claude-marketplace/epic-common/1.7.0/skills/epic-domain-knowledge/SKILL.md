---
name: epic-domain-knowledge
description: Foundational Epic domain and security knowledge used for API business-rule and access research
---

# Epic Domain Knowledge for API Research

This skill provides foundational domain knowledge about the Epic application that is essential context when researching API business rules and security requirements from the Chimera-Client codebase.

---

## Chimera-Client Overview

Chimera-Client is the TypeScript/React UI codebase for an insurance agency management application named "Epic". Epic is used by insurance agencies to manage their entire business workflow: client relationships, insurance policies, accounting, claims, certificates of insurance, and more.

The codebase lives under `src/published/ASI.TAM/` and is organized into:

- **Screens/** — UI screens organized by program area (each with a `ScreenLogic.tsx` file)
- **Foundation/** — Shared enums, constants, exceptions, DTOs, security definitions, and interfaces
- **Business/** — Business logic classes (e.g., `Business/UI/Policy/`, `Business/UI/Account/`)
- **Data/** — Data model classes (e.g., `Data/UI/Policy/`, `Data/UI/Account/`)
- **UI/Foundation/** — UI-level shared utilities including the centralized `SecurityAccess` class
- **Menus/** — Menu definitions by program area
- **DataAccess/** — Data access proxy classes for fetching/saving data (e.g., `DataAccess/UI/Policy/Action/Proxy/Detail`)

### ScreenLogic Files

Each screen's logic lives in a `ScreenLogic.tsx` file containing a class that extends `BaseScreenLogic`. For example:

- `src/published/ASI.TAM/Screens/Accounts/Policy/Add/ScreenLogic.tsx` — the "Policy Add" workflow
- `src/published/ASI.TAM/Screens/Accounts/Policy/Marketing/MasterMarketingSubmissionDetail/ScreenLogic.tsx` — the Master Marketing Submission Detail screen

ScreenLogic classes:

- Extend `BaseScreenLogic`
- Declare a static `myScreenID` property with their screen code (e.g., `static myScreenID = 'MKMMSDET'`)
- Contain field initialization, event handlers, validation logic, security checks, and navigation to child screens
- May call business logic in the `Business/` layer and load/save data via the `Data/` layer
- Use UI controls prefixed with `Meta` (e.g., `MetaComboBox`, `MetaStringEdit`, `MetaDateEdit`, `MetaIntegerEdit`, `MetaVirtualListView`)
- Use `CComboBox`, `CTextField`, `CDateField`, `CIntegerField` as React rendering components for the meta controls

### Finding a ScreenLogic File from a Screen Code

Each screen has a short alphanumeric screen code (e.g., `AAFORMEN`), often displayed with a `CHM-` prefix (e.g., `CHM-AAFORMEN`). To locate the corresponding `ScreenLogic.tsx`:

1. **Look up the screen code in `src/core/builtins/core/screenIDMap.ts`.** This file maps dot-delimited namespace paths to screen codes. Example:
   ```
   'ASI.TAM.Screens.Accounts.Policy.AgricultureAP.FormEndorsement': 'AAFORMEN'
   ```
2. **Convert the namespace to a file path.** Strip the `ASI.TAM.Screens.` prefix, replace dots with path separators, and append `/ScreenLogic.tsx`:
   ```
   src/published/ASI.TAM/Screens/Accounts/Policy/AgricultureAP/FormEndorsement/ScreenLogic.tsx
   ```
3. **Alternatively, search for `myScreenID`.** Each ScreenLogic file declares its screen code:
   ```
   grep -r "myScreenID = 'AAFORMEN'" src/published/
   ```

### ScreenLogic Lifecycle and Patterns

ScreenLogic classes follow these key patterns:

- **Initialization:** Fields are declared as class properties with `Meta*` types. The screen registers event handlers in its constructor or `init` method.
- **Data loading:** Data is fetched via `DataAccess/` proxy classes (e.g., `PolicyActionDetailProxy.FetchAllStructureForPolicy()`), which return `DataTable[]` results consumed via `ReadWrapper`.
- **Saving:** Save operations validate fields, call business logic, and persist via proxy classes.
- **Navigation:** Child screens are opened by importing and instantiating their ScreenLogic/Component classes. Screens reference each other through import paths.
- **Concurrency:** Screens use `FoundationConcurrency` for record-level locking. The `Constants.ProgramArea` class defines concurrency lock area codes (e.g., `'AJ'` for Marketing Submission, `'Q'` for Policy, `'AE'` for Certificate). When a screen opens a record for editing, it acquires a lock using the program area code, and releases it when the screen closes. This prevents multiple users from editing the same record simultaneously.
- **Screen arguments:** Screens receive typed arguments via `ScreenArguments` classes that pass data between parent and child screens (e.g., account ID, policy ID, client type).
- **Menus:** Menu items are defined in `Menus/{ProgramArea}/MenuDef.ts` and can trigger navigation or actions. Screens reference `MenuDef` for toolbar and context menu definitions.

---

## Programs and Screen Hierarchy

Epic is organized into major **programs**, each containing related screens and sub-programs. The screen directory tree under `src/published/ASI.TAM/Screens/` reflects this hierarchy.

### Major Programs

| Program               | Directory                | Description                                                                                                                                           |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Accounts**          | `Screens/Accounts/`      | Multiple different types of accounts: Client, Broker, Company, Employee, FinanceCompany, OtherInterest, Vendor, Lead                                  |
| **General Ledger**    | `Screens/GeneralLedger/` | Accounting: receipts, disbursements, journal entries, reconciliations, bank management, vouchers, budgets, imports/exports                            |
| **Setup / Configure** | `Screens/Setup/`         | System configuration: security, structure, policies, accounting, activities, attachments, workflows, user options                                     |
| **Procedures**        | `Screens/Procedures/`    | Batch operations: month-end, interface processing, document management, job management, accounting procedures, workflow management                    |
| **Reports**           | `Screens/Reports/`       | Reporting by group: account, activity, claim, general ledger, policy, transaction, interface, management, applications, opportunity, client contracts |
| **Utilities**         | `Screens/Utilities/`     | System utilities: diagnostics, rebuilds, reassignment tools, archive/purge                                                                            |
| **Common**            | `Screens/Common/`        | Shared screens used across programs: activity lookup, attachment handling, criteria selection, contact management, deductibles, distribution, email   |
| **Account Locate**    | `Screens/AccountLocate/` | Account search/locate functionality                                                                                                                   |

### Accounts Sub-Programs

The Accounts program is the largest and contains these sub-areas:

| Sub-Area            | Description                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Client**          | Client account management (add, detail, structure)                                                              |
| **Policy**          | Policy management — the largest sub-area (see Policy section below)                                             |
| **Contact**         | Contact management (individual, business, shared detail, import/export)                                         |
| **Transaction**     | Financial transactions (add, apply credits, finance, discount, generate statements)                             |
| **Attachment**      | Document attachment management (view, detail, move, distribute, policy checking)                                |
| **Activity**        | Activity/task tracking                                                                                          |
| **Commission**      | Commission agreement management (add, detail, criteria, copy)                                                   |
| **Claim**           | Claims management (add, detail, loss notices — auto, liability, property, workers comp)                         |
| **Opportunity**     | Sales opportunity tracking                                                                                      |
| **LossNotice**      | Loss notice forms by type: Auto, Liability, PropertyLoss, WorkComp, and Canadian variants                       |
| **Proof**           | Proofs of insurance: Binders, Certificates, Evidence                                                            |
| **ClientContracts** | Client service contracts                                                                                        |
| **Shared**          | Shared account-level screens (contracts, commission agreements, sales targets, tax rates, agency defined codes) |

### Policy Sub-Area (Insurance Lines of Business)

The Policy sub-area under Accounts contains screens for many insurance lines of business. Each line type has its own set of screens for managing that specific coverage type:

| Line of Business            | Directory                         | Description                                                            |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| **AgricultureAP**           | `Policy/AgricultureAP/`           | Agriculture Application-Package policies                               |
| **AgricultureLiability**    | `Policy/AgricultureLiability/`    | Agriculture liability coverage                                         |
| **AgriculturePersProperty** | `Policy/AgriculturePersProperty/` | Agriculture personal property                                          |
| **AgricultureProperty**     | `Policy/AgricultureProperty/`     | Agriculture property coverage                                          |
| **BoilerMachinery**         | `Policy/BoilerMachinery/`         | Boiler and machinery coverage                                          |
| **BuildersRisk**            | `Policy/BuildersRisk/`            | Builders risk coverage                                                 |
| **BusinessAuto**            | `Policy/BusinessAuto/`            | Commercial auto coverage (vehicles, drivers, state-specific coverages) |
| **BusinessOwners**          | `Policy/BusinessOwners/`          | Business owners policies (premises, coverages)                         |
| **CAN/**                    | `Policy/CAN/`                     | Canadian-specific: Auto, Farm, Habitational                            |
| **CommercialAP**            | `Policy/CommercialAP/`            | Commercial application-package                                         |
| **Crime**                   | `Policy/Crime/`                   | Crime/fidelity coverage                                                |
| **EDP**                     | `Policy/EDP/`                     | Electronic data processing coverage                                    |
| **Flood**                   | `Policy/Flood/`                   | Flood insurance                                                        |
| **GarageDealers**           | `Policy/GarageDealers/`           | Garage dealers coverage (state-specific physical damage)               |
| **GeneralLiability**        | `Policy/GeneralLiability/`        | General liability coverage                                             |
| **Homeowners**              | `Policy/Homeowners/`              | Homeowners insurance                                                   |
| **InlandMarine**            | `Policy/InlandMarine/`            | Inland marine coverage                                                 |
| **PersonalAuto**            | `Policy/PersonalAuto/`            | Personal auto insurance (state-specific)                               |
| **PersonalUmbrella**        | `Policy/PersonalUmbrella/`        | Personal umbrella/excess liability                                     |
| **ProfessionalLiability**   | `Policy/ProfessionalLiability/`   | Professional liability/E&O                                             |
| **Property**                | `Policy/Property/`                | Commercial property coverage                                           |
| **Surety**                  | `Policy/Surety/`                  | Surety bonds                                                           |
| **Truckers**                | `Policy/Truckers/`                | Truckers coverage (motor carrier, state-specific)                      |
| **UK/**                     | `Policy/UK/`                      | UK-specific lines of business                                          |
| **Umbrella**                | `Policy/Umbrella/`                | Commercial umbrella coverage                                           |
| **WorkersComp**             | `Policy/WorkersComp/`             | Workers compensation                                                   |
| **Marketing/**              | `Policy/Marketing/`               | Marketing submissions and carrier submissions                          |

### Policy Actions and Workflows

Policy screens also include workflow actions at `Policy/Action/`:

- Add Policy, Cancel, Endorse (existing line, add line midterm), Renew, Reinstate
- Issue/Not-Issue (applications, changes, cancellations)
- Submit (applications, change requests, cancellations, to carriers)
- Review (applications, change requests)
- Copy Policy, Import/Export Risks, Agent/Broker of Record Change
- Process Suspended Policies, Issue Auto ID Cards, Issue Liability Certificates, Select Prefill

---

## Business Logic Layer

The `Business/UI/` directory contains business logic classes organized by domain area. These classes are called by ScreenLogic files and contain core business rules, validations, and operations that are independent of the UI.

### Business Logic Organization

| Domain            | Directory                       | Key Classes                                                                                                                                                                                    |
| ----------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Account**       | `Business/UI/Account/`          | `Common.ts`, `Client.ts`, `Broker.ts`, `Company.ts`, `Employee.ts`, `Vendor.ts`, `FinCo.ts`, `Lead.ts`, `OtherInterest.ts`                                                                     |
| **Policy**        | `Business/UI/Policy/`           | Sub-dirs: `Action/`, `Cancellation/`, `CustomForm/`, `Marketing/`, `PolicyInformation/`, `ServiceBilling/`, `RenewalManager/`, `Underwriting/`                                                 |
| **Transaction**   | `Business/UI/Trans/`            | `Add.ts`, `View.ts`, `Detail.ts`, `Reverse.ts`, `BalanceTransfer.ts`, `ApplyCreditDebit.ts`, `Finance.ts`, `Discount.ts`, `GenerateTaxesFees.ts`, `GenerateInvoice.ts`, `GenerateStatement.ts` |
| **Claim**         | `Business/UI/Claim/`            | `Add.ts`, `View.ts`, `Detail.ts`, `Anonymization.ts`                                                                                                                                           |
| **Contact**       | `Business/UI/Contact/`          | `Actions.ts`, `Detail.ts`, `View.ts`, `MainContactInfo.ts`, `AddressLookup.ts`, `ImportExportContact/`                                                                                         |
| **Certificate**   | `Business/UI/Certificate/`      | `Detail/` (base class + per-line-type implementations), `View/`, `Action/`                                                                                                                     |
| **Commission**    | `Business/UI/Commission/`       | `View.ts`, `Detail.ts`                                                                                                                                                                         |
| **Activity**      | `Business/UI/Activity/`         | `Detail.ts`, `View.ts`, `OnDemand.ts`                                                                                                                                                          |
| **Structure**     | `Business/UI/Structure/`        | `Access.ts` — Central authorization/structure access checking framework                                                                                                                        |
| **Line**          | `Business/UI/Line/`             | 30+ line-type-specific business logic classes (e.g., `BusinessAuto/`, `GeneralLiability/`, `WorkersComp/`)                                                                                     |
| **GeneralLedger** | `Business/UI/GeneralLedger/`    | `Reconciliation/`, `ReconciliationView/`                                                                                                                                                       |
| **Setup**         | `Business/UI/Setup/`            | 80+ configuration areas                                                                                                                                                                        |
| **Attachment**    | `Business/UI/Attachment/`       | `Attachment.ts`, `Helper/`                                                                                                                                                                     |
| **Opportunity**   | `Business/UI/Opportunity/`      | Opportunity management                                                                                                                                                                         |
| **Marketing**     | `Business/UI/Policy/Marketing/` | `MasterSubmissionDetail.ts`, `View.ts`, `Common.ts`, `SubmitToCarrier.ts`, `CreateCarrierResponse.ts`, `Remarket.ts`                                                                           |

### Business Logic Patterns

- **Domain separation:** Each business area has its own directory with `Common.ts` for shared logic and operation-specific files (e.g., `Add.ts`, `Detail.ts`, `View.ts`)
- **Type-specific implementations:** Insurance line types and certificate types have per-type implementations with a shared base class (e.g., `CertificateBase.ts` with `AutomobileLiability.ts`, `GeneralLiability.ts`, etc.)
- **Validation exceptions:** Custom exceptions in `Foundation/Exceptions/` extend `ValidationException` and describe the business rule violation (e.g., `RequiredBrokerProducer`, `UnableToCancel`, `CancellationDates`)
- **Regional variants:** Some business logic has country-specific variants (USA, Canada, International), especially in `Procedures/Interface/Suspense/`

---

## Data Model Layer

The `Data/UI/` directory contains data model classes organized by domain. These represent the entities and data structures used by the UI.

### Key Data Model Areas

| Domain               | Directory                   | Key Models                                                                                                                                                                                                                                                                                               |
| -------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Account**          | `Data/UI/Account/`          | `Client/` (Policy, Policies, Certificate, Claim, Transaction, Activity, Broker, AccountStructure, EmployeeBenefit, Attachment, ServicingRole, Services, Quicklinks), `Broker/`, `Company/`, `Common/`                                                                                                    |
| **Policy Marketing** | `Data/UI/Policy/Marketing/` | `MasterMarketingSubmission`, `Line`, `CarrierSubmission`, `CarrierSubmissionDetail`, `CarrierResponse`, `CarrierLine`, `ServiceSummary`, `BrokerProducer`, `PrBrCommission`, `PrBrCommissionTerm`, `Attachment`, `Form`, `Account`, `Policy`, `APInfo`, `APLocation`, `AgencyDefinedCode`                |
| **Policy**           | `Data/UI/Policy/`           | Sub-dirs: `Action/`, `Cancellation/`, `CustomForm/`, `CoverageSnapshot/`, `Enrollment/`, `Line/`, `Marketing/`, `SharedInterfaces/`                                                                                                                                                                      |
| **Certificate**      | `Data/UI/Certificate/`      | `Detail/` (Holders, Recipients, Attachments, CertificateItem, coverage types, PropertyLocation, Template), `View/`                                                                                                                                                                                       |
| **Claim**            | `Data/UI/Claim/`            | `Detail/` (ClaimPayment, AdditionalParty, AdjustorDetail, ClaimAmountTotals, Line, LineDetail, Litigation, LitigationPerson, DefaultRiskDetail), `View/`                                                                                                                                                 |
| **Contact**          | `Data/UI/Contact/`          | `Individual/` (PersonalInformation, DriverInformation, EmployerInformation, NameInformation, AddressInformation, ClassificationItem), `Business/` (BusinessInformation, AddressInformation, NameInformation, NumberEMailWebInformation, ContactIdNumber), `Shared/`, `Definitions/`, `Actions/`, `View/` |
| **Commission**       | `Data/UI/Commission/`       | DateBasedCommissionTier, PremiumCommissionTier, RevenueCommissionTier, RiskCommissionTier                                                                                                                                                                                                                |
| **AccountLocate**    | `Data/UI/AccountLocate/`    | Per-account-type locate models: Broker, Client, Company, Employee, FinanceCompany, Lead, OtherInterest, Vendor                                                                                                                                                                                           |
| **Security**         | `Data/UI/Security/`         | `SecuredUser` — runtime representation of the logged-in user's security profile                                                                                                                                                                                                                          |
| **Setup**            | `Data/UI/Setup/`            | Faxing, FormEndorsement, Interface configuration models                                                                                                                                                                                                                                                  |

---

## Security Model

Epic implements four types of security access plus a licensing system. All must be evaluated when researching API security requirements.

### 1. Program Access

Program access controls what operations a user can perform on specific screens and domain areas. Program access values are defined in `src/published/ASI.TAM/Foundation/Security/SecureArea.ts` as a numeric enum with ~1,770 values.

**Naming convention:** `{ProgramArea}_{SubArea}_{Operation}` — for example:

- `InsuredClients_Policy_View` (value 24) — view policies for insured clients
- `ProspectiveClients_Policy_EditApplication` (value 365) — edit applications for prospective clients
- `GeneralLedger_Receipts_AddReceipts` (value 383) — add receipts in general ledger
- `Setup_Structure_Organization_View` (value 351) — view organizational structure in setup

**Major program access prefixes (categories):**

| Prefix                | Program Area                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `General_`            | Cross-cutting: contacts, activities, transactions, attachments, homebase, sticky notes, leads, personal data                                         |
| `InsuredClients_`     | Insured client-specific operations: policy, claims, binders, certificates, evidence, opportunities, services, quotes                                 |
| `ProspectiveClients_` | Prospective client operations (mirrors InsuredClients with separate values)                                                                          |
| `Brokers_`            | Broker account operations                                                                                                                            |
| `Companies_`          | Company account operations                                                                                                                           |
| `Employees_`          | Employee account operations                                                                                                                          |
| `FinanceCompanies_`   | Finance company operations                                                                                                                           |
| `OtherInterests_`     | Other interest operations                                                                                                                            |
| `Vendors_`            | Vendor operations                                                                                                                                    |
| `GeneralLedger_`      | GL operations: receipts, disbursements, journal entries, reconciliations, print checks, vouchers, budgets, imports, exports                          |
| `Setup_`              | Configuration: account, accounting, activity, attachment, policy, structure, security, workflows, interface, user options, quotes, email, SMS        |
| `Procedures_`         | Batch procedures: month-end, interface, document management, job management, accounting, workflow management, auditing, policy checking, SMS         |
| `Report_`             | Reporting by group: account, activity, claim, GL, policy, transaction, interface, management, applications, opportunity, on-demand, client contracts |
| `Utilities_`          | System utilities: diagnostic, rebuild, reassignment, archive, purge, interface                                                                       |
| `Lead_`               | Lead management                                                                                                                                      |
| `Benefits_`           | Benefits administration integration                                                                                                                  |
| `AI_`                 | AI features (email summarization)                                                                                                                    |

**Client-type-sensitive operations:** Many program access values for clients come in pairs — one for Insured Clients and one for Prospective Clients. The code typically checks both based on the current client type:

```typescript
if (clientType === Constants.ClientType.INSURED) {
  await SecurityAccess.Area(
    SecureArea.InsuredClients_Policy_EditMasterMarketingSubmission,
  );
} else {
  await SecurityAccess.Area(
    SecureArea.ProspectiveClients_Policy_EditMasterMarketingSubmission,
  );
}
```

The `SecurityAccess` class in `UI/Foundation/SecurityAccess.ts` provides convenience methods that handle this dual-check pattern:

- `CheckPolicyViewSecurity(fIsProspectiveClient)` — checks `InsuredClients_Policy_View` or `ProspectiveClients_Policy_View`
- `CheckViewAccessForAccount(sAccountType, sClientType)` — checks the appropriate view access based on account type
- `CheckContactEntitySecurity(sAccountType, sClientType)` — checks contact access per account type
- `CheckAttachmentAddSecurity(sAccountType, sClientType)` — checks attachment add access per account type
- And many more: `CheckSubmitApplicationSecurity`, `CheckEndorseExistingLinesSecurity`, `CheckRenewPolicySecurity`, `CheckCopyPolicySecurity`, etc.

**How program access is checked in code:**

- Via `SecurityAccess.Area(SecureArea.VALUE)` — the centralized utility in `src/published/ASI.TAM/UI/Foundation/SecurityAccess.ts`
- Or via `CoreSecurityAccess.Area(SecureArea.VALUE)` — a core framework utility
- If access is denied, `CommonMessages.NoRightsMessage()` is typically shown

**Key special program access values:**

- `General_General_ViewDataRegardlessOfStructure` (430) — allows viewing data without structure access checks
- `General_General_EditDataRegardlessOfStructure` (431) — allows editing data without structure access checks
- `General_General_ViewAccountRegardlessOfConfidentialClientAccess` (1466) — view confidential client data without CCA
- `General_General_AccessAccountRegardlessOfConfidentialClientAccess` (1471) — full access to confidential client data without CCA

### 2. Structure Access

Structure represents the organizational hierarchy of the company using Epic:

- **Agency** — top level (database key: `uniqagency`)
- **Branch** — child of agency (database key: `uniqbranch`)
- **Department** — child of branch (database key: `uniqdepartment`)
- **Profit Center** — child of department (database key: `uniqprofitcenter`)

A **structure combination** (also called an **organization**) is a specific Agency + Branch + Department + Profit Center tuple. Not all combinations exist — the valid combinations are stored as rows in the database. Structure combinations may also be referred to as "organizations" in the API spec; an organization object contains all four structure parts.

**Database tables:** In the Epic application UI (Chimera-Client), structure combinations are represented by the `StructureCombination` table. However, in our APIs, the `StructureCombinationExtended` table is used instead. `StructureCombinationExtended` contains a superset of the information in `StructureCombination` and maps to the same Agency, Branch, Department, and Profit Center tables. The `StructureCombinationExtendedID` column in `StructureCombinationExtended` maps to the `organization.id` or `organization` value in API specs. When researching or implementing organization-related fields, always reference `StructureCombinationExtended` (not `StructureCombination`).

**How structure access works:**

- Users are assigned to zero or more structure combinations (stored in `ISecuredUser.getAssignedStructureCombinationsAll()`)
- Domain objects can be associated with structure combinations (e.g., a policy line is linked to an agency/branch/department/profit center)
- Users can only access data associated with structure combinations they belong to
- **Admin users bypass all structure access checks** (`ISecuredUser.getIsAdmin()` returns `true`)
- If a user has no assigned structures (`getAssignedStructureCombinationsAll().length === 0`) and is not admin, they have no structure access at all

**Structure access can be checked at partial levels.** The `ISecuredUser.getStructureAccess()` method accepts 1 to 4 parameters:

- `getStructureAccess(iUniqAgency)` — agency-only check
- `getStructureAccess(iUniqAgency, iUniqBranch)` — agency + branch check
- `getStructureAccess(iUniqAgency, iUniqBranch, iUniqDepartment)` — agency + branch + department check
- `getStructureAccess(iUniqAgency, iUniqBranch, iUniqDepartment, iUniqProfitCenter)` — full structure combination check

When any component is `-1`, that indicates it is not set, and the check considers that level unset.

**Structure access is checked via `SecurityAccess.CheckStructureAccess(objectType, objectId)`.** The `objectType` parameter is one of these enum values:

| ObjectType             | Value | Description                  | Underlying Check Method                                                 |
| ---------------------- | ----- | ---------------------------- | ----------------------------------------------------------------------- |
| `NOT_SET`              | 0     | Unset                        | N/A                                                                     |
| `BINDER`               | 1     | Binder proof of insurance    | `StructureAccess.CheckStructureAccessForBinder()`                       |
| `CARRIER_SUBMISSION`   | 2     | Marketing carrier submission | `StructureAccess.CheckStructureAccessForCarrierSubmissionWithLines()`   |
| `CERTIFICATE`          | 3     | Certificate of insurance     | `StructureAccess.CheckStructureAccessForCertificate()`                  |
| `CLAIM`                | 4     | Insurance claim              | `StructureAccess.CheckStructureAccessForClaim()`                        |
| `EVIDENCE`             | 5     | Evidence of insurance        | `StructureAccess.CheckStructureAccessForEvidence()`                     |
| `MARKETING_SUBMISSION` | 6     | Marketing submission         | `StructureAccess.CheckStructureAccessForMarketingSubmissionWithLines()` |
| `POLICY`               | 7     | Insurance policy             | `StructureAccess.CheckStructureAccessForPolicy()`                       |
| `LINE`                 | 8     | Policy line of business      | `StructureAccess.CheckStructureAccessForLine()`                         |
| `TRANSACTION`          | 9     | Financial transaction        | `StructureAccess.CheckStructureAccessForTransaction()`                  |
| `BROKER`               | 10    | Broker account               | N/A (checked via `CheckStructureAccessForAccount`)                      |
| `OTHER_INTEREST`       | 11    | Other interest account       | N/A (checked via `CheckStructureAccessForAccount`)                      |
| `FINANCE_COMPANY`      | 12    | Finance company account      | N/A (checked via `CheckStructureAccessForAccount`)                      |
| `OPPORTUNITY`          | 13    | Sales opportunity            | `StructureAccess.CheckStructureAccessForOpportunity()`                  |
| `SERVICE`              | 14    | Client service contract      | `StructureAccess.CheckStructureAccessForService()`                      |
| `ATTACHMENT`           | 15    | Document attachment          | `StructureAccess.CheckStructureAccessForAttachments()` (batch only)     |

**Account-level structure access** is checked via `SecurityAccess.CheckStructureAccessForAccount(sAccountType, idAccountID)`, which delegates to account-type-specific proxy methods:

- Some account types (Broker, Company, Employee, Finance Company, Other Interest, Vendor) can be "associated to all structures" — a flag that bypasses per-structure checks
- Client accounts do not have the "associated to all" option
- Clients are associated to one or multiple combinations of agencies and branches, but not departments or profit centers. Sub-data such as policies on clients can be associated to deeper structure combinations that contain at least one agency/branch combo associated to the client.
- When non-client accounts (Broker, Company, Employee, Finance Company, Other Interest, Vendor) do not have the flag "associated to all structures" set, they must be associated to at least one full structure combination containing an agency, branch, department, and profit center.
- Lead accounts with no structure associations are treated as having access to all structures

The underlying check logic in `Business/UI/Structure/Access.ts`:

1. Fetches the structure data for the given object (via DataAccess proxy)
2. Iterates through all structure rows associated with the object
3. For each row, checks `AgencyStructureWithSecurityObject()` against the user's assigned structure combinations
4. **For non-account objects** (policies, lines, claims, marketing submissions, carrier submissions, transactions, certificates, binders, evidence, opportunities, services): The user must have access to **ALL** structures associated with the object (returns `false` on the first structure that fails). This uses `CheckAllStructureAccess()`.
5. **For account objects** (clients, brokers, companies, employees, etc.): The user needs access to only **ANY ONE** structure associated with the account (returns `true` on the first structure that passes). This uses `CheckStructureAccessForAccount()`. Additionally, non-client account types can be flagged as "associated to all structures," which bypasses the check entirely.

**Key rule:** If an object does not have a direct structure association, its parent's structure applies. For example, a vehicle on a line inherits the line's structure, which comes from the policy. The user must have structure access to all relevant structure combinations to interact with the data.

### 3. Confidential Client Access (CCA)

Confidential Client Access protects sensitive client data. When a client is marked confidential, a set of employees is assigned access. Only users with an associated employee that has CCA for that client can view or modify:

- The client record itself
- Any sub-objects of the client: policies, lines, contacts, claims, transactions, marketing submissions, certificates, binders, evidence, opportunities, services, etc.

**Key rules:**

- CCA is ONLY relevant for data under a **Client** account (Insured or Prospective). It does not apply to Brokers, Companies, Employees, etc.
- CCA cascades through the entire object tree — if a policy belongs to a confidential client, all lines, vehicles, coverages, etc. on that policy are also gated by CCA
- The program access values `General_General_ViewAccountRegardlessOfConfidentialClientAccess` and `General_General_AccessAccountRegardlessOfConfidentialClientAccess` allow bypassing CCA

### 4. Bank Account Access

Bank account access controls which General Ledger operations a user can perform on data associated with specific bank accounts. Bank accounts are defined in `src/published/ASI.TAM/Foundation/Security/BankAccountArea.ts`:

| Area                | Code | Value |
| ------------------- | ---- | ----- |
| Bank Reconciliation | `BR` | 0     |
| Disbursements       | `D`  | 1     |
| Print Checks        | `PC` | 2     |
| Receipts            | `R`  | 3     |
| Journal Entries     | `JE` | 4     |
| Status of Accounts  |      | 5     |
| Vouchers            | `V`  | 6     |
| Client Refund       | `CR` | 7     |
| GL Budget           |      | 8     |

**Key rules:**

- Bank account access is ONLY relevant for **General Ledger** program data
- A user can have access to a bank account in one area (e.g., Receipts) but not another (e.g., Disbursements)
- The security check uses `ISecuredBankAccount.getAccess(bankAccountId, areaCode)` returning `SecurityAccess.Grant` or `SecurityAccess.Deny`
- Many GL program access values have matching `BankAccountAccess` entries (e.g., `GeneralLedger_Receipts_BankAccountAccess`, `GeneralLedger_Disbursements_BankAccountAccess`)

### 5. Licensing / Feature Access

The licensing system gates features that require specific product licenses. Defined in `Foundation/Licensing/`:

| Licensed Area           | Value | License Code              |
| ----------------------- | ----- | ------------------------- |
| Faxing                  | 1     | `FAXING`                  |
| IVANS Interface         | 2     | `IVANS`                   |
| Non-IVANS Interface     | 3     | `NON_IVANS_INTERFACE`     |
| Initial Loads Interface | 4     | `INITIAL_LOADS_INTERFACE` |
| CSIO Interface          | 5     | `CSIO`                    |

Checked via `Access.Area(Enums.LicensedArea.{AREA})`, which delegates to `LicenseInfo.IsProductLicensed(licenseCode)`. Licensing is less commonly encountered during API research but may be relevant for interface/integration features.

---

## Security Hierarchy

When researching API security requirements, always trace the complete hierarchy:

1. **Program Access** — Which `SecureArea` values are required to reach the screen(s) handling this data? Include parent screen program access if navigation requires it.
2. **Structure Access** — Does the data or any ancestor object have a structure combination? If yes, structure access is required.
3. **CCA** — Is the data ultimately a child of a Client account? If the client is confidential, CCA is required.
4. **Bank Account Access** — Is this General Ledger data associated with bank accounts? If yes, bank account access for the relevant area is required.

---

## Domain Objects and Hierarchy

### Core Object Trees

```
Account (root)
├── Client (Insured or Prospective)
│   ├── Contacts (Individual, Business)
│   ├── Policies
│   │   ├── Lines (one per line of business on the policy)
│   │   │   ├── Line-specific data (vehicles, drivers, premises, coverages, etc.)
│   │   │   ├── Forms & Endorsements
│   │   │   ├── Additional Interests
│   │   │   ├── Additional Coverages
│   │   │   ├── Producer/Broker Commissions
│   │   │   └── Agency Defined Codes
│   │   ├── Marketing Submissions (Master Marketing Submissions)
│   │   │   ├── Marketing Lines
│   │   │   │   └── Agency Defined Codes
│   │   │   ├── Carrier Submissions
│   │   │   │   ├── Carrier Submission Lines
│   │   │   │   └── Carrier Responses
│   │   │   ├── Service Summary
│   │   │   ├── Broker/Producer Commissions
│   │   │   └── Attachments
│   │   ├── Policy Information (custom fields)
│   │   ├── Service Billing
│   │   │   └── Installment Schedules
│   │   └── Weighted Commissions
│   ├── Proofs of Insurance
│   │   ├── Binders
│   │   ├── Certificates (with Holders, Named Insureds)
│   │   └── Evidence (with Additional Interests)
│   ├── Claims
│   │   ├── Claim Detail (summary, payments, adjustor, litigation)
│   │   └── Loss Notices (by type: Auto, Liability, Property, Workers Comp)
│   ├── Transactions (financial)
│   │   ├── Transaction Lines
│   │   └── Installments
│   ├── Activities
│   ├── Attachments
│   ├── Opportunities
│   ├── Client Contracts / Services
│   └── Commission Agreements
├── Broker
│   ├── Contacts, Activities, Attachments, Transactions
│   └── Commission Agreements
├── Company (Insurance Carrier)
│   ├── Contacts, Activities, Attachments
│   ├── Interface Company Contracts
│   └── Commission Agreements
├── Employee
│   ├── Contacts, Activities, Attachments
│   ├── Structure Combinations (assigned organizations)
│   ├── Authorizations
│   └── Sales/Commission data
├── Finance Company
│   ├── Contacts, Activities, Attachments, Transactions
│   └── Automated Reconciliation
├── Other Interest
│   └── Contacts, Activities, Attachments, Transactions
├── Vendor
│   └── Contacts, Activities, Attachments
└── Lead
    ├── Contacts, Activities
    └── Structure assignments
```

### Account Types and Codes

All account types share common sub-objects (Contacts, Activities, Attachments) but differ in specialized data. Account types are identified by four-character codes in `Constants.AccountType`:

| Account Type             | Code                                      | Key Features                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Client (Insured)**     | `CUST` (with `ClientType.INSURED = 'I'`)  | Full policy management, claims, proofs of insurance, marketing, opportunities, services; associated to one or multiple combinations of agencies and branches; can be protected by CCA                                                                    |
| **Client (Prospective)** | `CUST` (with `ClientType.PROSPECT = 'P'`) | Same as insured but for prospects; separate program access values; can be converted to insured; associated to one or multiple combinations of agencies and branches; can be protected by CCA                                                             |
| **Broker**               | `BROK`                                    | Commission agreements, receivables, premium payables; has structure access; can be "associated to all structures"                                                                                                                                        |
| **Company**              | `COMP`                                    | Insurance carrier: commission agreements, interface contracts, company-specific codes; has structure access; can be "associated to all structures"; structure associated to this type are the full combination of agency/branch/department/profit center |
| **Employee**             | `EMPL`                                    | Personnel data, structure combination assignments, authorizations, sales targets, workload; can be "associated to all structures"; structure associated to this type are the full combination of agency/branch/department/profit center                  |
| **Finance Company**      | `FINA`                                    | Premium financing, automated reconciliation; can be "associated to all structures"; structure associated to this type are the full combination of agency/branch/department/profit center                                                                 |
| **Other Interest**       | `OINT`                                    | Generic interest holder (e.g., additional insured, mortgagee); can be "associated to all structures"; structure associated to this type are the full combination of agency/branch/department/profit center                                               |
| **Vendor**               | `VEND`                                    | Vendor/supplier management; can be "associated to all structures"; structure associated to this type are the full combination of agency/branch/department/profit center                                                                                  |
| **Lead**                 | `LEAD`                                    | Pre-prospect leads from online intake, marketing campaigns; leads with no structure associations have access to all                                                                                                                                      |

Structure hierarchy codes: `AGCY` (Agency), `BRCH` (Branch), `DEPT` (Department), `PRFT` (Profit Center), `REGN` (Region).

### Marketing Submissions

Marketing submissions represent the process of submitting insurance applications to carrier markets:

- **Master Marketing Submission** — The top-level submission object under a policy. Contains one or more lines to be marketed. Concurrency lock area: `'AJ'`.
- **Marketing Line** — A line of business within a marketing submission. Has an issuing location (state/province + country code representing the geographic jurisdiction), line type, plan option, status, premium/eligibility data, and a structure association (agency/branch/department/profit center). Marketing lines can have agency defined codes.
- **Carrier Submission** — Created from a marketing submission to send to a specific carrier. Contains carrier-specific line details, forms, and submission data. Concurrency lock area: `'AK'`.
- **Carrier Response** — The carrier's response to a submission (quote, decline, etc.)
- **Service Summary** — Summary of services and premiums in a marketing submission. Service Summary action codes: `'R'` (Replace), `'N'` (New), `'A'` (New for new line).

Marketing data model classes live in `src/published/ASI.TAM/Data/UI/Policy/Marketing/` and include: `MasterMarketingSubmission`, `Line`, `CarrierSubmission`, `CarrierSubmissionDetail`, `CarrierResponse`, `CarrierLine`, `ServiceSummary`, `BrokerProducer`, `PrBrCommission`, `PrBrCommissionTerm`, `Attachment`, `Form`, `Account`, `Policy`, `APInfo`, `APLocation`, `AgencyDefinedCode`.

Marketing business logic lives in `src/published/ASI.TAM/Business/UI/Policy/Marketing/` and includes: `MasterSubmissionDetail.ts`, `View.ts`, `Common.ts`, `SubmitToCarrier.ts`, `CreateCarrierResponse.ts`, `Remarket.ts`.

### Policy Structure

A policy consists of:

- **Policy header** — type, number, description, effective/expiration dates, status, client association
- **Lines of business** — each line represents an insurance coverage type (auto, property, liability, etc.)
- **Line-specific data** — varies by line type (e.g., vehicles for auto, premises for property, class codes for workers comp)
- **Service billing** — billing configuration for the policy
- **Weighted commissions** — commission calculation configuration

**Policy type of business codes** (from `Constants.PolicyTypeOfBusiness`):

- `CL` — Commercial
- `PL` — Personal
- `LH` — Life & Health
- `BE` — Benefits
- `BO` — Bonds
- `FS` — Financial Services
- `AG` — Agriculture
- `OT` — Other

**Policy/Line status workflow** (from `Constants.LineStatus`):

- `P` — In Process
- `S` — Submitted
- `I` — Issued
- `N` — Not Issued
- `C` — Cancelled
- `A` — Not Applicable
- `U` — Suspended
- `M` — Migrated
- `B` — Not Submitted
- `Z` — Not Received

**Policy action types** (from `Constants.Actions`): New Business, Endorsement, Cancellation, Reinstatement, Renewal, Rewrite, Non Renewal, RewriteEndorsement, RewriteRenewal.

**Policy flags** (bitfield in `Flags.Policy`): Prospect (2), Package (4), MultiCarrier (8), EffectiveExpirationModified (16), PolicyDownloadOff (32), AssociatedToService (64), MultiCommission (128), HasArchivedTransactions (1024), EventPending (512), EventFailed (4096).

**Line flags** (bitfield in `Flags.Line`): Financed (2), Reinstated (4), DefaultCommissions (8), MarketingSubmissionExists (16), BillBrokerNet (32), QuotedAnnualizedPremium (64), AssociatedToService (128), OverrideCommission (256), MultiTermPrBrCommission (512).

### Transactions

Financial transactions record premium, commission, and fee movements:

- Transactions are associated with policies/lines and have structure combinations
- Operations: add, edit, reverse, void, finance, apply credit-to-debit, move, balance transfer
- Invoice generation, statement generation, and billing are transaction-related procedures
- Taxes and fees can be generated per transaction
- Concurrency lock area: `'AV'`

**Transaction type codes** (from `Constants.TransactionTypeCode`): `P` (Premium Amount), `F` (Fee Amount), `I` (Interest Amount), `B` (Admin Fees).

**Invoice status codes** (from `Constants.InvoiceStatus`): `C` (Created), `P` (Pending), `A` (Approved), `R` (Returned).

### Claims

Claims represent insurance loss events:

- Claims are under a client's policy
- Claim types: Auto, CSIO Auto, Property, CSIO Property, Liability, Summary Only, Workers Compensation, UK Motor, UK Commercial Line, UK Household
- Claim detail includes payments, adjustor information, litigation, additional parties, amount totals
- Concurrency lock area: `'AD'`

### Proofs of Insurance

- **Binders** — Temporary proof of insurance before formal policy issuance. Types include general binders. Concurrency lock area: `'R'`.
- **Certificates** — Documents proving insurance coverage, issued to third parties (holders). Types: Property (`P`), Liability (`L`), Intermodal/Interchange (`I`), CSIO Liability (`C`). Concurrency lock area: `'AE'`.
- **Evidence** — Evidence of insurance for property/commercial property coverage. Types: Property (old/new), Commercial Property (old/new). Concurrency lock area: `'AF'`.

### Contacts

- Contact types: Individual (`I`), Business (`B`), Primary (`P`), Additional (`A`)
- Individual contacts: personal information, driver information, employer information, name, address, classification
- Business contacts: business information, address, name, phone/email/web, contact ID numbers
- Contact access is gated by the parent account type's program access (e.g., `InsuredClients_InsuredClients_Contacts`, `Brokers_Brokers_Contacts`)

### Activities

Activities are tasks, notes, and follow-ups tracked within Epic:

- Activity status: Existing (`E`), Closed (`C`)
- Activity closed status: Successful (`S`), Unsuccessful (`U`)
- Note access levels: 1 (minimum) to 20 (maximum) — controls who can see the activity note
- Concurrency lock area: `'P'`
- Activities can be associated with many different parent objects (see `Constants.ActivityAssociatedTo`): Account (`1`), Policy (`2`), Line (`3`), Binder (`4`), Cancellation (`5`), Attachment (`6`), Claim (`7`), Receipt (`8`), Disbursement (`9`), Journal Entry (`10`), Direct Bill Reconciliation (`11`), Transaction (`12`), Activity (`13`), Certificate (`14`), Evidence (`15`), Bank Reconciliation (`16`), Carrier Submission (`17`), Marketing Submission (`18`), Voucher (`19`), Premium Reconciliation (`20`), Receipt Detail Line (`21`), Bill (`22`), and more (up to `41`)

**Activity Security Model:**

Activities use a **two-layer program access check**:

1. **General activity permission** — the base permission required for any activity operation:
   - `General_Activities_View` (92) — view activities
   - `General_Activities_Add` (93) — add new activities
   - `General_Activities_Edit` (94) — edit existing activities
   - `General_Activities_Close` (95) — close activities
   - `General_Activities_Reopen` (96) — reopen closed activities
   - `General_Activities_AddNotes` (102) — add notes to activities

2. **Account-type-specific activity permission** — checked in addition to the general permission, based on the parent account type:

   | Account Type       | Required Permission                                | Value |
   | ------------------ | -------------------------------------------------- | ----- |
   | Insured Client     | `InsuredClients_InsuredClients_Activities`         | 505   |
   | Prospective Client | `ProspectiveClients_ProspectiveClients_Activities` | 506   |
   | Broker             | `Brokers_Brokers_Activities`                       | 507   |
   | Company            | `Companies_Companies_Activities`                   | 508   |
   | Employee           | `Employees_Employees_Activities`                   | 509   |
   | Finance Company    | `FinanceCompanies_FinanceCompanies_Activities`     | 510   |
   | Other Interest     | `OtherInterests_OtherInterests_Activities`         | 511   |
   | Vendor             | `Vendors_Vendors_Activities`                       | 512   |
   | Lead               | `Lead_Lead_Activities`                             | 1680  |

**Activity Note Access Levels:**

Activity notes have a numeric access level (1 to 20) that controls visibility. Users must have the corresponding `General_Activities_NoteAccessLevel{N}` permission to view notes at that level:

- `General_Activities_NoteAccessLevel1` (97) through `General_Activities_NoteAccessLevel5` (101)
- `General_Activities_NoteAccessLevel6` (1610) through `General_Activities_NoteAccessLevel20` (1624)
- `General_Activities_ActivityNoteChangeAccessLevel` (1435) — permission to change an activity's note access level
- `General_Activities_ActivityNoteShowAllAccessLevels` (1625) — show all available levels
- The access level check uses `CoreSecurityAccess.ActivityNoteLevel(noteAccessLevel)`

**Activity Structure Access:**

- Activities inherit their structure (Agency/Branch/Department/Profit Center) from their parent object
- For **Client** parent accounts: Activities inherit Agency and Branch from the client structure, but Department and Profit Center are **cleared to -1** (not set)
- For **Policy/Line** parent objects: Activities inherit the full structure combination (Agency, Branch, Department, Profit Center)
- Structure access is checked via `CoreSecurityAccess.AgencyStructure(agencyId, branchId, departmentId, profitCenterId)`

**Activity CCA:**

- CCA applies to activities on Client accounts — if the client is CCA-protected, the user must have CCA access to view/edit activities on that client

### Attachments

Document attachments can be associated with various entities:

- Attachment types: Acquire and Attach (`A`), Document (`D`), Email (`E`), File (`F`), eForm (`G`)
- Concurrency lock area: `'CD'`

**Attachment Attach-To Types** (from `Constants.AttachmentAttachTo`):

| Attach-To Type            | Code | Description                             |
| ------------------------- | ---- | --------------------------------------- |
| Account                   | `A`  | Attached to an account                  |
| Activity                  | `V`  | Attached to an activity                 |
| Policy                    | `P`  | Attached to a policy                    |
| Line                      | `L`  | Attached to a policy line               |
| Claim                     | `C`  | Attached to a claim                     |
| Carrier Submission        | `M`  | Attached to a carrier submission        |
| Marketing Line            | `K`  | Attached to a marketing line            |
| Marketing Submission      | `R`  | Attached to a marketing submission      |
| Certificate               | `E`  | Attached to a certificate               |
| Evidence                  | `D`  | Attached to evidence of insurance       |
| Reconciliation            | `O`  | Attached to a reconciliation            |
| Disbursement              | `Z`  | Attached to a disbursement              |
| Cancellation              | `N`  | Attached to a cancellation              |
| Service                   | `S`  | Attached to a service contract          |
| Government Reconciliation | `G`  | Attached to a government reconciliation |
| Opportunity               | `T`  | Attached to an opportunity              |
| Quote                     | `Q`  | Attached to a quote                     |

**Attachment Security Model:**

Attachments use a **two-layer program access check** similar to activities:

1. **General attachment permission** — base permission for the operation:
   - `General_Attachments_View` (521) — view attachments
   - `General_Attachments_AddAttachments` (122) — add attachments
   - `General_Attachments_DeletePublicAttachments` (123) — delete public attachments
   - `General_Attachments_EditPublicAttachments` (124) — edit public attachments
   - `General_Attachments_MoveAttachment` (140) — move attachments
   - `General_Attachments_ConvertToPDF` (911) — convert to PDF
   - `General_Attachments_DistributeAttachments` (1441) — distribute attachments
   - `General_Attachments_ReactivateAttachment` (1437) — reactivate attachments
   - `General_Attachments_DeleteSystemGenerated` (617) — delete system-generated attachments
   - `General_Attachments_ReplaceOriginalOnEdit` (742) — replace original on edit
   - `General_Attachments_SendToESignature` (1492) — send to e-signature
   - `General_Attachments_PolicyChecking` (1520) — policy checking

2. **Account-type-specific attachment permission** — checked in addition to the general permission, based on the parent account type:

   | Account Type       | Required Permission                                 | Value |
   | ------------------ | --------------------------------------------------- | ----- |
   | Insured Client     | `InsuredClients_InsuredClients_Attachments`         | 442   |
   | Prospective Client | `ProspectiveClients_ProspectiveClients_Attachments` | 443   |
   | Broker             | `Brokers_Brokers_Attachments`                       | 444   |
   | Company            | `Companies_Companies_Attachments`                   | 445   |
   | Employee           | `Employees_Employees_Attachments`                   | 446   |
   | Finance Company    | `FinanceCompanies_FinanceCompanies_Attachments`     | 447   |
   | Other Interest     | `OtherInterests_OtherInterests_Attachments`         | 448   |
   | Vendor             | `Vendors_Vendors_Attachments`                       | 449   |

   The methods `SecurityAccess.CheckAttachmentAddSecurity(sAccountType, sClientType)` and `SecurityAccess.CheckAttachmentViewSecurity(sAccountType, sClientType)` implement this dual-check pattern.

**Attachment Access Levels:**

Like activity notes, attachments have access levels (1 to 20) defined in `Constants.AttachmentAccessLayer` (`MINIMUM_LEVEL = 1`, `MAXIMUM_LEVEL = 20`). Each level has three permissions:

- `General_Access_{N}AttachmentsView` — view attachments at level N
- `General_Access_{N}AttachmentsEdit` — edit attachments at level N
- `General_Access_{N}AttachmentsDelete` — delete attachments at level N

For example: `General_Access_1AttachmentsView` (125), `General_Access_1AttachmentsEdit` (126), `General_Access_1AttachmentsDelete` (127), through `General_Access_20AttachmentsView` (183), `General_Access_20AttachmentsEdit` (184), `General_Access_20AttachmentsDelete` (185).

**Client-Accessible Attachments:**

A special category for attachments visible to external clients:

- `General_Attachments_ViewClientAccessibleAttachment` (1334)
- `General_Attachments_AddClientAccessibleAttachment` (1335)
- `General_Attachments_EditClientAccessibleAttachment` (1336)

**Attachment CCA:**

- CCA applies to attachments on Client accounts — if the client is CCA-protected, the user must have CCA access to view/manage attachments on that client

**Attachment Structure Access:**

- Structure access for attachments is checked via `StructureAccess.CheckStructureAccessForAttachments()` (object type `ATTACHMENT = 15` in the structure access system)
- The attachment inherits its structure from its parent object (the entity it is attached to)

### Commission Agreements

Commission agreements define revenue sharing between the agency and producers/brokers:

- Commission agreement criteria flags: All (2), Package (4)
- Tiered commissions support open range start/end
- Producer/Broker commissions on policy lines track: receivable broker flag, house producer flag, use commission agreement flag, override flag
- Revenue status: `N` (New Revenue), `R` (Renewal Revenue), `A` (All)

### Agency Defined Codes

Custom categorization codes that agencies can define. Can be associated with:

- Accounts (`A`)
- Lines (`L`)
- Marketing Lines (`ML`)

### General Ledger

GL operations include:

- **Receipts** — incoming payments (payment methods: Cash `C`, Check `K`, Cash Back `B`, EFT `E`, ACH `A`, Direct Deposit `D`, Credit Card `R`, Other `O`, BACS)
- **Disbursements** — outgoing payments/checks
- **Journal Entries** — manual GL entries
- **Vouchers** — voucher status: Paid (`P`), Unpaid (`U`), Voided (`V`)
- **Reconciliations** — matching GL entries with statements. Types: Agency Bill (`A`), Direct Bill (`D`). Status: Cleared (`C`), Outstanding (`O`). Company reconciliation methods: Account Current (`A`), Company Statement (`C`), No Reconciliation (`N`), Both (`B`)
- **Bank Accounts** — concurrency lock area: `'BA'`
- **Budgets** — concurrency lock area: `'BV'`

---

## Key Domain Terminology

| Term                                | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure Combination**           | An Agency + Branch + Department + Profit Center tuple representing an organizational unit                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Organization**                    | Synonym for structure combination; API requests/responses may use "organization" to represent the four structure parts                                                                                                                                                                                                                                                                                                                                                                              |
| **Issuing Location**                | The geographic jurisdiction (state/province + country code) where a policy line or marketing line is issued. Determines which form editions and coverages are available, as well as state-specific regulatory rules. Not to be confused with structure combinations (Agency/Branch/Department/Profit Center), which represent organizational units. Changing a line's issuing location can result in loss of state-specific data (e.g., Workers Compensation coverages and underwriting questions). |
| **Line (of Business)**              | A specific insurance coverage type on a policy (e.g., General Liability, Business Auto)                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Marketing Submission**            | The process of submitting policy applications to insurance carriers for quoting                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Carrier Submission**              | A submission sent to a specific insurance carrier                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Service Summary**                 | A premium and coverage summary within a policy or marketing submission                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Producer/Broker Commission**      | Revenue sharing with producers (employees) and brokers for policy sales                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **CCA**                             | Confidential Client Access — security mechanism to restrict access to sensitive client data                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Endorsement**                     | A mid-term modification to an existing policy (add line, modify existing line)                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Binder**                          | A temporary proof of insurance before a formal policy is issued                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Certificate**                     | A document proving insurance coverage, issued to third parties (holders)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Evidence**                        | Evidence of insurance, similar to certificates but for different use cases                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Prefill**                         | Pre-populated data templates for creating new policies                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **ACORD**                           | Association for Cooperative Operations Research and Development — industry standard forms and codes. ACORD line of business codes (e.g., `AUTOB` for Business Auto, `CGL` for General Liability) are used for carrier interface mapping.                                                                                                                                                                                                                                                            |
| **CSIO**                            | Centre for Study of Insurance Operations — Canadian insurance industry standard                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Service Billing**                 | The billing configuration and schedule for a policy                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Reconciliation**                  | The process of matching GL entries with carrier statements (premium payables, broker commissions, etc.)                                                                                                                                                                                                                                                                                                                                                                                             |
| **Activities**                      | Tasks, notes, and follow-ups tracked within Epic; have note access levels (1-20)                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Agency Defined Codes**            | Custom codes that agencies can define for categorization of accounts, lines, or marketing lines                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Real-Time**                       | Integration with carrier systems for real-time quoting and processing                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Accounts Receivable**             | Outstanding amounts owed to the agency, tracked per policy                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Package Policy**                  | A policy that bundles multiple lines of business (indicated by `Flags.Policy.Package`)                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Concurrency Lock**                | A record-level lock using `FoundationConcurrency` and `Constants.ProgramArea` codes to prevent simultaneous edits                                                                                                                                                                                                                                                                                                                                                                                   |
| **Prospect / Contracted**           | Policy status — prospective policies are being quoted; contracted policies are bound/active                                                                                                                                                                                                                                                                                                                                                                                                         |
| **In Process / Submitted / Issued** | Key stages in the policy line status workflow                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **PPE**                             | Policy Processing Entity — a configuration unit for carrier interfaces                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **ICO**                             | Issuing Company — the insurance company that issues the policy                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **NPN**                             | National Producer Number — unique identifier for insurance producers/agents                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **NAIC**                            | National Association of Insurance Commissioners — provides company codes used in carrier interfaces                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Servicing Role**                  | An employee's role in servicing a client account (e.g., CSR, Account Manager)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Revenue Deferral**                | Scheduling recognition of revenue across accounting periods                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## Key Source Files for Security Research

| Purpose                              | File Path                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Program access enum (all values)     | `src/published/ASI.TAM/Foundation/Security/SecureArea.ts`                       |
| Bank account area enum               | `src/published/ASI.TAM/Foundation/Security/BankAccountArea.ts`                  |
| Centralized security check utilities | `src/published/ASI.TAM/UI/Foundation/SecurityAccess.ts`                         |
| Structure access check logic         | `src/published/ASI.TAM/Business/UI/Structure/Access.ts`                         |
| Screen code → namespace mapping      | `src/core/builtins/core/screenIDMap.ts`                                         |
| Licensing/feature access             | `src/published/ASI.TAM/Foundation/Licensing/Access.ts`                          |
| Licensed area enum                   | `src/published/ASI.TAM/Foundation/Licensing/Enums.ts`                           |
| Secured bank account interface       | `src/published/ASI.TAM/Foundation/Interface/ISecuredBankAccount.ts`             |
| Secured user interface               | `src/published/ASI.TAM/Foundation/Interface/ISecuredUser.ts`                    |
| Foundation constants                 | `src/published/ASI.TAM/Foundation/Constants.ts`                                 |
| Foundation flags                     | `src/published/ASI.TAM/Foundation/Flags.ts`                                     |
| Foundation enums                     | `src/published/ASI.TAM/Foundation/Enums.ts`                                     |
| Business exceptions                  | `src/published/ASI.TAM/Foundation/Exceptions/*.ts`                              |
| ScreenLogic files                    | `src/published/ASI.TAM/Screens/{Program}/{SubProgram}/{Screen}/ScreenLogic.tsx` |
| Business logic classes               | `src/published/ASI.TAM/Business/UI/{Domain}/`                                   |
| Data model classes                   | `src/published/ASI.TAM/Data/UI/{Domain}/`                                       |
| Data access proxies                  | `src/published/ASI.TAM/DataAccess/UI/{Domain}/Proxy/`                           |
| Menu definitions                     | `src/published/ASI.TAM/Menus/{Program}/MenuDef.ts`                              |

---

## Code Patterns for Security Research

### How to find program access checks in a ScreenLogic file

Search for these patterns:

```typescript
SecurityAccess.Area(SecureArea.{VALUE})          // Program access check
CoreSecurityAccess.Area(SecureArea.{VALUE})       // Core framework program access check
SecurityAccess.Check{Operation}Security()         // Pre-built security check methods
FoundationSecurityAccess.Check{Operation}Security()  // Referenced via import alias
CommonMessages.NoRightsMessage()                  // Shown when access is denied
```

### How to find structure access checks

```typescript
SecurityAccess.CheckStructureAccess(SecurityAccess.ObjectType.{TYPE}, objectId)
SecurityAccess.CheckStructureAccessForAccount(accountType, accountId)
StructureAccess.CheckStructureAccessFor{ObjectType}(objectId, securedUser)
```

### How to identify required security from ScreenLogic

1. Look at the screen's `init` or `load` methods for program access checks that gate the entire screen
2. Look at action handlers (button clicks, menu items) for operation-specific program access checks
3. Follow the parent screen hierarchy — users must have access to navigate through parent screens
4. Check if data loading involves structure access via the `SecurityAccess.CheckStructureAccess()` calls
5. For client data, CCA is implicit — always note it as a requirement

### Common validation patterns in ScreenLogic

- **Required field checks:** Look for conditionals that check `isEmpty()`, `isNull()`, `Value() === ''`, or `trim().length === 0` before save operations
- **Format validation:** Look for regex patterns, length checks, or format-specific validators
- **Cross-field validation:** Look for conditionals that compare multiple field values or enforce dependencies between fields
- **Lookup validation:** Fields populated from dropdowns/lookups (`MetaComboBox` / `CComboBox`) — the valid values are constrained by the lookup source
- **Business rule enforcement:** Look for business logic calls in `save`, `validate`, or `beforeSave` methods that throw exceptions from `Foundation/Exceptions/`
- **Concurrency checks:** Look for `FoundationConcurrency` calls that acquire record locks using `Constants.ProgramArea` area codes

### Custom business exceptions

All custom exceptions in `Foundation/Exceptions/` extend `ValidationException` from the core framework. They are thrown when business rules are violated:

| Exception                                | Rule                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `RequiredBrokerProducer`                 | At least one Producer/Broker Commission must be defined for each line of business in Servicing/Billing |
| `RequiredICOandPPE`                      | Required Issuing Company and Policy Processing Entity must be set                                      |
| `UnableToCancel`                         | Policy cannot be cancelled (various reasons)                                                           |
| `UnableToCopyPolicy`                     | Policy cannot be copied                                                                                |
| `UnableToIssueCancellation`              | Cancellation cannot be issued                                                                          |
| `UnableToIssueChange`                    | Change/endorsement cannot be issued                                                                    |
| `UnableToIssueEndorsementOnUnissuedLine` | Cannot endorse a line that has not been issued                                                         |
| `UnableToReject`                         | Submission/application cannot be rejected                                                              |
| `UnableToUpdateStageToSubmitted`         | Policy stage cannot be updated to submitted                                                            |
| `CancellationDates`                      | Cancellation date validation failure                                                                   |
| `ReinstateEffectiveDate`                 | Reinstatement effective date validation failure                                                        |
| `ReinstateLapse`                         | Reinstatement lapse validation failure                                                                 |
| `ReinstatePolicyExpirationDate`          | Reinstatement policy expiration date validation failure                                                |
| `BrokerReceivableRemoved`                | Broker receivable was removed (validation warning)                                                     |
| `InactiveOrInvalidBusinessType`          | Business type is inactive or invalid                                                                   |
| `NoEditsInstalledException`              | No editing capability is installed                                                                     |
| `PaymentHubLaunchException`              | Payment hub launch failure                                                                             |

### Data flow pattern: ScreenLogic → Business → Data → DataAccess

When tracing business rules for an API, follow this chain:

1. **ScreenLogic** (`Screens/`) — Contains field declarations, UI event handlers, and calls to Business layer
2. **Business** (`Business/UI/`) — Contains business rules, validations, and orchestration logic
3. **Data** (`Data/UI/`) — Contains data model classes representing entities
4. **DataAccess** (`DataAccess/UI/`) — Contains proxy classes that execute database operations

The Business layer is where most validation rules and business logic reside. ScreenLogic files often delegate to Business layer methods for save/validate operations. When researching API requirements, prioritize reading the Business layer files over ScreenLogic for core validation rules, but check ScreenLogic for UI-level validations that may represent required fields not explicitly validated in the Business layer.
