# Collate Creation Guide

Create Intuition atoms and list entries with a review-first workflow. Collate shows what is ready, what already exists, and what needs attention before you approve a transaction.

## Before You Start

1. Open Collate and choose **Mainnet** or **Testnet** in the top navigation.
2. Use Testnet while learning or testing a new CSV.
3. Have a compatible wallet available. You can prepare and review without connecting, but publishing requires a connected wallet on the selected network.
4. Make sure the wallet has enough of the network's native token for the protocol deposit and transaction fee.
5. Remember the shared flow: **Prepare -> Review -> Publish -> Confirm**.

## 1. Create One Atom

Use this when you need one atom. Unchained offers 37 canonical primitive types; Classic preserves the older five atom shapes and image uploads.

1. Open **Create**.
2. Choose **Atom creation**, then **Single atom**.
3. Choose **Unchained types** or **Classic**. Unchained is the primary path; use Classic when you specifically need an image upload or an older atom shape.
4. In Unchained, choose one of the 37 primitive types and complete its required fields. The form changes to match the selected primitive exactly.
5. In Classic, choose Thing, Person, Organization, Account, or Raw URI/data. Add a description, URL, image, and initial support when relevant.
6. Classic searches for existing atoms while you type. Unchained compares exact IDs and same-name graph atoms during review.
7. Select **Review atom**.
8. Read the result:
   - `ready_to_create` means the atom can be created.
   - `existing` means the atom is already on the selected network.
   - `ambiguous` means same-name atoms need comparison before creating another.
   - `invalid` explains which value needs to be fixed.
9. For an Unchained `ambiguous` result, compare the existing atoms and explicitly approve a distinct atom only when intended, then review again.
10. Connect your wallet and confirm it is on the selected network.
11. Select **Publish atom**, approve the transaction, and wait for confirmation.

If you edit the form after reviewing, review it again before publishing.

## 2. Create Multiple Atoms

Use this when you have several atoms to create but do not need a spreadsheet.

1. Open **Create**.
2. Choose **Atom creation**, then **Batch atoms**.
3. Choose **Unchained types** or **Classic**. Each Unchained row can use a different one of the 37 primitives; each Classic row can use one of the established five types.
4. Complete the first two atom rows. The required fields adapt to the type selected for each row.
5. Select **+ Add atom** to add more rows.
6. In Classic, use the live lookup results to identify atoms that may already exist. Unchained performs canonical and same-name checks during review.
7. Remove unwanted rows before review. Do not intentionally add the same atom twice.
8. Select **Review atoms**.
9. Check every row in the review table:
   - `ready_to_create` rows are eligible.
   - `existing` rows are already on the graph.
   - `blocked_duplicate` rows repeat another atom in this batch.
   - `invalid` rows contain missing or malformed data.
10. Confirm that the eligible count matches the rows you expect to create.
11. Connect your wallet on the selected network.
12. Select **Publish eligible atoms** and approve the single batch transaction.
13. Wait for confirmation before clearing or leaving the form.

Only eligible rows enter the transaction. Existing, duplicate, and invalid rows stay out of it.

## 3. Create Atoms From CSV

Use this for larger, repeatable, or spreadsheet-based atom uploads. An import supports up to 50 atom rows at a time. The CSV import screen now has two formats: **Unchained types** for canonical classification data, and **Classic CSV** for existing files and image-rich atoms. Do not treat their columns as interchangeable.

For now, **Unchained publishing is available on Testnet only** while the new atoms' graph display is checked. Classic creation remains available on both networks.

### Build an Unchained Atom CSV

1. Open **Create -> Atom creation -> CSV import -> Unchained types**.
2. Choose the classification, such as Thing, Person, Book, Software, or Ethereum Account.
3. Read the **Sample CSV** box. It shows the actual fields for that classification, including which columns the file needs.
4. Select **Download [type] sample** to get that same CSV as a file, or select **Use this sample** to put it in the editor.
5. Replace the example values with your own. Keep `classification` and the exact field headers. `deposit` is optional support, not part of the atom's identity.

For example, the Unchained Person format uses two name fields:

