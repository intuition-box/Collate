# Collate Creation Guide

Collate helps you create Intuition atoms and build lists without sending anything to your wallet blindly. Every flow follows the same simple order:

**Prepare → Review → Publish → Confirm**

You can fill forms and review results without connecting a wallet. Your wallet is only needed when you are ready to publish.

## Before You Start

1. Choose **Mainnet** or **Testnet** in the top navigation.
2. Use **Testnet** while learning, trying a new atom type, or testing a CSV for the first time.
3. Make sure your wallet supports the selected network and has enough of its native token for the creation cost and transaction fee.
4. Do not switch networks after reviewing. If you do, review again before publishing.
5. Check the eligible count before approving any wallet transaction.

## Understanding Atom Formats

Collate offers two atom formats.

### Classic

Classic is the primary format for new atoms. Use it for the familiar Thing, Person, Organization, Account, or Raw URI/data formats and richer metadata such as descriptions, URLs, and uploaded images.

Classic publishing is available on **Mainnet and Testnet**.

### Unchained Types · Early Access

Unchained includes 37 structured types such as Person, Company, Book, Software, Article, Location, Ethereum Account, and many more.

Each type has its own fields. For example, Person asks for a given name and family name, while Ethereum Account asks for an address. Collate changes the form or CSV sample to match the type you select.

Unchained publishing is currently available on **Testnet** while its alpha packages and live graph display continue to be validated.

## 1. Create One Atom

Use this flow when you only need one atom.

### Step by Step

1. Open **Create → Atom creation → Single atom**.
2. Start with **Classic**, or choose **Unchained types · Early access** for a structured Testnet atom.
3. Choose the atom type.
4. Complete every required field marked with an asterisk.
5. Add optional details only when they genuinely describe the atom.
6. Select **Review atom**.
7. Read the result and correct anything that needs attention.
8. Connect your wallet and confirm it is on the selected network.
9. Select **Publish atom**.
10. Approve the wallet transaction and wait for the confirmation message.

### What Review May Show

- **Ready to create:** the atom passed review and can be published.
- **Existing:** this exact atom is already on the selected network. Reuse it instead of creating it again.
- **Ambiguous:** atoms with the same name already exist. Open the comparison and inspect their descriptions and other details.
- **Invalid:** a required value is missing or incorrectly formatted. Correct the form and review again.

For an ambiguous Unchained atom, choose **I checked, create a distinct atom** only when your atom is genuinely different from the existing options. Collate will ask you to review once more before publishing.

### Classic Images

Classic atoms can use an image in either of these ways:

- Select **Upload image** and choose a file from your device.
- Paste a public HTTPS image link and select **Import URL**.

Wait for the image to finish processing before reviewing the atom.

## 2. Create a Batch of Atoms

Use Batch atoms when you have several atoms to create but do not need a spreadsheet.

### Step by Step

1. Open **Create → Atom creation → Batch atoms**.
2. Start with **Classic**, or choose **Unchained types · Early access** for a structured Testnet batch.
3. Complete the first two atom rows.
4. Choose the correct type for each row. Different rows can use different types.
5. Select **+ Add atom** whenever you need another row.
6. Remove unwanted rows before review.
7. Select **Review atoms**.
8. Check the status and cost of every row.
9. Confirm that the eligible count matches the atoms you intend to create.
10. Connect your wallet on the selected network.
11. Select **Publish eligible atoms** and approve one transaction.
12. Wait for confirmation before clearing the form or leaving the page.

### Batch Safety

Collate never submits every row automatically. It only includes rows marked **Ready to create**.

- Existing atoms stay out of the transaction.
- Repeated atoms inside the batch are marked **Blocked duplicate** and stay out.
- Ambiguous and invalid atoms stay out until you resolve them.
- A batch can still be published when some rows are blocked, as long as at least one row is eligible.

## 3. Create Atoms From CSV

Use CSV import for larger uploads, reusable spreadsheets, or data prepared by a team. Each import supports up to 50 atom rows.

