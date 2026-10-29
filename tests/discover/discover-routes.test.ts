import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';

import { GET as getBatches } from '../../app/api/discover/batches/route';
import { GET as getCollection } from '../../app/api/discover/collections/[network]/[id]/route';
import { GET as getCollections } from '../../app/api/discover/collections/route';

const ID = `0x${'a'.repeat(64)}`;

test('Discover read routes reject unsupported networks and invalid list IDs before querying', async () => {
  assert.equal((await getCollections(new NextRequest('http://localhost/api/discover/collections?network=all'))).status, 400);
  assert.equal((await getBatches(new NextRequest('http://localhost/api/discover/batches?network=wrong'))).status, 400);
  assert.equal((await getCollection(new NextRequest(`http://localhost/api/discover/collections/mainnet/bad`), { params: { network: 'mainnet', id: 'bad' } })).status, 400);
  assert.equal((await getCollection(new NextRequest(`http://localhost/api/discover/collections/wrong/${ID}`), { params: { network: 'wrong', id: ID } })).status, 400);
  assert.equal((await getCollection(new NextRequest(`http://localhost/api/discover/collections/testnet/${ID}?cursor=0`), { params: { network: 'testnet', id: ID } })).status, 400);
});