```csv
classification,givenName,familyName,sameAs,deposit
person,Alex,Rivera,https://example.com/alex,0
```

Each of the 37 classifications has its own sample and download. A file can also mix classifications: combine the needed field columns, set `classification` on each row, and leave fields from other types blank. A row without a classification uses the type selected in the app. Separate multiple `sameAs` URLs with `|`. Unsupported populated columns produce row errors rather than being dropped.

The new canonical formats do **not** automatically accept Classic columns such as `image_url`. If the selected classification has no image or description field, do not add one to its CSV. Use Classic CSV when an attached image or older atom shape is required.

### Build a Classic Basic Atom CSV

Use the basic format when every row uses the same atom type:

```csv
name,description,url,image_url,deposit
Knowledge Garden,A shared place for ideas,https://example.com,https://example.com/image.jpg,0
Open Data Builders,A community for open knowledge,https://example.org,,0
```

Choose the shared type with **Default schema type** after loading the file.

### Build a Classic Schema-Aware Atom CSV

Use this format when rows have different atom types:

```csv
schema_type,name,description,url,image_url,deposit,email,identifier,chain_id,account_address,raw_data
Thing,Knowledge Garden,A shared place for ideas,https://example.com,https://example.com/image.jpg,0,,,,,
Person,Ada Builder,An open knowledge contributor,https://example.org/ada,,0,ada@example.org,ada-builder,,,
Account,,,,,0,,,1,0x0000000000000000000000000000000000000000,
Raw,,,,,0,,,,,ipfs://bafkrei...
```

CSV rules:

- Keep every header unique.
- Thing, Person, and Organization rows require `name`.
- Account rows require a valid `account_address` and positive `chain_id`.
- Raw rows require `raw_data`.
- Use public HTTPS links for `url` and `image_url`.
- Leave optional cells blank rather than removing their columns.
- Wrap a value in double quotes if it contains a comma.
- A row-level `schema_type` overrides the selected default type.

### Upload, Review, and Publish

1. Open **Create -> Atom creation -> CSV import**.
2. Choose **Unchained types** or **Classic CSV**. For Unchained, select a classification and use its matching on-screen sample and download. For Classic, select **Download sample** for a basic or schema-aware template.
3. Edit the sample in a spreadsheet and export it as a `.csv` file.
4. In Unchained, the selected classification is the default for rows without a `classification` value. In Classic, **Default schema type** applies to rows without `schema_type`.
5. Select **Upload CSV file**, or paste raw CSV text into the large input.
6. Select **Preview CSV rows**.
7. Check every parsed name, classification or schema, value, and row error. Classic files also show image previews. Correct the source CSV or pasted text before previewing again.
8. Select **Review atoms** to validate the prepared atoms and check the selected network for existing atoms. Unchained reviews also surface same-name graph atoms for comparison.
9. Confirm which rows are `ready_to_create`, `existing`, `blocked_duplicate`, `ambiguous`, or `invalid`. For an Unchained `ambiguous` row, open the same-name comparison and explicitly approve creating a distinct atom only if that is truly intended; review again afterward.
10. Connect your wallet on the selected network.
11. Publish eligible atoms and approve one transaction containing only eligible rows.
12. Wait for confirmation and verify the transaction link.

## Understanding Lists

A list operation uses two kinds of atoms:

- The **list atom** represents the list itself, such as "Favorite Protocols" or "Open Data Communities."
- A **member atom** is an existing atom being added to that list.

Publishing creates the list relationship. It does not recreate atoms that have already been selected.

## 4. Add One Member to a List

1. Open **Create**.
2. Choose **Lists**, then **Manual lists**.
3. Start typing in **List atom**. Search runs automatically.
4. Select the correct existing list atom after checking its description and other details.
5. If the list atom does not exist, select the create suggestion. Complete, review, and publish the new atom in the modal. Collate selects it as the list atom after confirmation.
6. In **Member 1**, type the member atom's name.
7. Inspect the automatic search results and select the correct atom. Use its description, image, and type to distinguish same-name results.
8. If the member atom does not exist, use the create option in that row and publish it through the modal first.
9. Select **Review list entries**.
10. Read the result:
    - `ready_to_create` means the list relationship is missing and can be published.
    - `skip_existing` means the atom is already a member of this list.
    - `invalid` means a required selection is missing.
