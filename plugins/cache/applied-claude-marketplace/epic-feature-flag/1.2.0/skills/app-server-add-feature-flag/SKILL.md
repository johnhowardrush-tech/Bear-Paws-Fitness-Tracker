---
name: app-server-add-feature-flag
description: Add a new feature flag to the Epic (App Server) codebase only. ONLY use this skill directly if the user explicitly wants Epic-only changes or if you are running as a subagent dispatched by add-feature-flag. If add-feature-flag is available in your skills list, use that instead — it orchestrates this skill alongside ConfigCat and Chimera. Triggers on "add flag to epic", "update FeatureFlag.vb", "update Endpoint.vb", or when dispatched as a subagent.
---

# Add Feature Flag (App Server)

> **Are flag name, repo path, and skip instructions already provided in your prompt?** If yes — you are a subagent dispatched by `add-feature-flag` and should proceed with this skill immediately.
>
> If no flag details are pre-provided and `add-feature-flag` (or `epic-feature-flag:add-feature-flag`) is in your available-skills list — stop and invoke that orchestrator instead. Only continue here if the user explicitly wants Epic-only changes.

This skill walks through adding a new feature flag to the Epic codebase. There are two files that need updates and a prerequisite step in ConfigCat.

> **Note:** This codebase uses TFS for source control and MSBuild for builds. The instructions below include platform-specific sections for Windows and macOS/Linux.

## Step 1: Locate the Epic Codebase

Check whether the current working directory (or a parent of it) contains `ASI.SMART` and `ASI.TAM` directories.

- **If yes**: Tell the user which path you found and **ask them to confirm** it is the correct branch before proceeding. Example: "I found an Epic codebase at `/path/to/Epic/Dev`. Is this the branch you want to modify?"
- **If no**: Ask the user for the path (e.g., `C:\Epic\FTR\FTR1` or `~/Epic/FTR/FTR1`).

**NEVER scan or search the filesystem** (e.g., `ls /c/Epic/*/`, `find`, globbing parent directories) to locate Epic codebases. Do not run any Bash commands that look for `ASI.SMART` or `ASI.TAM` outside the current working directory tree. Developers have multiple branches (Dev, Feature, etc.) in different folders, and automatically finding and selecting one will pick the wrong branch. Always ask the user if you are not already inside one.

All file paths in subsequent steps are relative to this root.

## Step 2: ConfigCat Reminder

**Skip this step if the flag was selected using the list-feature-flags skill** — that skill reads directly from the ConfigCat repo, so the flag is already confirmed to exist.

Otherwise, alert the user:

> **Important:** Make sure this feature flag has been added to ConfigCat first. If the flag doesn't exist in ConfigCat, it won't work as intended at runtime even though the code will compile. If you haven't done this yet, do it now before proceeding.

Wait for the user to confirm before continuing.

## Step 3: Gather Information

Ask the user for three pieces of information:

1. **Application name** - The ConfigCat application (e.g., `epic`, `appliedpay`, `benefitsoverview`, `policyworks`). This appears in the URL as the `application` query parameter. Defaults to `epic` if the user doesn't specify.
2. **Flag name** - The name of the feature flag (e.g., `MY_NEW_FLAG`). This will be used as the constant name in the TypedString and as the property name in the endpoint class.
3. **Configuration area** - The ConfigCat configuration area (e.g., `sms`, `dashboard`, `email`, `AI`, `book-builder`). This determines which subclass the endpoint property goes into in the TAM Endpoint file, and appears in the URL as the `configuration` query parameter.

If the user isn't sure which flag to add or wants to browse existing flags, use the **list-feature-flags** skill to let them select from the available ConfigCat flags. That skill provides the application name, flag name, and configuration area automatically.

Once you have all three, proceed to the next step.

## Step 4: Check for Duplicates

Before making any changes, check if the flag already exists in either file:

1. Search `ASI.SMART/Foundation/TypedString/FeatureFlag.vb` for the flag name (e.g., grep for `MY_NEW_FLAG`).
2. Search `ASI.TAM/Foundation/Services/Endpoint.vb` for the flag name in lowercase (e.g., grep for `my_new_flag`).

If the flag is found in either file, alert the user:

> **This flag already exists.** `{FLAG_NAME}` was found in {file(s)}. It does not need to be added again.

Show the user where it was found (the matching lines) and stop. Do not proceed with edits.

## Step 5: TFS Checkout

Before editing any files, check them out from TFS so they become writable.

**Windows:**

```bash
"/c/Program Files/Microsoft Visual Studio/2022/Enterprise/Common7/IDE/CommonExtensions/Microsoft/TeamFoundation/Team Explorer/TF.exe" vc checkout "ASI.SMART/Foundation/TypedString/FeatureFlag.vb"
"/c/Program Files/Microsoft Visual Studio/2022/Enterprise/Common7/IDE/CommonExtensions/Microsoft/TeamFoundation/Team Explorer/TF.exe" vc checkout "ASI.TAM/Foundation/Services/Endpoint.vb"
```

**macOS/Linux:**

```bash
tf vc checkout "ASI.SMART/Foundation/TypedString/FeatureFlag.vb"
tf vc checkout "ASI.TAM/Foundation/Services/Endpoint.vb"
```

If `tf` is not on the PATH, ask the user where their TFS/TEE CLI is installed, or have them check out the files manually through their IDE.

If a file is already checked out, the command will indicate that and it's safe to continue. If the checkout fails for another reason (e.g., workspace not found, permissions), let the user know and ask them to check out the files manually.

## Step 6: Add the TypedString in ASI.SMART

File: `ASI.SMART/Foundation/TypedString/FeatureFlag.vb`

Three additions are needed in this file, all following the existing pattern:

### 6a. Add a Case to `FromString`

Add a new `Case` block inside the `Select Case` in the `FromString` method, just before the `Case Else` line:

```vb
        Case {FLAG_NAME}.Value
          Return {FLAG_NAME}
```

### 6b. Add to `GetStrings`

Add the flag name to the `GetStrings()` return list, at the end just before the closing `}`:

```vb
        {FLAG_NAME}
```

Note: add a comma to the previous last entry first.

### 6c. Add the Shared ReadOnly declaration

Add a new `Public Shared ReadOnly` field at the end of the existing declarations (before `End Class`):

```vb
    Public Shared ReadOnly {FLAG_NAME} As New FeatureFlag("{FLAG_NAME}")
```

The string value passed to the constructor should match the constant name exactly unless the user specifies otherwise.

## Step 7: Add the Endpoint in ASI.TAM

File: `ASI.TAM/Foundation/Services/Endpoint.vb`

Look inside the `FeatureFlag` class (starts with `Public Class FeatureFlag` and ends with its corresponding `End Class`).

### If the configuration area already has a subclass

Find the existing subclass that matches the configuration area. Add a new `Public Shared ReadOnly Property` inside it:

```vb
      Public Shared ReadOnly Property {Flag_Name}(ByVal oUserContext As SMART.Foundation.Interface.IUserContext) As String
        Get
          Return $"v1/flags/{flag_name_lowercase}?application={application_name}&configuration={configuration_area}{FndEnd.FeatureFlag.GetAttributes(oUserContext)}"
        End Get
      End Property
```

Where:

- `{Flag_Name}` is the property name (use the flag name, typically PascalCase or UPPER_CASE matching existing patterns in that subclass)
- `{flag_name_lowercase}` is the TypedString constant name converted to lowercase (e.g., `AI_AUTOFILL` becomes `ai_autofill`). The URL flag name always matches the TypedString name in lowercase.
- `{configuration_area}` is the configuration value provided by the user

### If the configuration area does NOT have a subclass yet

Create a new subclass inside the `FeatureFlag` class (before the `End Class` of the FeatureFlag class). All feature flag endpoints must live inside this class -- never outside it. Use the configuration name formatted as a PascalCase class name, following the naming style of other subclasses:

```vb
    Public Class {ConfigurationAreaPascalCase}
      Public Shared ReadOnly Property {Flag_Name}(ByVal oUserContext As SMART.Foundation.Interface.IUserContext) As String
        Get
          Return $"v1/flags/{flag_name_lowercase}?application={application_name}&configuration={configuration_area}{FndEnd.FeatureFlag.GetAttributes(oUserContext)}"
        End Get
      End Property
    End Class
```

