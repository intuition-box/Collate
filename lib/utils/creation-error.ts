export type ReadableError = {
  summary: string;
  details: string | null;
};

export function getReadableError(message: string): ReadableError {
  const raw = message.trim();
  if (!raw) return { summary: 'Something went wrong. Please try again.', details: null };

  let summary: string;
  if (/user rejected|user denied|rejected by user|user cancelled|user canceled|UserRejectedRequestError/i.test(raw)) {
    summary = 'You declined the request in your wallet. Nothing was published.';
  } else if (/insufficient funds|exceeds balance/i.test(raw)) {
    summary = 'Your wallet does not have enough funds for this transaction. Add funds and try again.';
  } else if (/transaction was reverted|execution reverted|transaction reverted/i.test(raw)) {
    summary = 'The transaction failed on the network. Nothing was created.';
  } else if (/timed out|timeout/i.test(raw)) {
    summary = 'Confirmation is taking longer than expected. Check the transaction before trying again.';
  } else if (/failed to fetch|fetch failed|network request failed/i.test(raw)) {
    summary = 'The connection failed. Check your connection and try again.';
  } else {
    const firstLine = raw.split(/\r?\n|\b(?:Request Arguments|Raw Call Arguments|Contract Call|Details|Version):/i)[0]?.trim();
    const compact = (firstLine || 'Something went wrong. Please try again.').replace(/\s+/g, ' ');
    summary = compact.length > 180 ? `${compact.slice(0, 177).trimEnd()}...` : compact;
  }

  return { summary, details: summary === raw ? null : raw };
}
