---
name: epic-data-layer-knowledge
description: Reference for tracing Chimera client-to-server data-layer flows, SQL operations, and table/column mappings
---

# Epic Data Layer Knowledge for API Research

This skill provides foundational knowledge about the Epic data layer architecture spanning both the Chimera-Client (proxy/UI layer) and Chimera-Server (database/backend layer). Use this when researching which tables, columns, and queries are involved in a given API workflow.

---

## Architecture Overview

The data layer in Epic follows a multi-tier architecture:

```
ScreenLogic (UI) → Business Layer → Proxy Layer (Client) → HTTP/WebSocket → Endpoint Handler (Server) → DatabaseHelper → SQL Server
```

1. **ScreenLogic** — UI controllers that handle user interactions
2. **Business Layer** (`Business/UI/`) — Business logic and orchestration
3. **Proxy Layer** (`DataAccess/UI/`) — Client-side data access that translates calls into HTTP requests
4. **Endpoint Handler** (`SingleEndpointHandler`) — Server-side dispatcher that routes requests to the correct class/method
5. **DatabaseHelper** — Server-side base class providing all database access methods
6. **SQL Server** — The underlying relational database

---

## Chimera-Client Proxy Layer

### How Proxy Classes Work

Proxy classes in Chimera-Client are the bridge between client-side business logic and the Chimera-Server backend. They live in `src/published/ASI.TAM/DataAccess/UI/{Feature}/Proxy/{Name}.ts`.

Each proxy file defines:

- A constant `endpointPath` (e.g., `'UI/Activity/View'`) that maps to the server-side class
- Static async methods that call `callRemoteMethod()` or its variants

**Example proxy file structure:**

```typescript
import { callRemoteMethod, callRemoteMethodAsDataTableArray } from "@core";

const endpointPath = "UI/Activity/View";

export abstract class ActivityViewProxy {
  static async FetchActivityList(
    iEntityID: number,
    eSortColumn: AccountActivityViewColumns,
    eSortDirection: SortDirection,
    sViewMode: string,
    datFilterFields: Hashtable[],
    sCultureCode: string,
  ): Promise<DataTable[]> {
    return callRemoteMethodAsDataTableArray(
      endpointPath,
      "FetchActivityList",
      ["int", "enum", "enum", "string", "Hashtable[]", "string"],
      [
        iEntityID,
        eSortColumn,
        eSortDirection,
        sViewMode,
        datFilterFields,
        sCultureCode,
      ],
    );
  }
}
```

### Core Proxy Functions

The core proxy implementation lives in `src/core/builtins/SMART/proxy.ts` and provides:

| Function                                                      | Return Type            | Description                |
| ------------------------------------------------------------- | ---------------------- | -------------------------- |
| `callRemoteMethod(path, name, types, params)`                 | `Promise<any>`         | Raw result from server     |
| `callRemoteMethodAsDataTable(path, name, types, params)`      | `Promise<DataTable>`   | Single DataTable result    |
| `callRemoteMethodAsDataTableArray(path, name, types, params)` | `Promise<DataTable[]>` | Array of DataTable results |

### Parameter Type Mapping

The proxy maps TypeScript types to server-side types:

| Client Type String                              | Server Type                      |
| ----------------------------------------------- | -------------------------------- |
| `'int'`, `'number'`                             | Integer                          |
| `'string'`                                      | String                           |
| `'boolean'`, `'bool'`                           | Boolean                          |
| `'datetime'`, `'System.DateTime'`               | DateTime                         |
| `'hashtable'`, `'System.Collections.Hashtable'` | Hashtable (key-value dictionary) |
| `'int[]'`, `'string[]'`                         | Arrays                           |
| `'Hashtable[]'`                                 | Array of Hashtable               |
| `'DataTable'`                                   | DataTable (tabular data)         |
| `'GenericList<T>'`                              | Generic list                     |

### Batch Transaction Pattern

For multi-step operations, the client batches calls using `RemoteRecorder`:

```typescript
RemoteRecorder.Start();
const result1 = await SomeProxy.InsertRecord(data);
await SomeProxy.InsertRelatedRecord({ parentId: result1, ... });
const results = await RemoteRecorder.Stop(); // All calls sent as a single batch
```

This is important for data layer research because batch operations indicate that multiple database operations occur atomically within a single server-side transaction.

### Tracing from ScreenLogic to Server Endpoints

To identify which server-side endpoints a workflow calls:

