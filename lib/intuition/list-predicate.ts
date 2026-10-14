import type { Hex } from 'viem';

import type { PublicIntuitionNetwork } from '@/types/api';

export const HAS_TAG_PREDICATE_TERM_IDS = {
  mainnet: '0x7ec36d201c842dc787b45cb5bb753bea4cf849be3908fb1b0a7d067c3c3cc1f5',
  testnet: '0x6de69cc0ae3efe4000279b1bf365065096c8715d8180bc2a98046ee07d3356fd',
} as const satisfies Record<PublicIntuitionNetwork, Hex>;

export function getHasTagPredicateTermId(network: PublicIntuitionNetwork): Hex {
  return HAS_TAG_PREDICATE_TERM_IDS[network];
}

export function getRecognizedHasTagPredicateTermIds(network: PublicIntuitionNetwork): readonly Hex[] {
  // Collate previously wrote Testnet entries with the Mainnet predicate.
  return network === 'testnet'
    ? [HAS_TAG_PREDICATE_TERM_IDS.testnet, HAS_TAG_PREDICATE_TERM_IDS.mainnet]
    : [HAS_TAG_PREDICATE_TERM_IDS.mainnet];
}

export function isHasTagPredicateTermId(network: PublicIntuitionNetwork, termId: string | null | undefined): boolean {
  return !!termId && getRecognizedHasTagPredicateTermIds(network).some((id) => id.toLowerCase() === termId.toLowerCase());
}
