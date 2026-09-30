import type { CreateFlowId } from '@/lib/navigation/create-flow';

export const HOW_IT_WORKS_GUIDE_IDS = [
  'single-atom',
  'batch-atoms',
  'csv-atoms',
  'single-list',
  'batch-lists',
  'csv-lists',
] as const;

export type HowItWorksGuideId = (typeof HOW_IT_WORKS_GUIDE_IDS)[number];
export type GuideCategory = 'atoms' | 'lists';
export type GuideVisualKind = HowItWorksGuideId;
export type GuideStepAction = 'atom-csv-templates' | 'list-csv-template';

export type HowItWorksGuide = {
  id: HowItWorksGuideId;
  category: GuideCategory;
  title: string;
  badge?: string;
  shortDescription: string;
  summary: string;
  prerequisites: string[];
  steps: Array<{ title: string; description: string; emphasis?: string; action?: GuideStepAction }>;
  tips: string[];
  outcomes: Array<{ label: string; description: string }>;
  visual: GuideVisualKind;
  createFlow: CreateFlowId;
  csvExample?: string;
};

export const DEFAULT_HOW_IT_WORKS_GUIDE: HowItWorksGuideId = 'single-atom';

export const HOW_IT_WORKS_GUIDES: HowItWorksGuide[] = [
  {
    id: 'single-atom',
    category: 'atoms',
    title: 'Create one atom',
    shortDescription: 'Create one reviewed building block without unnecessary batch setup.',
    summary: 'Start with one idea, check whether it already exists, then publish the atom you actually intend to create.',
    prerequisites: [
      'Choose Mainnet or Testnet before you begin.',
      'Have the atom name and useful context ready.',
      'Connect your wallet only when you are ready to publish.',
    ],
    steps: [
      {
        title: 'Open the single atom workspace',
        description: 'Open Create, choose Atom creation, then select Single atom. Choose Mainnet or Testnet in the top navigation before entering anything so the lookup and transaction use the right network.',
      },
      {
        title: 'Choose Classic or Unchained',
        description: 'Classic opens by default and supports familiar image rich atoms such as Things, People, Organizations, and Accounts. Choose Unchained types Early access only when you need one of its structured types on Testnet.',
      },
      {
        title: 'Enter the atom details',
        description: 'Choose the type, enter the name and required fields, then add a clear description, URL, and image where available. Use details that will help people recognize this atom and distinguish it from similar results.',
      },
      {
        title: 'Check the existing atom lookup',
        description: 'For Classic atoms, watch the lookup below the form while you type. Inspect any matching names, descriptions, images, and links. If the atom you need already exists, reuse it instead of creating a duplicate.',
      },
      {
        title: 'Review the finished atom',
        description: 'Select Review atom. Collate validates the fields, prepares the metadata, estimates the cost, and checks for exact or same name atoms. Correct invalid fields or inspect uncertain matches before continuing.',
      },
      {
        title: 'Publish and wait for confirmation',
        description: 'Connect your wallet, confirm it is on the selected network, then select Publish atom. Approve the transaction and keep the page open until Collate confirms it and shows the explorer link.',
      },
    ],
    tips: [
      'Reuse the correct existing atom instead of creating a duplicate.',
      'Editing a reviewed field clears the review so the transaction cannot become stale.',
    ],
    outcomes: [
      { label: 'Ready to create', description: 'The atom can be published.' },
      { label: 'Existing', description: 'The exact atom is already available.' },
      { label: 'Ambiguous', description: 'Inspect same name atoms before continuing.' },
      { label: 'Invalid', description: 'Correct the highlighted field and review again.' },
    ],
    visual: 'single-atom',
    createFlow: 'single-atom',
  },
  {
    id: 'batch-atoms',
    category: 'atoms',
    title: 'Create batch atoms',
    shortDescription: 'Prepare several atoms and publish every eligible row together.',
    summary: 'Use a familiar form for each atom, review the complete batch, and keep existing or repeated rows out of the transaction.',
    prerequisites: [
      'Group the atoms you want to create on one network.',
      'Know the correct type and identifying details for each atom.',
      'Use CSV import instead when a spreadsheet is easier to maintain.',
    ],
    steps: [
      {
        title: 'Open the batch atom workspace',
        description: 'Open Create, choose Atom creation, then select Batch atoms. Choose the target network first because every eligible atom in this batch will be published there.',
      },
      {
        title: 'Choose a format and complete each row',
        description: 'Classic opens by default. Choose the correct type for each atom, then enter its name, required fields, and useful identifying details. If you choose Unchained Early access, select the structured type for every Testnet row.',
      },
      {
        title: 'Build the complete batch',
        description: 'Select Add atom for each additional item. Before reviewing, remove unwanted rows, confirm that every row describes a different atom, and make sure each image, URL, and description belongs to the correct row.',
      },
      {
        title: 'Review all atoms together',
        description: 'Select Review atoms. Collate validates every row, checks the graph for existing atoms, detects duplicates inside this batch, prepares eligible metadata, and calculates the estimated cost.',
      },
      {
        title: 'Inspect every status and the eligible count',
        description: 'Read each row instead of relying only on the total. Ready to create rows can publish. Existing, blocked duplicate, ambiguous, and invalid rows stay out. Confirm the eligible count matches exactly what you intend to create.',
      },
      {
        title: 'Publish the eligible atoms together',
        description: 'Connect your wallet on the selected network and select Publish eligible atoms. Approve the transaction once, then wait for Collate to confirm the batch before clearing or changing the form.',
      },
    ],
    tips: [
      'Different rows can use different Classic types or Unchained classifications.',
      'A batch can publish successfully even when some rows are blocked, provided at least one row is eligible.',
    ],
    outcomes: [
      { label: 'Ready to create', description: 'Included in the transaction.' },
      { label: 'Existing', description: 'Already on the selected network.' },
      { label: 'Blocked duplicate', description: 'Repeated inside this batch.' },
      { label: 'Invalid', description: 'Incomplete or incorrectly formatted.' },
    ],
    visual: 'batch-atoms',
    createFlow: 'batch-atoms',
  },
  {
    id: 'csv-atoms',
    category: 'atoms',
    title: 'Import atoms from CSV',
    badge: 'Best for bulk data',
    shortDescription: 'Turn a prepared spreadsheet into a reviewed atom batch.',
    summary: 'Start with Collate\'s sample, preview exactly how the file was read, then review the parsed atoms against the graph.',
    prerequisites: [
      'Use a CSV file with no more than 50 atom rows.',
      'Start from the downloadable sample for your chosen format.',
      'Use public HTTPS image links when a Classic row needs an image URL.',
    ],
    steps: [
      {
        title: 'Choose the atom CSV format',
        description: 'Open Create, choose Atom creation, then select CSV import. Use Classic CSV for image rich atoms on Mainnet or Testnet. Choose Unchained types Early access when you need a structured type file on Testnet.',
      },
      {
        title: 'Download and populate the right sample',
        description: 'Download the sample that matches the atoms you want to create. Keep its header row, then replace every example row with the real names, descriptions, URLs, image URLs, types, and other values you want written to the knowledge graph. Use one atom per row and delete any example rows you do not need.',
        emphasis: 'Your spreadsheet should contain the actual atom data you want Collate to create, not instructions, sample content, or placeholder values. For a large dataset, download the sample first, then give that file and your source data to an AI assistant to populate the rows faster. Check every field before uploading and do not let it invent facts, links, or images.',
        action: 'atom-csv-templates',
      },
      {
        title: 'Save, upload, or paste the CSV',
        description: 'Export the completed spreadsheet as a CSV file, then select Upload CSV file. You can also paste the complete CSV text into the large input. Uploading only loads the data into Collate; it does not publish anything.',
      },
      {
        title: 'Preview exactly what Collate parsed',
        description: 'Select Preview CSV rows. Compare every parsed name, type, field, and Classic image preview with your spreadsheet. If a row shows an error or the values appear in the wrong columns, correct the source file and preview it again.',
      },
      {
        title: 'Review the atoms against the graph',
        description: 'Select Review atoms. Collate validates required fields, checks for atoms that already exist, detects repeated rows in the file, and surfaces same name matches that need attention.',
      },
      {
        title: 'Confirm exactly what is eligible',
        description: 'Read every review status and confirm the eligible count. Only Ready to create rows enter the transaction. Existing, blocked duplicate, ambiguous, and invalid rows remain excluded.',
      },
      {
        title: 'Publish the reviewed CSV batch',
        description: 'Connect your wallet on the selected network and select Publish eligible CSV atoms for Classic or Publish eligible atoms for Unchained. Approve one transaction and wait for confirmation before changing the file or leaving the page.',
      },
    ],
    tips: [
      'Keep every header unique and leave optional cells blank rather than deleting required columns.',
      'Start with a small Testnet file when using a new template for the first time.',
    ],
    outcomes: [
      { label: 'Ready to create', description: 'Parsed and eligible to publish.' },
      { label: 'Existing', description: 'Already exists and stays out.' },
      { label: 'Blocked duplicate', description: 'Repeated in the imported file.' },
      { label: 'Invalid', description: 'The row explains what must be corrected.' },
    ],
    visual: 'csv-atoms',
    createFlow: 'csv-atoms',
    csvExample: 'name,description,url,image_url,deposit\nKnowledge Garden,A shared place for ideas,https://example.com,,0',
  },
  {
    id: 'single-list',
    category: 'lists',
    title: 'Add one list member',
    shortDescription: 'Connect one existing member atom to the right list atom.',
    summary: 'Choose the atom representing the list, choose one member, then review whether that relationship still needs to be created.',
    prerequisites: [
      'Know which atom represents the destination list.',
      'Search for the existing member atom by name.',
      'Use descriptions and images when several atoms share a name.',
    ],
    steps: [
      {
        title: 'Open the manual list workspace',
        description: 'Open Create, choose Lists, then select Manual lists. Choose the network that contains the list and member atoms you want to use.',
      },
      {
        title: 'Find or create the list atom',
        description: 'Type the list name in the List atom field. Search runs automatically, so inspect the results and select the atom that represents the destination list. If it does not exist, use the create suggestion and publish it in the modal.',
      },
      {
        title: 'Find the member atom',
        description: 'In the first member row, type the member name and select the intended existing atom. When several results share a name, compare their descriptions, images, types, and URLs before choosing.',
      },
      {
        title: 'Create a missing member when necessary',
        description: 'If no correct member exists, choose Create atom in the member row. Complete and publish the atom in the modal. After confirmation, Collate selects it as the member without taking you away from the list flow.',
      },
      {
        title: 'Review the list relationship',
        description: 'Select Review list entries. Collate checks whether this exact member is already connected to the selected list. Ready to create means a new entry is needed; Skip existing means there is nothing to submit.',
      },
      {
        title: 'Publish and confirm the entry',
        description: 'Connect your wallet on the selected network and select Publish eligible list entries. Approve the transaction, then keep the page open until Collate confirms that the member was added.',
      },
    ],
    tips: [
      'Selecting an atom does not recreate it. Publishing creates the list relationship.',
      'The review button remains disabled until both a list atom and a member atom are selected.',
    ],
    outcomes: [
      { label: 'Ready to create', description: 'The member can be added.' },
      { label: 'Skip existing', description: 'The member is already in the list.' },
      { label: 'Invalid', description: 'A list or member selection is missing.' },
    ],
    visual: 'single-list',
    createFlow: 'manual-lists',
  },
  {
    id: 'batch-lists',
    category: 'lists',
    title: 'Add several list members',
    shortDescription: 'Review several member relationships and publish the missing ones together.',
    summary: 'Select one destination list, collect the existing member atoms, and create every missing list entry in one transaction.',
    prerequisites: [
      'Choose or create one atom representing the list.',
      'Know the member atoms you want to add.',
      'Check descriptions carefully when atom names repeat.',
    ],
    steps: [
      {
        title: 'Open Manual lists and choose the network',
        description: 'Open Create, choose Lists, then select Manual lists. Choose the network that already contains the list and member atoms for this batch.',
      },
      {
        title: 'Select or create the destination list',
        description: 'Type the list name in the List atom field and select the correct result from the automatic search. If it does not exist, create and publish it through the modal. This one list applies to every member row below.',
      },
      {
        title: 'Select the first existing member',
        description: 'Type in the first member row and choose the intended atom from the search results. Inspect its metadata carefully when multiple atoms have the same name.',
      },
      {
        title: 'Add and complete the remaining rows',
        description: 'Select Add member for each additional list member, then search for and select one existing atom in every row. If a member does not exist, create it through that row\'s modal and return to the batch.',
      },
      {
        title: 'Clean up the batch before review',
        description: 'Check that every selected atom belongs in this list, remove any unwanted rows, and make sure you have not selected the same member more than once.',
      },
      {
        title: 'Review every list entry',
        description: 'Select Review list entries. Collate checks whether each relationship already exists, detects repeated members in this batch, and marks incomplete rows as invalid.',
      },
      {
        title: 'Confirm and publish the missing entries',
        description: 'Read every status and confirm the eligible count. Ready to create rows will be submitted; Skip existing, blocked duplicate, and invalid rows will not. Select Publish eligible list entries and approve one transaction for the eligible rows.',
      },
    ],
    tips: [
      'The selected list atom applies to every member row in the batch.',
      'Existing and repeated relationships never enter the publish payload.',
    ],
    outcomes: [
      { label: 'Ready to create', description: 'Included in the transaction.' },
      { label: 'Skip existing', description: 'Already belongs to the list.' },
      { label: 'Blocked duplicate', description: 'The same member was selected twice.' },
      { label: 'Invalid', description: 'The member row is incomplete.' },
    ],
    visual: 'batch-lists',
    createFlow: 'manual-lists',
  },
  {
    id: 'csv-lists',
    category: 'lists',
    title: 'Import list members from CSV',
    badge: 'Best for bulk data',
    shortDescription: 'Resolve spreadsheet rows to existing atoms before adding them to a list.',
    summary: 'Select the destination list first. Every CSV row must identify an atom that already exists on the selected network before Collate can add it as a member.',
    prerequisites: [
      'Select or create the destination list atom first.',
      'Use a CSV with no more than 50 member rows.',
      'Copy each member atom\'s exact name and exact description as they appear on the graph.',
    ],
    steps: [
      {
        title: 'Select or create the destination list',
        description: 'Open Create, choose Lists, then select CSV import. Type in the List atom field and choose the correct existing result, or create and publish the list atom through the modal. Review remains unavailable until a list atom is selected.',
      },
      {
        title: 'Download the sample and enter existing members',
        description: 'Download the list CSV sample. Add one member per row, replacing the examples with the actual atoms you want to add to the selected list, then delete any sample rows you do not need.',
        emphasis: 'Copy each atom\'s exact name and exact description from its existing graph record. The name finds matching atoms, and the description identifies the correct one when several atoms share that name. For a large set, download the sample first, then give that file and the copied graph records to an AI assistant to populate it. It must not rewrite or invent the names and descriptions, so verify every row before uploading.',
        action: 'list-csv-template',
      },
      {
        title: 'Save, upload, or paste the CSV',
        description: 'Export the completed spreadsheet as a CSV file, then select Upload CSV file. You can also paste the complete CSV text into the input. Confirm that the selected list atom is still the destination you intended.',
      },
      {
        title: 'Preview the member rows',
        description: 'Select Preview CSV rows. Check every line number, member name, and description against the spreadsheet, and correct any parsing error before continuing. This step confirms that Collate read the file; it does not resolve the atoms yet.',
      },
      {
        title: 'Resolve the rows against existing atoms',
        description: 'Select Review list rows. Collate searches for existing atoms with each exact name and compares their descriptions. A clear match is selected automatically; several possible matches leave the row waiting for your decision.',
      },
      {
        title: 'Inspect ambiguous, missing, or existing rows',
        description: 'For an ambiguous row, open each candidate\'s details and select Use this atom for the correct one. If a row is Missing, create that atom from Atom creation, then return and review the CSV again. Skip existing means that member is already in the list and needs no new transaction.',
      },
      {
        title: 'Review again and confirm eligibility',
        description: 'Review the list again after changing a candidate or correcting the CSV. Confirm that Ready to create and Ready with matches rows are the members you intend to add. Ambiguous, missing, existing, duplicate, and invalid rows stay excluded.',
      },
      {
        title: 'Publish the eligible list entries',
        description: 'Connect your wallet on the selected network and select Publish eligible list entries. Approve one transaction containing only the eligible members, then wait for Collate to confirm the result.',
      },
    ],
    tips: [
      'Copy the existing atom\'s name and description. Do not write a new description.',
      'A CSV row cannot create a new member atom.',
      'CSV list import does not create missing member atoms. Create them first, then review the CSV again.',
    ],
    outcomes: [
      { label: 'Ready to create', description: 'Resolved and eligible.' },
      { label: 'Ready with matches', description: 'Safely resolved with alternatives to inspect.' },
      { label: 'Ambiguous', description: 'Choose one candidate manually.' },
      { label: 'Missing', description: 'No existing member atom was found.' },
    ],
    visual: 'csv-lists',
    createFlow: 'csv-lists',
    csvExample: 'member,description\nEthereum,A decentralized open source blockchain system\nBase,A secure low cost builder friendly Ethereum L2',
  },
];

export function parseHowItWorksGuide(value: string | string[] | undefined): HowItWorksGuideId {
  const candidate = Array.isArray(value) ? value[0] : value;

  return HOW_IT_WORKS_GUIDE_IDS.includes(candidate as HowItWorksGuideId)
    ? (candidate as HowItWorksGuideId)
    : DEFAULT_HOW_IT_WORKS_GUIDE;
}

export function getHowItWorksGuide(id: HowItWorksGuideId): HowItWorksGuide {
  return HOW_IT_WORKS_GUIDES.find((guide) => guide.id === id) ?? HOW_IT_WORKS_GUIDES[0]!;
}

export function getHowItWorksHref(id: HowItWorksGuideId): `/how-it-works?guide=${HowItWorksGuideId}#walkthrough` {
  return `/how-it-works?guide=${id}#walkthrough`;
}