1. **Read the ScreenLogic file** at `Screens/{Feature}/{Screen}/ScreenLogic.ts(x)`
2. **Find Business layer imports** — e.g., `import { ActivityView } from '@asi.tam/published/Business/UI/Activity/View'`
3. **Read the Business file** — follow the import path to the Business layer class
4. **Find Proxy calls** — the Business layer imports and calls Proxy classes
5. **Read the Proxy file** — find the `endpointPath` constant and method names
6. **Map to server endpoint** — the full server endpoint is `{endpointPath}/{methodName}`

**Example trace:**

```
ScreenLogic → imports Business/UI/Activity/View
  → calls ActivityView.FindActivityList()
    → calls ActivityViewProxy.FetchActivityList()
      → endpointPath = 'UI/Activity/View', method = 'FetchActivityList'
        → Server endpoint: UI/Activity/View/FetchActivityList
```

### Proxy File Locations

Proxy files follow a consistent directory structure:

```
src/published/ASI.TAM/DataAccess/UI/{Domain}/Proxy/{Name}.ts
```

Common examples:

- `DataAccess/UI/Activity/Proxy/View.ts` → endpoint `UI/Activity/View`
- `DataAccess/UI/Activity/Proxy/Detail.ts` → endpoint `UI/Activity/Detail`
- `DataAccess/UI/Account/Client/Proxy/AccountDetail.ts` → endpoint `UI/Account/Client/AccountDetail`
- `DataAccess/UI/Policy/Marketing/Proxy/MasterSubmissionDetail.ts` → endpoint `UI/Policy/Marketing/MasterSubmissionDetail`

---

## Chimera-Server Data Layer

### Endpoint Name to Class/Method Resolution

The server uses the `SingleEndpointHandler.RunSingleEndpoint` method to dispatch incoming requests. The algorithm:

1. The endpoint URL path (e.g., `UI/Activity/View/FetchActivityList`) is parsed by `Utility.ParsePath()`
2. The **path** portion (`UI/Activity/View`) is converted to a C# namespace via `ClassWrapper.GetNamespace()`:
   - Prepends `ASI.` to the path
   - Replaces `/` with `.`
   - Result: `ASI.UI.Activity.View`
3. The **method name** (`FetchActivityList`) is the last segment of the URL
4. The class is resolved via `Type.GetType(namespace)` using reflection
5. The method is invoked on an instance of the class via `ClassWrapper.InvokeMethod()`

**Key files:**

- `src/core/Endpoints/Handlers/SingleEndpointHandler.cs` — Request dispatcher
- `src/core/SMART/ClassWrapper.cs` — Dynamic class/method resolution (see `GetNamespace()` at lines 327-344)
- `src/core/SMART/Utility.cs` — `ParsePath()` utility

### Server-Side Class Structure

Server-side endpoint classes inherit from `DatabaseHelper` and live under `src/published/ASI.TAM/DataAccess/`:

```
src/published/ASI.TAM/DataAccess/
├── Interface/          # Integration endpoints
├── UI/                 # UI-driven endpoints (most common)
│   ├── Activity/       # Activity domain
│   ├── Account/        # Account domain
│   ├── Policy/         # Policy domain
│   └── ...
├── Services/           # Service-specific endpoints
└── Sys/                # System endpoints
```

Each class follows this pattern:

```csharp
class View : DatabaseHelper {
    public DataTable[] FetchActivityList(int idEntity, ...) {
        var sql = @$"SELECT ... FROM ... WHERE ...";
        return ExecuteDataTables(sql, true);
    }

    public int InsertActivity(Hashtable htblColumnValue) {
        var qb = new QueryBuilder(htblColumnValue);
        var sql = qb.GetInsertStatementWithFieldList("activity", fields);
        return ExecuteAutoNumberInsert(sql, this.getIdentityQuery());
    }
}
```

### DatabaseHelper — Core Data Access Base Class

All endpoint classes inherit from `DatabaseHelper` (`src/core/SMART/DatabaseHelper.cs`), which provides all database access methods:

#### Query Methods (SELECT)

| Method                              | Returns           | Use Case                              |
| ----------------------------------- | ----------------- | ------------------------------------- |
| `ExecuteDataTables(sql)`            | `DataTable[]`     | SELECT returning multiple result sets |
| `ExecuteDataSet(sql)`               | `DataSet`         | SELECT as DataSet                     |
| `ExecuteReader(sql)`                | `ConnectedReader` | Streaming/large result sets           |
| `ExecuteScalar(sql)`                | `int`             | Single value queries                  |
| `ExecuteSingleton<T>(sql, default)` | `T`               | Single typed value                    |

