const BASIC_ATOM_CSV_TEMPLATE = [
  'name,description,url,image_url,deposit',
  'Saulo,Professional rabbit-hole opener who can turn one protocol idea into twelve before lunch,https://x.com/saulodigital,https://unavatar.io/x/saulodigital,0',
  'Zet,Knowledge graph wizard making impossible protocol ideas look like routine Tuesday work,https://x.com/olivierjeremie,https://unavatar.io/x/olivierjeremie,0',
  'Pixi3,Chief vibe architect keeping the community curious chaotic and extremely online,https://x.com/0xPixi3,https://unavatar.io/x/0xPixi3,0',
].join('\n');

const SCHEMA_ATOM_CSV_TEMPLATE = [
  'schema_type,name,description,url,image_url,deposit,email,identifier,chain_id,account_address,raw_data',
  'Thing,Acme Protocol,Collective knowledge graph builder,https://example.com,https://example.com/logo.png,0,,,,,',
  'Person,Jane Builder,Protocol researcher,https://example.com/jane,https://example.com/jane.jpg,0,jane@example.com,jane-builder,,,',
  'Organization,Open Knowledge Lab,Research collective,https://example.org,https://example.org/logo.png,0,hello@example.org,,,,',
  'Account,,,,,0,,,1,0x0000000000000000000000000000000000000000,',
  'Raw,,,,,0,,,,,ipfs://bafkreiexample',
].join('\n');

const LIST_CSV_TEMPLATE = [
  'member,description,deposit',
  'Ethereum,Layer one network,0',
  'Base,Layer two network,0',
  'Optimism,Layer two network,0',
].join('\n');

function downloadCsvTemplate(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadBasicAtomCsvTemplate(): void {
  downloadCsvTemplate('intuition-atom-basic-template.csv', BASIC_ATOM_CSV_TEMPLATE);
}

export function downloadSchemaAtomCsvTemplate(): void {
  downloadCsvTemplate('intuition-atom-schema-template.csv', SCHEMA_ATOM_CSV_TEMPLATE);
}

export function downloadListCsvTemplate(): void {
  downloadCsvTemplate('intuition-list-template.csv', LIST_CSV_TEMPLATE);
}
