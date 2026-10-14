import type { ActivityPublish, ConfirmedActivityItem } from '@/types/activity';

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

function previewName(item: ConfirmedActivityItem): string | null {
  const display = item.display;
  if (display.state === 'pending' || display.state === 'unavailable') return null;
  if (display.atom) return display.atom.label;
  if (!display.triple) return null;
  if (item.kind === 'list_entry') return display.triple.subject?.label ?? null;
  const parts = [display.triple.subject?.label, display.triple.predicate?.label, display.triple.object?.label];
  return parts.every(Boolean) ? parts.join(' · ') : null;
}

export function getPublishTitle(publish: ActivityPublish): string {
  if (publish.kind === 'atom') {
    return `Published ${publish.itemCount} ${plural(publish.itemCount, 'atom', 'atoms')}`;
  }
  if (publish.kind === 'list_entry') {
    const first = publish.previewItems[0];
    const listName = first?.display.state === 'ready' || first?.display.state === 'partial'
      ? first.display.triple?.object?.label
      : null;
    const count = `${publish.itemCount} ${plural(publish.itemCount, 'member', 'members')}`;
    return listName ? `Added ${count} to ${listName}` : `Added ${count} to a list`;
  }
  return `Published ${publish.itemCount} ${plural(publish.itemCount, 'claim', 'claims')}`;
}

export function getPublishPreview(publish: ActivityPublish): string {
  const names = publish.previewItems.map(previewName).filter((name): name is string => !!name);
  if (names.length === 0) return 'Item details are becoming available.';
  const remaining = publish.itemCount - names.length;
  return `${names.join(' · ')}${remaining > 0 ? ` · +${remaining} more` : ''}`;
}