You can upload a `.csv` file or paste CSV text directly into Collate.

### Start With a Collate Sample

Do not build the CSV from memory.

1. Open **Create → Atom creation → CSV import**.
2. Start with **Classic CSV**, or choose **Unchained types · Early access** for a structured Testnet file.
3. Download the matching sample.
4. Open the sample in your spreadsheet app.
5. Keep the header row unchanged unless you understand the additional supported fields.
6. Replace the example data with your own.
7. Export or download the finished spreadsheet as a `.csv` file.

### Classic Basic CSV

Use the basic template when every row uses the same Classic type. Choose that shared type with **Default schema type** in Collate.

```csv
name,description,url,image_url,deposit
Knowledge Garden,A shared place for ideas,https://example.com,https://example.com/image.jpg,0
Open Data Builders,A community for open knowledge,https://example.org,,0
```

### Classic Mixed-Type CSV

Use the schema-aware template when one file contains different Classic types.

```csv
schema_type,name,description,url,image_url,deposit,email,identifier,chain_id,account_address,raw_data
Thing,Knowledge Garden,A shared place for ideas,https://example.com,https://example.com/image.jpg,0,,,,,
Person,Ada Builder,An open knowledge contributor,https://example.org/ada,,0,ada@example.org,ada-builder,,,
Account,,,,,0,,,1,0x0000000000000000000000000000000000000000,
Raw,,,,,0,,,,,ipfs://bafkrei...
```

### Unchained CSV · Early Access

Every Unchained type has its own preview and downloadable sample. Choose the type first, then use the sample shown for that type.

Example Person CSV:

```csv
classification,givenName,familyName,sameAs,deposit
person,Ada,Lovelace,https://example.com/ada,0
```

What the columns mean:

- `classification` tells Collate which type the row uses.
- The middle columns are the fields supported by that type.
- `sameAs` can link to a public page about the atom. Put multiple links on separate lines in the form, or separate them with `|` in CSV.
- `deposit` is optional initial support. Use `0` when you do not want to add extra support.

A CSV can contain several Unchained types. Add the fields needed by those types, set `classification` on every row, and leave unrelated cells blank. Starting with one type per file is easier for first-time users.

Do not add Classic-only columns such as `image_url` to an Unchained type that does not support them. Use Classic CSV when uploaded images are important.

### CSV Rules That Prevent Most Errors

- Keep every column header unique.
- Keep required cells filled.
- Use public HTTPS links for web pages and images.
- Leave optional cells blank instead of deleting their columns.
- Put quotation marks around a value containing a comma.
- Do not add extra values after the final header.
- Use one atom per row.
- Start with a small Testnet file before uploading a large batch.

### Upload, Preview, Review, and Publish

1. Select **Upload CSV file**, or paste CSV text into the large input.
2. Select **Preview CSV rows**.
3. Confirm that every row, type, field, and image preview was read correctly.
4. Fix row errors in the source file or pasted text, then preview again.
5. Select **Review atoms**.
6. Inspect existing atoms, repeated rows, and same-name matches.
7. Resolve ambiguous rows only when you are confident the new atom is distinct.
8. Confirm the eligible count.
9. Connect your wallet on the selected network.
10. Select **Publish eligible atoms** and approve one transaction.
11. Wait for confirmation and open the transaction link if you want to verify it in the explorer.

## Understanding Lists

A Collate list uses two kinds of atoms:

- The **list atom** represents the list itself, such as “Favorite Protocols” or “Open Data Communities.”
- A **member atom** is an existing atom that you want to add to the list.

Publishing a list entry creates the connection between those atoms. It does not recreate either atom.

## 4. Add One Member to a List

### Step by Step