11. Connect your wallet on the selected network.
12. Select **Publish eligible list entries**, approve the transaction, and wait for confirmation.

## 5. Add Multiple Members to a List

The same **Manual lists** screen handles one member or a batch of members.

1. Open **Create -> Lists -> Manual lists**.
2. Search for and select the list atom, or create it in the modal if it does not exist.
3. Search for and select the first member atom.
4. Select **+ Add member** for every additional member.
5. Search and select one existing atom in each row. Create a missing member through its modal when necessary.
6. Check that every selected card represents the intended atom, especially when names repeat.
7. Remove accidental or unwanted rows.
8. Select **Review list entries**.
9. Check the review table:
   - `ready_to_create` entries are eligible.
   - `skip_existing` entries are already in the list.
   - `blocked_duplicate` entries repeat a selected member in this batch.
   - `invalid` entries are incomplete.
10. Confirm the eligible count.
11. Connect your wallet on the selected network.
12. Select **Publish eligible list entries** and approve one transaction for all eligible relationships.

## 6. Add List Members From CSV

Use this when your member list already exists in a spreadsheet. Collate resolves every row against atoms that already exist on the selected network. An import supports up to 50 member rows.

### Select or Create the List Atom

1. Open **Create -> Lists -> CSV import**.
2. Search for the list atom before loading the CSV.
3. Select the correct existing atom.
4. If it does not exist, use the create suggestion to open the modal. Create and publish the list atom there; Collate selects it automatically after confirmation.

### Build the List CSV

Recommended format:

```csv
member,description
Ethereum,A decentralized open-source blockchain system
Base,A secure low-cost builder-friendly Ethereum L2
```

CSV rules:

- Put one existing member atom on each row.
- `member` should match the existing atom's name. `name`, `atom`, `label`, or `subject` are accepted alternatives.
- Copy the existing atom's description **exactly** into `description`. Do not write a new summary.
- Exact descriptions are especially important when several atoms share the same name.
- A unique exact name may resolve without a description, but including the exact description is the safest format.
- If a value contains a comma, wrap it in double quotes.
- Missing member atoms are blocked in this CSV flow. Create them through **Atom creation** first, then review the CSV again.

### Upload, Resolve, and Publish

1. Select **Download sample** if you need a starter list CSV.
2. Replace the examples with existing atom names and their exact descriptions.
3. Export the spreadsheet as a `.csv` file.
4. Select **Upload CSV file**, or paste CSV text into the large input.
5. Select **Preview CSV rows**.
6. Check the parsed member names, descriptions, line numbers, and row errors.
7. Select **Review list entries**.
8. Read and resolve the statuses:
   - `ready_to_create` is safely resolved and eligible.
   - `ready_with_matches` is safely resolved by description and eligible, but same-name alternatives remain available to inspect.
   - `skip_existing` is already in the selected list.
   - `blocked_duplicate` repeats the same resolved member in this CSV batch.
   - `ambiguous` has several possible atoms and needs a manual choice.
   - `missing` could not be matched to an existing atom.
   - `invalid` contains missing or malformed CSV data.
9. For an ambiguous row, open the candidate details and compare image, full description, type, URL, creator, and other available metadata.
10. Select **Use this atom** only when you are confident it is the intended member.
11. Remove unresolved, missing, invalid, or unwanted rows if they should not remain in the batch.
12. Review again after changing a selection.
13. Confirm the eligible count, connect your wallet on the selected network, and select **Publish eligible list entries**.
14. Approve the single transaction and wait for confirmation.

Only `ready_to_create` and `ready_with_matches` rows are eligible for publishing.

## Final Transaction Checklist

Before signing any Collate transaction, confirm:

- The selected network is correct.
- The connected wallet is on that network.
- The list atom is correct for list operations.
- Every eligible row is intended.
- Existing, skipped, duplicate, ambiguous, missing, and invalid rows are understood.
- The eligible count matches what you expect to create.
- The wallet transaction targets the expected network and shows a reasonable value.

After confirmation, use the transaction link to verify the write in the network explorer.