#### Mutation Methods (INSERT/UPDATE/DELETE)

| Method                                          | Returns               | Use Case                       |
| ----------------------------------------------- | --------------------- | ------------------------------ |
| `ExecuteInsert(sql, options)`                   | `int`                 | INSERT statements              |
| `ExecuteAutoNumberInsert(insert, autoNumQuery)` | `int`                 | INSERT with IDENTITY retrieval |
| `ExecuteUpdate(sql, options)`                   | `int` (rows affected) | UPDATE statements              |
| `ExecuteDelete(sql, options)`                   | `int` (rows affected) | DELETE statements              |

#### Stored Procedure Methods

| Method                                   | Returns       | Use Case                     |
| ---------------------------------------- | ------------- | ---------------------------- |
| `ExecSPNonQuery(sprocName, options)`     | `int`         | Stored procedure (no result) |
| `ExecSPScalar(sprocName, options)`       | `object?`     | Stored procedure (scalar)    |
| `ExecSPSingleton<T>(sprocName, default)` | `T`           | Stored procedure (typed)     |
| `ExecSPDataTables(sprocName, options)`   | `DataTable[]` | Stored procedure (tabular)   |

#### Modern Data Access (Dapper)

Some newer code uses Dapper:

```csharp
var results = QueryAsync<T>(sqlQuery, sqlParameters, dbConnection);
```

### SQL Query Patterns

#### Raw SQL Pattern (most common in existing code)

```csharp
var sSQL = @$"
SELECT ent.UniqEntity, ent.EntKey, ent.Flags, ent.LookupCode, ent.NameOf
FROM Entity ent
WHERE ent.UniqEntity = {(idActivity)}";
return ExecuteDataTables(sSQL, true);
```

#### QueryBuilder Pattern (for INSERT/UPDATE from Hashtable)

```csharp
var oQueryBuilder = new QueryBuilder(htblColumnValues);
var sBuilder = oQueryBuilder.GetInsertStatementWithFieldList("tablename", asFields);
return ExecuteAutoNumberInsert(sBuilder, this.getIdentityQuery());
```

`QueryBuilder` (`src/core/SMART/QueryBuilder.cs`) generates SQL statements from `Hashtable` input:

- `GetInsertStatement()` — Full INSERT from all Hashtable keys
- `GetInsertStatementWithFieldList(tableName, fieldArray)` — INSERT with specific fields
- `GetUpdateStatement()` — UPDATE from all Hashtable keys
- `GetDeleteStatement()` — DELETE statement

#### StatementBuilder Pattern (parameterized queries)

`StatementBuilder` (`src/core/SMART/StatementBuilder.cs`) provides a fluent API for building parameterized SQL:

```csharp
var builder = new StatementBuilder();
// Builds parameterized SQL with WHERE clauses and SqlParameter collections
```

#### Stored Procedure Pattern

```csharp
var opts = new ExecSPDataTablesOptions {
    CommandParameters = new List<IDbDataParameter> {
        new SqlParameter("@param1", value1),
        new SqlParameter("@param2", value2)
    }
};
var result = ExecSPDataTables("assp_StoredProcName", opts);
```

### Execution Options

Database methods accept options objects that control behavior:

**ExecuteNonQueryOptions** (for INSERT/UPDATE/DELETE):

```csharp
new ExecuteNonQueryOptions {
    IgnoreZeroRow = true/false,       // Throw exception if no rows affected
    CommandParameters = parameters     // SqlParameter list
}
```

**ExecuteScalarOptions** (for single values):

```csharp
new ExecuteScalarOptions {
    ValueIfNull = -1,                 // Default if NULL returned
    CommandParameters = parameters,
    ReadOnlyExecutionType = DBCommandOptions.ReadOnlyExecution.AvailabilityGroupPriority
}
```

**ExecuteDataTablesOptions** (for SELECT):

```csharp
new ExecuteDataTablesOptions {
    ReadOnlyExecutionType = DBCommandOptions.ReadOnlyExecution.SnapshotIsolationOnly,
    CommandParameters = parameters
}
```

### String Escaping

Server-side code uses `ToDBString()` to escape string values for SQL:

```csharp
WHERE CultureCode = {(ToDBString(sCultureCode))}
```

### Identity Retrieval

After INSERT operations, the identity (auto-number) value is retrieved using:

```csharp
ExecuteAutoNumberInsert(insertSql, this.getIdentityQuery());
```

This returns the newly generated primary key value.