### Matching configuration areas to existing subclasses

The mapping between configuration area and subclass is not always 1:1. Some configuration areas group multiple flags into a single subclass (e.g., `RevenueStatus` has both `REVENUE_STATUS` and `REVENUE_STATUS_DATE_CONFIGURATION`). Others use a separate subclass per flag even though they share the same configuration area (e.g., SMS flags each have their own class: `SMS_MMS`, `SMS_MOVE`, `SMS_ROUTING`, `SMS_TRAFFIC_VALIDATION`, etc.).

Always read the current file to determine which pattern the configuration area follows. Search for the configuration value in the URL strings (e.g., `configuration=sms`) to find matching subclasses. Then follow the established convention:

- If the config area uses **one class per flag** (like SMS), create a new subclass for the new flag.
- If the config area uses **a shared class** (like RevenueStatus or Recon_AI), add the property to the existing class.

## Summary Checklist

After making changes, confirm:

- [ ] ConfigCat flag exists (user confirmed or selected via list-feature-flags)
- [ ] Flag does not already exist in the codebase (verified)
- [ ] `FromString` case added in FeatureFlag.vb (SMART)
- [ ] `GetStrings` entry added in FeatureFlag.vb (SMART)
- [ ] `Shared ReadOnly` declaration added in FeatureFlag.vb (SMART)
- [ ] Endpoint property added in Endpoint.vb (TAM) inside the correct subclass (or new subclass created)

## Manual Review Reminder

After all changes are verified in the checklist above, alert the user:

> **Please review and commit these changes manually.**
> Files modified:
>
> - `ASI.SMART/Foundation/TypedString/FeatureFlag.vb`
> - `ASI.TAM/Foundation/Services/Endpoint.vb`

Do NOT run `git commit`, `git add`, or `git push` — leave all changes for the user to review and commit manually.

## Step 8: Offer to Build

After all changes are made, ask the user if they want to build the two modified projects to verify the changes compile:

> Would you like me to build the ASI.SMART.Foundation and ASI.TAM.Foundation projects to verify the changes compile?

If the user says yes, build **ASI.SMART.Foundation first**, then **ASI.TAM.Foundation** (TAM depends on SMART). Do NOT build them in parallel.

**Windows (Git Bash):**

MSBuild switches (`/t:Build`, `/p:Configuration`) look like Unix paths to bash. Use this exact working pattern:

```bash
MSBUILD="/c/Program Files/Microsoft Visual Studio/2022/Enterprise/MSBuild/Current/Bin/MSBuild.exe" && "$MSBUILD" "{epic-root}\\ASI.SMART\\Foundation\\ASI.SMART.Foundation.vbproj" //t:Build //p:Configuration=Debug //verbosity:minimal
```

Then after SMART succeeds:

```bash
MSBUILD="/c/Program Files/Microsoft Visual Studio/2022/Enterprise/MSBuild/Current/Bin/MSBuild.exe" && "$MSBUILD" "{epic-root}\\ASI.TAM\\Foundation\\ASI.TAM.Foundation.vbproj" //t:Build //p:Configuration=Debug //verbosity:minimal
```

Key details:

- Use `//t:Build` not `/t:Build` (double slash prevents bash from treating it as a path)
- Use backslashes `\\` in the project path, not forward slashes
- Store the MSBuild path in a variable and invoke via `"$MSBUILD"`

**macOS/Linux:**

Use the `dotnet` CLI or `msbuild` if installed via Mono/.NET SDK:

```bash
dotnet build "{epic-root}/ASI.SMART/Foundation/ASI.SMART.Foundation.vbproj" -c Debug -v minimal
```

Then after SMART succeeds:

```bash
dotnet build "{epic-root}/ASI.TAM/Foundation/ASI.TAM.Foundation.vbproj" -c Debug -v minimal
```

If `dotnet` is not available, ask the user how they build the projects on their system.

**Both platforms:**

- Set a **5 minute timeout** on each build command — these projects are large
- Warnings (like `BC42304` or `BC40000`) are normal and expected — only errors indicate a problem

If a build fails, show the error output and offer to help diagnose the issue. Common causes include typos in the flag name, missing commas in `GetStrings`, or incorrect indentation in VB code.
