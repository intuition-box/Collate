# Collate Poster Copy

Short, layout-ready copy for community tutorials, carousels, and posters. Pair each numbered step with a screenshot of the matching Collate screen.

## Shared Cover

**Create with clarity. Publish with confidence.**

Build Intuition atoms and lists one at a time, in batches, or from CSV. Every Collate flow lets you prepare, review, and publish only what is ready.

**Prepare -> Review -> Publish -> Confirm**

## Poster 1: Create One Atom

**One idea. One atom. No guesswork.**

1. Open **Create -> Atom creation -> Single atom**.
2. Choose **Unchained types** or **Classic**.
3. Choose the atom type and complete its required fields.
4. Select **Review atom** and inspect existing or same-name matches.
5. Connect your wallet and select **Publish atom**.
6. Confirm the transaction.

**Tip:** If the correct atom already exists, reuse it instead of creating a duplicate.

## Poster 2: Create Batch Atoms

**More atoms. One clear review.**

1. Open **Create -> Atom creation -> Batch atoms**.
2. Choose **Unchained types** or **Classic**.
3. Choose a type and complete the fields for each row.
4. Use **+ Add atom** for more rows.
5. Select **Review atoms** and inspect duplicate or same-name matches.
6. Confirm the eligible rows.
7. Select **Publish eligible atoms** and approve one transaction.

**Only ready rows are published. Existing, duplicate, and invalid rows stay out.**

## Poster 3: Create Atoms From CSV

**Turn a spreadsheet into reviewed atoms.**

1. Open **Create -> Atom creation -> CSV import**.
2. Choose **Unchained types** or **Classic CSV**.
3. For Unchained, choose a classification and download its exact sample.
4. For Classic, download the basic or schema-aware sample.
5. Add one atom per row and export as CSV.
6. Upload the file or paste CSV text.
7. Preview names, fields, errors, and any Classic image previews.
8. Review existing, duplicate, and same-name atoms.
9. Publish the eligible rows in one transaction.

Basic format:

```csv
name,description,url,image_url,deposit
```

Unchained Person example:

```csv
classification,givenName,familyName,sameAs,deposit
person,Alex,Rivera,https://example.com/alex,0
```

**CSV tip:** Every Unchained classification has its own on-screen example and downloadable CSV. Keep headers unique and quote values containing commas.

**Network note:** Unchained publishing starts on Testnet. Classic CSV is available on Mainnet and Testnet.

## Poster 4: Add One List Member

**Choose the list. Choose the member. Create the connection.**

1. Open **Create -> Lists -> Manual lists**.
2. Search for and select the list atom.
3. Create the list atom in the modal if it is missing.
4. Search for and select one member atom.
5. Create the member atom in its modal if needed.
6. Select **Review list entries**.
7. Publish the missing entry and confirm.

**If the member is already in the list, Collate skips it.**

## Poster 5: Add Batch List Members

**Build one list with many members.**

1. Open **Create -> Lists -> Manual lists**.
2. Select or create the list atom.
3. Select the first member atom.
4. Use **+ Add member** for every additional member.
5. Check each selected atom's details.
6. Review all list entries.
7. Publish all eligible relationships in one transaction.

**Existing and repeated members are never submitted.**

## Poster 6: Add List Members From CSV

**Resolve first. Add to the list second.**

1. Open **Create -> Lists -> CSV import**.
2. Select or create the list atom first.
3. Prepare one existing member atom per CSV row.
4. Copy each atom's exact name and exact description.
5. Upload the CSV or paste its text.
6. Preview the parsed rows.
7. Review matches against the knowledge graph.
8. Inspect and choose the correct atom for ambiguous rows.
9. Remove missing or invalid rows.
10. Publish only the eligible list entries.

Recommended format:

```csv
member,description
Ethereum,A decentralized open-source blockchain system
```

**Important:** The description should match the existing atom exactly, especially when several atoms share the same name.

## Poster 7: Understand Review States

**Know what will happen before you sign.**

- **Ready to create:** eligible for publishing.
- **Ready with matches:** eligible, with same-name alternatives available to inspect.
- **Existing:** the atom is already on the graph.
- **Skip existing:** the list entry already exists.
- **Blocked duplicate:** repeated inside the current batch.
- **Ambiguous:** choose the correct existing atom.
- **Missing:** no existing member atom was found.
- **Invalid:** required data is missing or malformed.

**Collate publishes eligible rows only.**

## Closing Poster

**From one atom to a full CSV batch.**

Prepare your data. Review every result. Publish without surprises.

**Create with Collate.**