---

## Security Functions to IGNORE

When researching the data layer for API purposes, **skip these security-related patterns** — they are handled separately by the API security layer and are not relevant to understanding what data actions occur:

### Server-Side Security to Ignore

- **Authentication/Token validation** — `TokenInfo` parsing, bearer token extraction, JWT validation in `SingleEndpointHandler`
- **Authorization checks** — `CheckAuthorization()`, `CheckValidation()` calls in `ClassWrapper`
- **Validate\* functions** - `ValidateVariableLengthStructureAccessAsync`, `ValidateUserStructureAndCCAAccessAsync`, `ValidateUserProgramAccessAgainstEpicObjectAsync`, `ValidateUserStructureAgainstEpicObjectAsync`, etc.
- **Structure access filtering** — Any method that filters query results based on user structure access
- **CCA filtering** — Methods that filter data based on confidential client access
- **Program access checks** — Methods that verify the user has permission to execute an operation
- **Exception handling for security** — `StructureForbiddenException`, `ProgramAccessForbiddenException`, `ForbiddenException`, `UnauthorizedAccessException`
- **Database override validation** — `AllowDatabaseOverrideAttribute` checks

### Common Security Method Names to Skip

When reading server-side endpoint classes, skip any calls to methods with these patterns:

- `Check*Security()`, `Check*Access()`, `Check*Authorization()`
- `Validate*Permission()`, `Validate*Access()`
- `Filter*ByStructure()`, `Filter*BySecurity()`
- `GetSecured*()` (when used for filtering, not data retrieval)
- Methods in `src/core/Security/` directory
- Calls to repository classes in `src/core/SMART/Repositories/` that deal with security validation (e.g., `StructureRepository`, `ClientRepository` for CCA checks)

### What TO Focus On

Focus on:

- **SQL queries** — SELECT, INSERT, UPDATE, DELETE statements
- **Table names** referenced in queries
- **Column names** read or written
- **Stored procedure calls** and their parameters
- **The order of operations** — which queries run first, which depend on results from prior queries
- **Return values** — what data is returned to the caller
- **QueryBuilder usage** — which tables and fields are passed to QueryBuilder
- **Hashtable parameters** — the key names in Hashtable parameters often correspond to column names

---

## Mapping Client Endpoints to Server Files

To find the server-side file for a given client proxy endpoint:

1. **Get the endpoint path** from the proxy file (e.g., `'UI/Activity/View'`)
2. **Convert to server file path**: `src/published/ASI.TAM/DataAccess/{endpointPath}.cs`
   - Example: `UI/Activity/View` → `src/published/ASI.TAM/DataAccess/UI/Activity/View.cs`
3. **Note:** Some paths have additional nesting (e.g., `Base/International/Common/`). If the direct path doesn't exist, search for the class name in the `DataAccess/` directory.
4. **The method name** in the proxy call maps directly to the C# method name in the server class.

### Server File Organization

Server-side data access files may be organized with regional/base class hierarchies:

```
DataAccess/UI/Activity/
├── Base/
│   └── International/
│       └── Common/
│           └── ActivityServer.cs    # Base implementation
├── View.cs                          # May inherit from base
└── Detail.cs                        # May inherit from base
```

When tracing a method, check if the class inherits from a base class — the actual SQL query may live in the base class rather than the direct endpoint class.

---

## Common Database Patterns

### Fetch Patterns

**Single entity fetch:**

```csharp
var sql = $"SELECT * FROM TableName WHERE PrimaryKey = {(id)}";
return ExecuteDataTables(sql);
```

**List fetch with filtering:**

```csharp
var sql = @$"
SELECT t.Col1, t.Col2, t.Col3
FROM TableName t
WHERE t.ParentKey = {(parentId)}
  AND t.Status = {(ToDBString(status))}
ORDER BY t.SortColumn";
return ExecuteDataTables(sql, true);
```

**Multi-table join fetch:**

```csharp
var sql = @$"
SELECT a.Col1, b.Col2, c.Col3
FROM TableA a
INNER JOIN TableB b ON a.KeyB = b.PrimaryKey
LEFT JOIN TableC c ON a.KeyC = c.PrimaryKey
WHERE a.FilterKey = {(filterValue)}";
return ExecuteDataTables(sql);
```

### Insert Patterns

**Hashtable-based insert:**

```csharp
var htbl = new Hashtable {
    { "columnname", value },
    { "othercolumn", otherValue }
};
var qb = new QueryBuilder(htbl);
var sql = qb.GetInsertStatementWithFieldList("tablename", new string[] { "columnname", "othercolumn" });
return ExecuteAutoNumberInsert(sql, this.getIdentityQuery());
```

