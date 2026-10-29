import { createPublicClient, fallback, http, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';

const customRpcUrl = process.env.ETHEREUM_RPC_URL?.trim();
const transports = [
  ...(customRpcUrl ? [http(customRpcUrl, { retryCount: 0, timeout: 8_000 })] : []),
  http('https://ethereum-rpc.publicnode.com', { retryCount: 0, timeout: 8_000 }),
  http('https://eth.drpc.org', { retryCount: 0, timeout: 8_000 }),
  http('https://1rpc.io/eth', { retryCount: 0, timeout: 8_000 }),
];

export const ethereumClient: PublicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(transports, { rank: false }),
});