1. Open **Create → Lists → Manual lists**.
2. Start typing the name of the list atom. Search begins automatically.
3. Inspect the results and select the correct list atom.
4. If it does not exist, choose the create suggestion. Complete and publish the atom in the modal. Collate will select it as the list atom after confirmation.
5. In the first member row, start typing the member atom’s name.
6. Inspect the search results and select the correct existing atom.
7. Use the description, image, and type to distinguish atoms with the same name.
8. If the member atom is missing, create it through the member-row modal first.
9. Select **Review list entries**.
10. Confirm that the entry is ready and is not already part of the list.
11. Connect your wallet on the selected network.
12. Select **Publish eligible list entries** and approve the transaction.

The review button remains unavailable until both the list atom and a member atom are selected.

## 5. Add Several Members to a List

The Manual lists screen can handle one member or a full batch.

### Step by Step

1. Open **Create → Lists → Manual lists**.
2. Search for and select the list atom, or create it through the modal.
3. Search for and select the first member atom.
4. Select **+ Add member** for every additional member.
5. Select one existing atom in each row.
6. Check each selected card carefully when names repeat.
7. Remove accidental or unwanted rows.
8. Select **Review list entries**.
9. Check every result and the total eligible count.
10. Connect your wallet on the selected network.
11. Select **Publish eligible list entries** and approve one transaction for all eligible entries.

### What Review May Show

- **Ready to create:** this member can be added.
- **Skip existing:** this member is already in the list and will not be submitted again.
- **Blocked duplicate:** the same member was selected more than once in this batch.
- **Invalid:** the row is incomplete.

## 6. Add List Members From CSV

Use CSV list import when the member atoms already exist and your list is prepared in a spreadsheet. Each import supports up to 50 rows.

### Select or Create the List Atom First

1. Open **Create → Lists → CSV import**.
2. Start typing the list atom’s name.
3. Select the correct existing atom.
4. If it does not exist, choose the create suggestion and publish it through the modal.
5. Confirm that the new or selected list atom appears before reviewing the CSV.

Collate cannot review list entries until a list atom has been selected.

### Prepare the List CSV

Download the sample from Collate, then replace the examples with your own members.

Recommended format:

```csv
member,description
Ethereum,A decentralized open-source blockchain system
Base,A secure low-cost builder-friendly Ethereum L2
```

For each row:

- `member` should match the existing atom’s name.
- `description` should match the existing atom’s description exactly.
- Copy the description from the atom you want to use. Do not write a new summary.
- Exact descriptions are especially important when several atoms share the same name.
- Put quotation marks around descriptions containing commas.

A unique name may resolve without a description, but including the exact description is the safest approach.

CSV list import does not create missing member atoms. Create missing atoms through **Atom creation** first, then return to the list CSV.

### Upload, Resolve, and Publish

1. Upload the `.csv` file or paste its text.
2. Select **Preview CSV rows**.
3. Check the member names, descriptions, line numbers, and row errors.
4. Select **Review list entries**.
5. Inspect the result for every row.
6. For an ambiguous row, open the candidate details and compare the image, description, type, URL, and creator information.
7. Choose **Use this atom** only when you are confident it is the intended member.
8. Remove unresolved, missing, invalid, or unwanted rows when they should not remain in the batch.
9. Review again after changing a selection.
10. Confirm the eligible count.
11. Connect your wallet on the selected network.
12. Select **Publish eligible list entries** and approve one transaction.

### CSV List Review Results

- **Ready to create:** safely matched and eligible.
- **Ready with matches:** safely matched by description and eligible, with same-name alternatives available to inspect.
- **Skip existing:** already part of the selected list.
- **Blocked duplicate:** resolves to the same member as another CSV row.
- **Ambiguous:** several atoms could match and you must choose one.
- **Missing:** no existing atom was found.
- **Invalid:** required CSV information is missing or malformed.

Only **Ready to create** and **Ready with matches** rows are published.

## Before You Sign

Confirm all of the following:

- The selected network is correct.
- Your wallet is connected to that same network.
- The list atom is correct when creating list entries.
- Every eligible atom or member is intentional.
- Existing, skipped, repeated, ambiguous, missing, and invalid rows make sense to you.
- The eligible count matches what you expect to publish.

After confirmation, use the transaction link to verify the result in the network explorer.