**Direct SQL insert:**

```csharp
var sql = $"INSERT INTO TableName (Col1, Col2) VALUES ({(val1)}, {(ToDBString(val2))})";
return ExecuteInsert(sql);
```

### Update Patterns

**Hashtable-based update:**

```csharp
var qb = new QueryBuilder(htblColumnValues);
var sql = qb.GetUpdateStatement();
// sql includes SET clause from Hashtable keys/values
return ExecuteUpdate($"UPDATE tablename SET {sql} WHERE PrimaryKey = {(id)}");
```

### Delete Patterns

```csharp
var sql = $"DELETE FROM TableName WHERE PrimaryKey = {(id)}";
return ExecuteDelete(sql);
```

---

## Transaction Handling

### Single Endpoint Requests

Each endpoint call executes within a single database connection created by `SingleEndpointHandler`:

```csharp
using var connection = new ChimeraDbConnectionWrapper(tokenInfo);
ClassWrapper.InvokeMethod(classType, methodName, connection, parameters);
```

The connection wraps a SQL Server connection and manages the implicit transaction.

### Batch Requests

The `BatchController` supports batching multiple endpoint calls into a single transaction:

- A single connection is shared across all calls in the batch
- Sequential execution within the transaction
- Explicit commit/rollback on success/failure
- Parameter aliasing between calls (e.g., use the insert ID from call 1 in call 2)

This is important because when the client uses `RemoteRecorder.Start()/Stop()`, the server processes all queued calls in a single batch transaction.

---

## Key Source Files for Data Layer Research

| Purpose                           | File Path (Chimera-Server)                             |
| --------------------------------- | ------------------------------------------------------ |
| Request dispatcher                | `src/core/Endpoints/Handlers/SingleEndpointHandler.cs` |
| Dynamic class/method resolution   | `src/core/SMART/ClassWrapper.cs`                       |
| Path parsing utility              | `src/core/SMART/Utility.cs`                            |
| Database access base class        | `src/core/SMART/DatabaseHelper.cs`                     |
| SQL statement builder (Hashtable) | `src/core/SMART/QueryBuilder.cs`                       |
| Parameterized SQL builder         | `src/core/SMART/StatementBuilder.cs`                   |
| Execution options                 | `src/core/SMART/DBCommandOptions.cs`                   |
| Repository base                   | `src/core/SMART/Repositories/RepositoryBase.cs`        |
| Batch request handler             | `src/core/Endpoints/Controllers/BatchController.cs`    |
| Endpoint data access classes      | `src/published/ASI.TAM/DataAccess/{endpointPath}.cs`   |

| Purpose                   | File Path (Chimera-Client)                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| Core proxy implementation | `src/core/builtins/SMART/proxy.ts`                                              |
| Server path configuration | `src/core/builtins/core/config.ts`                                              |
| HTTP client setup         | `src/core/builtins/core/axios.ts`                                               |
| Proxy files (data access) | `src/published/ASI.TAM/DataAccess/UI/{Domain}/Proxy/{Name}.ts`                  |
| Business logic layer      | `src/published/ASI.TAM/Business/UI/{Domain}/`                                   |
| ScreenLogic files         | `src/published/ASI.TAM/Screens/{Program}/{SubProgram}/{Screen}/ScreenLogic.tsx` |

---

## Identifying Tables and Columns from Code

When analyzing server-side endpoint methods:

1. **Direct SQL queries** — Table and column names appear directly in the SQL string
2. **QueryBuilder usage** — The first parameter to `GetInsertStatementWithFieldList()` is the table name; the field array contains column names
3. **Hashtable keys** — When a Hashtable is passed to QueryBuilder, the keys correspond to column names
4. **Stored procedures** — The stored procedure name is passed as a string; the parameters often correspond to table columns
5. **Multiple result sets** — `ExecuteDataTables()` can return multiple `DataTable` objects from queries with multiple SELECT statements; each represents a different result set (potentially from different tables)

### Tips for Column Discovery

- Look at the field array passed to `GetInsertStatementWithFieldList()` — this lists the exact columns being written
- Look at the SELECT column list in fetch queries — this lists the exact columns being read
- Hashtable keys in insert/update operations map to column names
- SqlParameter names (prefixed with `@`) in stored procedure calls often match column names
- JOIN conditions reveal relationships between tables (foreign key columns)
