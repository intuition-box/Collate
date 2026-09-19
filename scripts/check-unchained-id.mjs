import { buildAtom } from '@0xintuition/primitives/atom';
import { createPublicClient, http, parseAbi, stringToHex } from 'viem';

const atom = buildAtom('thing', { name: 'Collate Unchained ID compatibility check' });
if (!atom.success) throw new Error(atom.errors.join(' '));

const client = createPublicClient({
  transport: http(process.env.NEXT_PUBLIC_INTUITION_TESTNET_RPC_URL?.trim() || 'https://testnet.rpc.intuition.systems/http'),
});
const chainId = await client.readContract({
  address: '0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91',
  abi: parseAbi(['function calculateAtomId(bytes data) pure returns (bytes32)']),
  functionName: 'calculateAtomId',
  args: [stringToHex(atom.value.data)],
});

const matches = chainId.toLowerCase() === atom.value.id.toLowerCase();
console.log(`Unchained package atom ID: ${atom.value.id}`);
console.log(`Testnet contract atom ID: ${chainId}`);
console.log(`IDs match: ${matches}`);
if (!matches) process.exitCode = 1;
