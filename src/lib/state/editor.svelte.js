/**
 * Ephemeral editor state. Never saved, never exported, never part of undo.
 */
export const editor = $state({
  view: 'page',
  tool: 'select',
  snap: true,
  guides: { x: null, y: null },
  editingElementId: null,
  textDraft: ''
});

export function setView(view) {
  if (view !== 'page' && view !== 'map') return;
  editor.view = view;
  if (view === 'map') {
    editor.editingElementId = null;
    clearGuides();
  }
}

export function setTool(tool) {
  editor.tool = tool;
}

export function toggleSnap() {
  editor.snap = !editor.snap;
  if (!editor.snap) clearGuides();
}

export function setGuides(x = null, y = null) {
  editor.guides = { x, y };
}

export function clearGuides() {
  editor.guides = { x: null, y: null };
}

export function beginTextEdit(element) {
  editor.editingElementId = element.id;
  editor.textDraft = element.text ?? '';
}

export function endTextEdit() {
  editor.editingElementId = null;
  editor.textDraft = '';
}
