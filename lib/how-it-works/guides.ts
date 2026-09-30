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

export type HowItWorksGuide = {
  id: HowItWorksGuideId;
  category: GuideCategory;
  index: string;
  title: string;
  badge?: string;
  shortDescription: string;
  summary: string;
  prerequisites: string[];
  steps: Array<{ title: string; description: string }>;
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
    index: '01',
    title: 'Create one atom',
    shortDescription: 'Create one reviewed building block without unnecessary batch setup.',
    summary: 'Start with one idea, check whether it already exists, then publish the atom you actually intend to create.',
    prerequisites: [
      'Choose Mainnet or Testnet before you begin.',
      'Have the atom name and useful context ready.',
      'Connect your wallet only when you are ready to publish.',
    ],
    steps: [
      { title: 'Open Single atom', description: 'Go to Create, choose Atom creation, then select Single atom.' },
      { title: 'Choose the format', description: 'Classic opens first for familiar image rich atoms. Unchained Early access offers structured types on Testnet.' },
      { title: 'Describe the atom', description: 'Choose its type, complete the required fields, and add an image or useful links when they help identify it.' },
      { title: 'Review before signing', description: 'Select Review atom. Collate checks the fields and searches for exact or same name atoms you may want to reuse.' },
      { title: 'Publish the eligible atom', description: 'Confirm the review result, connect on the selected network, and approve the wallet transaction.' },
      { title: 'Wait for confirmation', description: 'Keep the page open until Collate confirms the transaction, then open the explorer link or create another atom.' },
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
    index: '02',
    title: 'Create batch atoms',
    shortDescription: 'Prepare several atoms and publish every eligible row together.',
    summary: 'Use a familiar form for each atom, review the complete batch, and keep existing or repeated rows out of the transaction.',
    prerequisites: [
      'Group the atoms you want to create on one network.',
      'Know the correct type and identifying details for each atom.',
      'Use CSV import instead when a spreadsheet is easier to maintain.',
    ],
    steps: [
      { title: 'Open Batch atoms', description: 'Go to Create, choose Atom creation, then select Batch atoms.' },
      { title: 'Complete the starting rows', description: 'Choose Classic or Unchained Early access and enter the required information for each atom.' },
      { title: 'Add or remove rows', description: 'Use Add atom for every additional item and remove rows that do not belong in this batch.' },
      { title: 'Review the whole batch', description: 'Select Review atoms and read every status, duplicate warning, existing match, and estimated cost.' },
      { title: 'Check the eligible count', description: 'Make sure the count matches the atoms you intend to create. Blocked rows will not be submitted.' },
      { title: 'Publish once', description: 'Connect the wallet on the selected network and approve one transaction containing the eligible atoms only.' },
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
    index: '03',
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
      { title: 'Choose the CSV format', description: 'Open CSV import. Classic CSV opens first; Unchained Early access provides samples tailored to each structured type.' },
      { title: 'Download a sample', description: 'Keep the header row and replace the example values in your spreadsheet instead of guessing the format.' },
      { title: 'Upload or paste', description: 'Upload the CSV file or paste its text directly into Collate.' },
      { title: 'Preview parsed rows', description: 'Check names, types, fields, image previews, and row errors. Fix the source and preview again when needed.' },
      { title: 'Review against the graph', description: 'Select Review atoms to find existing atoms, batch duplicates, and same name matches.' },
      { title: 'Confirm eligible rows', description: 'Make sure only the intended ready rows are included in the eligible count.' },
      { title: 'Publish one transaction', description: 'Connect the wallet, publish the eligible atoms, and wait for confirmation.' },
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
    index: '04',
    title: 'Add one list member',
    shortDescription: 'Connect one existing member atom to the right list atom.',
    summary: 'Choose the atom representing the list, choose one member, then review whether that relationship still needs to be created.',
    prerequisites: [
      'Know which atom represents the destination list.',
      'Search for the existing member atom by name.',
      'Use descriptions and images when several atoms share a name.',
    ],
    steps: [
      { title: 'Open Manual lists', description: 'Go to Create, choose Lists, then select Manual lists.' },
      { title: 'Select the list atom', description: 'Start typing its name and choose the correct result. Create it in the modal if it does not exist yet.' },
      { title: 'Select the member atom', description: 'Search automatically from the first member row and inspect the result before selecting it.' },
      { title: 'Create a missing member if needed', description: 'Use the member row suggestion to create the atom in a modal without leaving the list flow.' },
      { title: 'Review the relationship', description: 'Select Review list entries. Collate checks whether this member is already part of the list.' },
      { title: 'Publish and confirm', description: 'Publish the ready entry, approve the transaction, and wait for confirmation.' },
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
    index: '05',
    title: 'Add several list members',
    shortDescription: 'Review several member relationships and publish the missing ones together.',
    summary: 'Select one destination list, collect the existing member atoms, and create every missing list entry in one transaction.',
    prerequisites: [
      'Choose or create one atom representing the list.',
      'Know the member atoms you want to add.',
      'Check descriptions carefully when atom names repeat.',
    ],
    steps: [
      { title: 'Open Manual lists', description: 'Go to Create, choose Lists, then select Manual lists.' },
      { title: 'Select or create the list atom', description: 'Search automatically and choose the correct list atom before adding members.' },
      { title: 'Choose the first member', description: 'Search for an existing atom and confirm its selected card is the intended result.' },
      { title: 'Add more members', description: 'Use Add member, select one atom in each row, and remove accidental rows before review.' },
      { title: 'Review every entry', description: 'Collate finds existing list entries, repeated members, and incomplete rows.' },
      { title: 'Publish the missing entries', description: 'Check the eligible count and approve one transaction for all ready list entries.' },
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
    index: '06',
    title: 'Import list members from CSV',
    badge: 'Best for bulk data',
    shortDescription: 'Resolve spreadsheet rows to existing atoms before adding them to a list.',
    summary: 'Select the destination list first, then use exact names and descriptions to safely resolve every CSV row to an existing member atom.',
    prerequisites: [
      'Select or create the destination list atom first.',
      'Use a CSV with no more than 50 member rows.',
      'Copy each existing atom description exactly when duplicate names are possible.',
    ],
    steps: [
      { title: 'Select the list atom', description: 'Open Lists, choose CSV import, then search for or create the destination list atom.' },
      { title: 'Prepare the member CSV', description: 'Download the sample and add one existing member name and its exact description per row.' },
      { title: 'Upload or paste', description: 'Upload the file or paste its CSV text into Collate.' },
      { title: 'Preview parsed rows', description: 'Check names, descriptions, line numbers, and parsing errors before graph resolution.' },
      { title: 'Review member matches', description: 'Collate searches exact names and uses descriptions to distinguish atoms that share a name.' },
      { title: 'Resolve uncertain rows', description: 'Inspect candidate details for ambiguous rows. Remove missing or invalid rows that cannot be published.' },
      { title: 'Publish eligible entries', description: 'Review again after any candidate change, confirm the eligible count, then approve one transaction.' },
    ],
    tips: [
      'The description identifies an existing atom. Do not replace it with a newly written summary.',
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
