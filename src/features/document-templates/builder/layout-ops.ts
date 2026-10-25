import type { BlockSchema, ColumnSide, DocumentLayout, LayoutBlock, PropSchema } from '../api';

/** Where a section lives: the page itself, or one column of a columns section. */
export interface BlockSlot {
  parentId: string | null;
  side?: ColumnSide;
}

const ALL_SIDES: ColumnSide[] = ['left', 'middle', 'right'];

/** A columns section's columns, in order: its ratio's parts decide two or three ("25-50-25"). */
export function columnSides(block: Pick<LayoutBlock, 'props'>): ColumnSide[] {
  const parts = String(block.props.ratio ?? '50-50').split('-').length;
  return parts === 3 ? ALL_SIDES : ['left', 'right'];
}

export const newBlockId = () =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Default props for a section type, from its schema. */
export function defaultProps(schema: PropSchema[]): Record<string, unknown> {
  return Object.fromEntries(schema.map((p) => [p.key, structuredClone(p.default)]));
}

export function createBlock(definition: BlockSchema): LayoutBlock {
  return {
    id: newBlockId(),
    type: definition.type,
    props: defaultProps(definition.props),
    ...(definition.container ? { children: { left: [], right: [] } } : {}),
  };
}

/** The list a slot points at (the page, or a column of a section). */
function listOf(layout: DocumentLayout, slot: BlockSlot): LayoutBlock[] | undefined {
  if (!slot.parentId) return layout.blocks;
  const parent = layout.blocks.find((b) => b.id === slot.parentId);
  if (!parent?.children) return undefined;
  const side = slot.side ?? 'left';
  // A middle column exists only once something is put in it.
  if (side === 'middle') parent.children.middle ??= [];
  return parent.children[side];
}

/** Finds a section and the slot it is in. */
export function locate(
  layout: DocumentLayout,
  id: string,
): { block: LayoutBlock; slot: BlockSlot; index: number } | null {
  const top = layout.blocks.findIndex((b) => b.id === id);
  if (top >= 0) return { block: layout.blocks[top], slot: { parentId: null }, index: top };
  for (const parent of layout.blocks) {
    for (const side of ALL_SIDES) {
      const list = parent.children?.[side] ?? [];
      const index = list.findIndex((b) => b.id === id);
      if (index >= 0) return { block: list[index], slot: { parentId: parent.id, side }, index };
    }
  }
  return null;
}

/** Applies `change` to a deep copy of the layout and returns it. */
function edit(layout: DocumentLayout, change: (draft: DocumentLayout) => void): DocumentLayout {
  const draft = structuredClone(layout);
  change(draft);
  return draft;
}

export function insertBlock(
  layout: DocumentLayout,
  block: LayoutBlock,
  slot: BlockSlot,
  index?: number,
): DocumentLayout {
  return edit(layout, (draft) => {
    // Columns sections can't go inside columns.
    const target = block.children ? draft.blocks : (listOf(draft, slot) ?? draft.blocks);
    target.splice(index ?? target.length, 0, block);
  });
}

export function updateProps(
  layout: DocumentLayout,
  id: string,
  props: Record<string, unknown>,
): DocumentLayout {
  return edit(layout, (draft) => {
    const found = locate(draft, id);
    if (!found) return;
    found.block.props = props;
    // Going from three columns to two keeps the middle's sections, in the left column.
    const children = found.block.children;
    if (children && columnSides(found.block).length === 2 && children.middle) {
      children.left.push(...children.middle);
      delete children.middle;
    }
  });
}

/** Sets a section's placement; `null` puts it back to the default. */
export function updateStyle(
  layout: DocumentLayout,
  id: string,
  style: Record<string, unknown> | null,
): DocumentLayout {
  return edit(layout, (draft) => {
    const found = locate(draft, id);
    if (!found) return;
    if (style) found.block.style = style;
    else delete found.block.style;
  });
}

export function removeBlock(layout: DocumentLayout, id: string): DocumentLayout {
  return edit(layout, (draft) => {
    const found = locate(draft, id);
    if (found) listOf(draft, found.slot)?.splice(found.index, 1);
  });
}

export function toggleHidden(layout: DocumentLayout, id: string): DocumentLayout {
  return edit(layout, (draft) => {
    const found = locate(draft, id);
    if (found) found.block.hidden = !found.block.hidden;
  });
}

export function duplicateBlock(layout: DocumentLayout, id: string): DocumentLayout {
  return edit(layout, (draft) => {
    const found = locate(draft, id);
    if (!found) return;
    const copy = structuredClone(found.block);
    copy.id = newBlockId();
    for (const side of ALL_SIDES) copy.children?.[side]?.forEach((b) => (b.id = newBlockId()));
    listOf(draft, found.slot)?.splice(found.index + 1, 0, copy);
  });
}

/** Moves a section one place up or down within its list. */
export function moveBlock(layout: DocumentLayout, id: string, delta: -1 | 1): DocumentLayout {
  return edit(layout, (draft) => {
    const found = locate(draft, id);
    const list = found && listOf(draft, found.slot);
    if (!found || !list) return;
    const to = found.index + delta;
    if (to < 0 || to >= list.length) return;
    [list[found.index], list[to]] = [list[to], list[found.index]];
  });
}

/** Drag and drop: puts `dragId` before `targetId` (or at the end of `slot`). */
export function moveTo(
  layout: DocumentLayout,
  dragId: string,
  target: { beforeId?: string; slot?: BlockSlot },
): DocumentLayout {
  if (dragId === target.beforeId) return layout;
  const found = locate(layout, dragId);
  if (!found) return layout;
  const without = removeBlock(layout, dragId);
  if (target.beforeId) {
    const at = locate(without, target.beforeId);
    if (!at) return layout;
    // Columns stay on the page level.
    if (found.block.children && at.slot.parentId) return layout;
    return insertBlock(without, found.block, at.slot, at.index);
  }
  return insertBlock(without, found.block, target.slot ?? { parentId: null });
}
