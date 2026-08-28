import { parseAbi } from 'viem';

export const MULTIVAULT_ABI = parseAbi([
  'function getAtomCost() view returns (uint256)',
  'function getTripleCost() view returns (uint256)',
  'function getBondingCurveConfig() view returns ((address,uint256))',
  'function calculateAtomId(bytes data) pure returns (bytes32)',
  'function calculateTripleId(bytes32 subjectId, bytes32 predicateId, bytes32 objectId) pure returns (bytes32)',
  'function isTermCreated(bytes32 id) view returns (bool)',
  'function createAtoms(bytes[] atomDatas, uint256[] assets) payable returns (bytes32[])',
  'function createTriples(bytes32[] subjectIds, bytes32[] predicateIds, bytes32[] objectIds, uint256[] assets) payable returns (bytes32[])',
  'event AtomCreated(address indexed creator, bytes32 indexed termId, bytes atomData, address atomWallet)',
  'event TripleCreated(address indexed creator, bytes32 indexed termId, bytes32 subjectId, bytes32 predicateId, bytes32 objectId)',
]);
