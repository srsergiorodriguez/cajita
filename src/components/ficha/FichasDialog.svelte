<script>
  import { tick } from 'svelte';
  import Dialog from '../ui/Dialog.svelte';
  import Button from '../ui/Button.svelte';
  import Field from '../ui/Field.svelte';
  import Select from '../ui/Select.svelte';
  import SegmentedControl from '../ui/SegmentedControl.svelte';
  import AssetThumb from '../shell/AssetThumb.svelte';
  import Icon from '../ui/Icon.svelte';
  import { t } from '../../lib/i18n/index.svelte.js';
  import {
    addFichaElement,
    addFichaRecord,
    deleteFichaRecord,
    saveFichaSchema,
    session,
    setFichasMovable,
    updateFichaRecord
  } from '../../lib/state/project.svelte.js';
  import {
    createFichaField,
    defaultFichaValues,
    fichaFieldKeyFromLabel,
    isSafeFichaUrl,
    nextFichaCode
  } from '../../lib/domain/fichas.js';
  import { toast } from '../../lib/state/ui.svelte.js';
  import { platform } from '../../lib/platform/index.js';
  import {
    fichaCsvErrorReport,
    fichaCsvTemplate,
    fichasToCsv,
    validateFichaCsv
  } from '../../lib/domain/ficha-csv.js';
  import {
    activePage,
    importFichaRecords,
    importMedia,
    placeFichasGrid
  } from '../../lib/state/project.svelte.js';

  let { open = $bindable(false) } = $props();

  let tab = $state('fichas');
  let selectedId = $state(null);
  let draft = $state(null);
  let schemaDraft = $state([]);
  let search = $state('');
  let error = $state('');
  let notice = $state('');
  let wasOpen = false;
  let csvOpen = $state(false);
  let csvReport = $state(null);
  let csvName = $state('');
  let csvText = $state('');
  let csvMode = $state('create');
  let placeImported = $state(false);
  let csvBusy = $state(false);
  let zipImages = $state([]);
  let cellEdit = $state(null);
  let cellInput = $state(null);
  let cellFocusKey = '';
  let imageEditRecordId = $state(null);
  let showCodeDraft = $state(true);

  const project = $derived(session.project);
  const fields = $derived(project?.fichaSchema?.fields ?? []);
  const records = $derived(
    Object.values(project?.fichas ?? {}).sort((a, b) =>
      String(a.code).localeCompare(String(b.code), project?.locale ?? 'es')
    )
  );
  const imageAssets = $derived(
    Object.values(project?.assets ?? {}).filter((asset) => asset.kind === 'image')
  );
  const filteredRecords = $derived(
    records.filter((record) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        record.code.toLowerCase().includes(q) || record.label.toLowerCase().includes(q)
      );
    })
  );
  const currentAsset = $derived(
    draft?.assetId ? (project?.assets?.[draft.assetId] ?? null) : null
  );

  $effect(() => {
    if (open && !wasOpen) syncAll();
    wasOpen = open;
  });

  function newDraft() {
    return {
      id: null,
      code: nextFichaCode(project?.fichas ?? {}),
      label: `${t('ficha.item')} ${records.length + 1}`,
      assetId: '',
      alt: '',
      values: defaultFichaValues(fields)
    };
  }

  function syncAll() {
    cellEdit = null;
    imageEditRecordId = null;
    showCodeDraft = project?.fichaSettings?.showCode !== false;
    schemaDraft = structuredClone($state.snapshot(fields));
    error = '';
    notice = '';
    const chosen = selectedId && project?.fichas?.[selectedId];
    if (chosen) draft = structuredClone($state.snapshot(chosen));
    else if (records.length) {
      selectedId = records[0].id;
      draft = structuredClone($state.snapshot(records[0]));
    } else {
      selectedId = null;
      draft = newDraft();
    }
  }

  function switchTab(next) {
    if (cellEdit) cancelCell();
    imageEditRecordId = null;
    tab = next;
  }

  function selectRecord(record) {
    selectedId = record.id;
    draft = structuredClone($state.snapshot(record));
    error = '';
    notice = '';
  }

  function startNew() {
    selectedId = null;
    draft = newDraft();
    error = '';
    notice = '';
    tab = 'fichas';
  }

  function duplicateCode() {
    if (!draft) return false;
    return records.some(
      (record) =>
        record.id !== draft.id &&
        record.code.trim().toLowerCase() === draft.code.trim().toLowerCase()
    );
  }

  function saveRecord() {
    if (!draft) return null;
    error = '';
    if (!draft.code.trim() || !draft.label.trim()) {
      error = t('ficha.codeLabelRequired');
      return null;
    }
    if (duplicateCode()) {
      error = t('ficha.codeDuplicate');
      return null;
    }
    for (const field of fields) {
      const value = String(draft.values?.[field.id] ?? '').trim();
      if (field.required && !value) {
        error = t('ficha.fieldRequired', { field: field.label || field.key });
        return null;
      }
      if (field.type === 'url' && value && !isSafeFichaUrl(value)) {
        error = t('ficha.urlInvalid', { field: field.label || field.key });
        return null;
      }
    }
    try {
      const payload = {
        code: draft.code.trim(),
        label: draft.label.trim(),
        assetId: draft.assetId || '',
        alt: draft.alt || draft.label,
        values: { ...draft.values }
      };
      const saved = draft.id
        ? updateFichaRecord(draft.id, payload)
        : addFichaRecord(payload);
      selectedId = saved.id;
      draft = structuredClone(saved);
      notice = t('ficha.saved');
      return saved;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      return null;
    }
  }

  function placeOnPage() {
    const saved = saveRecord();
    if (!saved) return;
    try {
      addFichaElement(saved.id);
      open = false;
      toast(t('ficha.placed'), 'success');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function removeRecord() {
    if (!draft?.id) {
      startNew();
      return;
    }
    if (!window.confirm(t('ficha.deleteConfirm'))) return;
    try {
      const removed = deleteFichaRecord(draft.id);
      toast(
        removed ? t('ficha.deletedWithElements', { count: removed }) : t('ficha.deleted'),
        'success'
      );
      selectedId = null;
      error = '';
      notice = '';
      syncAll();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function setValue(fieldId, value) {
    draft = { ...draft, values: { ...draft.values, [fieldId]: value } };
  }

  function addSchemaField() {
    let n = schemaDraft.length + 1;
    while (schemaDraft.some((field) => field.key === `campo_${n}`)) n += 1;
    schemaDraft = [
      ...schemaDraft,
      createFichaField({ label: `${t('ficha.field')} ${n}`, key: `campo_${n}` })
    ];
  }

  function updateSchemaField(index, key, value) {
    schemaDraft = schemaDraft.map((field, i) =>
      i === index ? { ...field, [key]: value } : field
    );
  }

  function syncFieldKey(index) {
    const field = schemaDraft[index];
    if (!field) return;
    let base = fichaFieldKeyFromLabel(field.label);
    let key = base;
    let n = 2;
    while (schemaDraft.some((other, i) => i !== index && other.key === key)) {
      key = `${base}_${n}`;
      n += 1;
    }
    updateSchemaField(index, 'key', key);
  }

  function removeSchemaField(index) {
    const field = schemaDraft[index];
    const used = records.filter((record) =>
      String(record.values?.[field.id] ?? '').trim()
    ).length;
    if (used && !window.confirm(t('ficha.deleteFieldConfirm', { count: used }))) return;
    schemaDraft = schemaDraft.filter((_, i) => i !== index);
  }

  async function chooseCsv() {
    if (!project) return;
    csvBusy = true;
    error = '';
    try {
      const files = await platform.files.pickFiles({
        accept: '.csv,text/csv',
        multiple: false
      });
      if (!files.length) return;
      const text = await files[0].text();
      zipImages = [];
      csvText = text;
      csvName = files[0].name;
      csvReport = validateFichaCsv(project, text, { mode: csvMode });
      csvOpen = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      csvBusy = false;
    }
  }

  async function chooseZip() {
    if (!project) return;
    csvBusy = true;
    error = '';
    try {
      const files = await platform.files.pickFiles({
        accept: '.zip,application/zip',
        multiple: false
      });
      if (!files.length) return;
      const parsed = await platform.files.readCollectionZip(files[0]);
      zipImages = parsed.images;
      csvText = parsed.csvText;
      csvName = files[0].name;
      csvReport = validateFichaCsv(project, csvText, { mode: csvMode });
      csvOpen = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      csvBusy = false;
    }
  }

  function downloadCsv() {
    if (!project) return;
    platform.files.downloadBytes(
      new TextEncoder().encode(fichasToCsv(project)),
      'fichas.csv',
      'text/csv'
    );
  }

  function downloadTemplate() {
    if (!project) return;
    platform.files.downloadBytes(
      new TextEncoder().encode(fichaCsvTemplate(project)),
      'fichas-template.csv',
      'text/csv'
    );
  }

  function downloadErrors() {
    if (!csvReport) return;
    platform.files.downloadBytes(
      new TextEncoder().encode(fichaCsvErrorReport(csvReport)),
      'fichas-errores.csv',
      'text/csv'
    );
  }

  function deriveSchema() {
    if (!csvReport?.table?.length) return;
    const headers = csvReport.table[0];
    const structural = new Set(['code', 'label', 'image']);
    const proposed = [];
    const used = new Set();
    headers.forEach((header, index) => {
      const clean = String(header ?? '').trim();
      if (!clean || structural.has(clean.toLowerCase())) return;
      let key = fichaFieldKeyFromLabel(clean);
      let n = 2;
      while (used.has(key)) {
        key = `${fichaFieldKeyFromLabel(clean)}_${n}`;
        n += 1;
      }
      used.add(key);
      const values = csvReport.table
        .slice(1)
        .map((row) => String(row[index] ?? '').trim())
        .filter(Boolean);
      const type =
        values.length > 0 && values.every((value) => isSafeFichaUrl(value))
          ? 'url'
          : values.some((value) => value.length > 120)
            ? 'longtext'
            : 'text';
      proposed.push(
        createFichaField({ label: clean, key, type, required: false })
      );
    });
    if (!proposed.length) return;
    try {
      saveFichaSchema(proposed, { showCode: showCodeDraft });
      schemaDraft = proposed;
      csvReport = validateFichaCsv(session.project, csvText, { mode: csvMode });
      notice = t('ficha.schemaDerived');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function changeCsvMode(mode) {
    csvMode = mode;
    if (csvText) csvReport = validateFichaCsv(project, csvText, { mode });
  }

  async function applyCsv() {
    if (!csvReport?.ok) return;
    try {
      let report = csvReport;
      if (zipImages.length) {
        const files = zipImages.map(
          (image) => new File([image.bytes], image.name, { type: image.type })
        );
        const media = await importMedia(files);
        if (media.errors.length) {
          error = t('ficha.zipMediaErrors', { errors: media.errors.join(' · ') });
          return;
        }
        report = validateFichaCsv(session.project, csvText, { mode: csvMode });
        csvReport = report;
        if (!report.ok) return;
      }
      const result = importFichaRecords(report.rows);
      let placed = 0;
      if (placeImported && result.createdIds.length) {
        const page = activePage();
        if (
          !page.elements.length ||
          window.confirm(t('ficha.csvPlaceOverlap'))
        ) {
          placed = placeFichasGrid(result.createdIds);
        }
      }
      csvOpen = false;
      csvReport = null;
      csvName = '';
      csvText = '';
      zipImages = [];
      syncAll();
      notice = placed
        ? t('ficha.csvImportedPlaced', { count: result.count, placed })
        : t('ficha.csvImported', { count: result.count });
      toast(notice, 'success');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function closeCsv() {
    csvOpen = false;
    csvReport = null;
    csvName = '';
    csvText = '';
    zipImages = [];
  }

  $effect(() => {
    if (!cellEdit) {
      cellFocusKey = '';
      return;
    }
    const key = `${cellEdit.recordId}:${cellEdit.key}`;
    if (key === cellFocusKey) return;
    cellFocusKey = key;
    tick().then(() => {
      cellInput?.focus();
      cellInput?.select();
    });
  });

  function openRecord(record) {
    selectRecord(record);
    tab = 'fichas';
  }

  function beginCell(record, key, value) {
    if (cellEdit?.recordId === record.id && cellEdit?.key === key) return;
    cellEdit = {
      recordId: record.id,
      key,
      value: String(value ?? ''),
      error: ''
    };
  }

  function beginFieldCell(record, field) {
    beginCell(record, `field:${field.id}`, record.values?.[field.id] ?? '');
  }

  function cancelCell() {
    cellEdit = null;
  }

  function setCellValue(value) {
    if (!cellEdit) return;
    cellEdit = { ...cellEdit, value, error: '' };
  }

  function refreshSelectedDraft(recordId) {
    if (selectedId !== recordId) return;
    const record = project?.fichas?.[recordId];
    if (record) draft = structuredClone($state.snapshot(record));
  }

  function commitCell() {
    if (!cellEdit) return;
    const record = project?.fichas?.[cellEdit.recordId];
    if (!record) {
      cellEdit = null;
      return;
    }
    const value = cellEdit.value.trim();
    const key = cellEdit.key;
    let patch;
    if (key === 'code') {
      if (!value) {
        cellEdit = { ...cellEdit, error: t('ficha.codeRequired') };
        return;
      }
      if (
        records.some(
          (item) =>
            item.id !== record.id &&
            item.code.trim().toLowerCase() === value.toLowerCase()
        )
      ) {
        cellEdit = { ...cellEdit, error: t('ficha.codeDuplicate') };
        return;
      }
      patch = { code: value };
    } else if (key === 'label') {
      if (!value) {
        cellEdit = { ...cellEdit, error: t('ficha.labelRequired') };
        return;
      }
      patch = { label: value, alt: record.alt || value };
    } else if (key.startsWith('field:')) {
      const fieldId = key.slice('field:'.length);
      const field = fields.find((item) => item.id === fieldId);
      if (!field) {
        cellEdit = null;
        return;
      }
      if (field.required && !value) {
        cellEdit = { ...cellEdit, error: t('ficha.fieldRequired', { field: field.label || field.key }) };
        return;
      }
      if (field.type === 'url' && value && !isSafeFichaUrl(value)) {
        cellEdit = { ...cellEdit, error: t('ficha.urlInvalid', { field: field.label || field.key }) };
        return;
      }
      patch = { values: { [fieldId]: value } };
    } else {
      cellEdit = null;
      return;
    }
    try {
      updateFichaRecord(record.id, patch);
      refreshSelectedDraft(record.id);
      cellEdit = null;
    } catch (err) {
      cellEdit = { ...cellEdit, error: err instanceof Error ? err.message : String(err) };
    }
  }

  function tableKeydown(event, record) {
    if (event.target.closest('input,button')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openRecord(record);
    }
  }

  function moveSchemaField(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= schemaDraft.length) return;
    const next = [...schemaDraft];
    [next[index], next[target]] = [next[target], next[index]];
    schemaDraft = next;
  }

  function beginImage(record) {
    if (cellEdit) cancelCell();
    imageEditRecordId = record.id;
  }

  function commitImage(record, assetId) {
    try {
      updateFichaRecord(record.id, { assetId });
      refreshSelectedDraft(record.id);
      imageEditRecordId = null;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function setMovable(event) {
    error = '';
    try {
      setFichasMovable(event.currentTarget.checked);
      notice = event.currentTarget.checked
        ? t('ficha.movableOn')
        : t('ficha.movableOff');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function saveSchema() {
    error = '';
    notice = '';
    try {
      saveFichaSchema(schemaDraft, { showCode: showCodeDraft });
      syncAll();
      notice = t('ficha.schemaSaved');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<Dialog bind:open title={t('ficha.manager')} wide>
  <div class="ficha-tabs">
    <button
      type="button"
      class:active={tab === 'fichas'}
      onclick={() => switchTab('fichas')}
    >
      {t('ficha.data')}<span>{records.length}</span>
    </button>
    <button
      type="button"
      class:active={tab === 'table'}
      onclick={() => switchTab('table')}
    >
      {t('ficha.table')}<span>{records.length}</span>
    </button>
    <button
      type="button"
      class:active={tab === 'schema'}
      onclick={() => switchTab('schema')}
    >
      {t('ficha.schema')}<span>{fields.length}</span>
    </button>
  </div>

  {#if error}<p class="message error" role="alert">{error}</p>{/if}
  {#if notice}<p class="message notice" role="status">{notice}</p>{/if}

  {#if tab === 'schema'}
    <div class="schema-panel">
      <div class="schema-head">
        <p>{t('ficha.schemaHint')}</p>
        <Button size="sm" variant="ghost" onclick={addSchemaField}>
          <Icon name="plus" size={12} />{t('ficha.addField')}
        </Button>
      </div>
        <div class="schema-code-row">
          <span>{t('ficha.code')}</span>
          <span class="hint">{t('ficha.codeHint')}</span>
          <button
            type="button"
            class="move-button"
            aria-label={showCodeDraft ? t('ficha.hideCode') : t('ficha.showCode')}
            title={showCodeDraft ? t('ficha.hideCode') : t('ficha.showCode')}
            onclick={() => (showCodeDraft = !showCodeDraft)}
          >
            <Icon name={showCodeDraft ? 'eye' : 'eye-off'} size={13} />
          </button>
        </div>
      {#if schemaDraft.length === 0}
        <p class="empty">{t('ficha.schemaEmpty')}</p>
      {:else}
        <div class="schema-table">
          <div class="schema-row schema-row--head">
            <span>{t('ficha.fieldLabel')}</span><span>{t('ficha.fieldKey')}</span><span
              >{t('ficha.fieldType')}</span
            ><span>{t('ficha.required')}</span><span></span>
          </div>
          {#each schemaDraft as field, index (field.id)}
            <div class="schema-row">
              <input
                value={field.label}
                aria-label={t('ficha.fieldLabel')}
                oninput={(event) =>
                  updateSchemaField(index, 'label', event.currentTarget.value)}
                onblur={() => syncFieldKey(index)}
              />
              <input
                value={field.key}
                aria-label={t('ficha.fieldKey')}
                oninput={(event) =>
                  updateSchemaField(index, 'key', event.currentTarget.value)}
              />
              <select
                value={field.type}
                aria-label={t('ficha.fieldType')}
                onchange={(event) =>
                  updateSchemaField(index, 'type', event.currentTarget.value)}
              >
                <option value="text">{t('ficha.typeText')}</option>
                <option value="longtext">{t('ficha.typeLongtext')}</option>
                <option value="url">{t('ficha.typeUrl')}</option>
              </select>
              <label class="check">
                <input
                  type="checkbox"
                  checked={field.required}
                  onchange={(event) =>
                    updateSchemaField(index, 'required', event.currentTarget.checked)}
                />
                <span>{t('ficha.required')}</span>
              </label>
              <span class="schema-row-actions">
                <button
                  type="button"
                  class="move-button"
                  aria-label={field.visible === false ? t('ficha.showField') : t('ficha.hideField')}
                  title={field.visible === false ? t('ficha.showField') : t('ficha.hideField')}
                  onclick={() => updateSchemaField(index, 'visible', field.visible === false)}
                >
                  <Icon name={field.visible === false ? 'eye-off' : 'eye'} size={12} />
                </button>
                <button
                  type="button"
                  class="move-button"
                  aria-label={t('ficha.moveUp')}
                  disabled={index === 0}
                  onclick={() => moveSchemaField(index, -1)}
                >
                  <Icon name="chevron-up" size={12} />
                </button>
                <button
                  type="button"
                  class="move-button"
                  aria-label={t('ficha.moveDown')}
                  disabled={index === schemaDraft.length - 1}
                  onclick={() => moveSchemaField(index, 1)}
                >
                  <Icon name="chevron" size={12} />
                </button>
                <button
                  type="button"
                  class="delete-button"
                  aria-label={t('ficha.deleteField')}
                  onclick={() => removeSchemaField(index)}
                >
                  <Icon name="trash" size={13} />
                </button>
              </span>
            </div>
          {/each}
        </div>
      {/if}
      <div class="form-actions">
        <span class="hint">{t('ficha.fieldKeyHint')}</span>
        <Button size="sm" variant="accent" onclick={saveSchema}
          >{t('ficha.saveSchema')}</Button
        >
      </div>
      <div class="ficha-setting">
        <label class="check">
          <input
            type="checkbox"
            checked={Boolean(project?.fichaSettings?.movable)}
            onchange={setMovable}
          />
          <span>{t('ficha.movable')}</span>
        </label>
        <p class="hint">{t('ficha.movableHint')}</p>
      </div>
    </div>
  {:else if tab === 'table'}
    <div class="table-panel">
      <div class="schema-head">
        <p>{t('ficha.tableHint')}</p>
        <Button size="sm" variant="ghost" onclick={startNew}>
          <Icon name="plus" size={12} />{t('ficha.new')}
        </Button>
      </div>
      <input class="search" type="search" placeholder={t('ficha.search')} bind:value={search} />
      <div class="ficha-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('ficha.code')}</th>
              <th>{t('ficha.label')}</th>
              <th>{t('ficha.image')}</th>
              {#each fields as field (field.id)}
                <th>{field.label || field.key}{#if field.required}<b>*</b>{/if}</th>
              {/each}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each filteredRecords as record (record.id)}
              <tr
                tabindex="0"
                role="button"
                onclick={(event) => {
                  if (!event.target.closest('input,button')) openRecord(record);
                }}
                onkeydown={(event) => tableKeydown(event, record)}
              >
                <td class="mono" class:invalid={cellEdit?.recordId === record.id && cellEdit?.key === 'code' && cellEdit?.error}>
                  {#if cellEdit?.recordId === record.id && cellEdit?.key === 'code'}
                    <input
                      bind:this={cellInput}
                      class:invalid={Boolean(cellEdit.error)}
                      type="text"
                      value={cellEdit.value}
                      aria-label={t('ficha.code')}
                      aria-invalid={Boolean(cellEdit.error)}
                      oninput={(event) => setCellValue(event.currentTarget.value)}
                      onblur={commitCell}
                      onkeydown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitCell();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelCell();
                        }
                      }}
                      onclick={(event) => event.stopPropagation()}
                    />
                    {#if cellEdit.error}<span class="cell-error">{cellEdit.error}</span>{/if}
                  {:else}
                    <button type="button" class="cell-button" onclick={() => beginCell(record, 'code', record.code)}>{record.code || '—'}</button>
                  {/if}
                </td>
                <td class:invalid={cellEdit?.recordId === record.id && cellEdit?.key === 'label' && cellEdit?.error}>
                  {#if cellEdit?.recordId === record.id && cellEdit?.key === 'label'}
                    <input
                      bind:this={cellInput}
                      class:invalid={Boolean(cellEdit.error)}
                      type="text"
                      value={cellEdit.value}
                      aria-label={t('ficha.label')}
                      aria-invalid={Boolean(cellEdit.error)}
                      oninput={(event) => setCellValue(event.currentTarget.value)}
                      onblur={commitCell}
                      onkeydown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commitCell();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          cancelCell();
                        }
                      }}
                      onclick={(event) => event.stopPropagation()}
                    />
                    {#if cellEdit.error}<span class="cell-error">{cellEdit.error}</span>{/if}
                  {:else}
                    <button type="button" class="cell-button" onclick={() => beginCell(record, 'label', record.label)}>{record.label || '—'}</button>
                  {/if}
                </td>
                <td class="image-cell">
                  {#if imageEditRecordId === record.id}
                    <select
                      class="image-select"
                      aria-label={t('ficha.image')}
                      value={record.assetId || ''}
                      onchange={(event) => commitImage(record, event.currentTarget.value)}
                      onclick={(event) => event.stopPropagation()}
                    >
                      <option value="">{t('ficha.noImage')}</option>
                      {#each imageAssets as asset (asset.id)}
                        <option value={asset.id}>{asset.name}</option>
                      {/each}
                    </select>
                  {:else}
                    <button
                      type="button"
                      class="image-button"
                      aria-label={t('ficha.image')}
                      onclick={(event) => {
                        event.stopPropagation();
                        beginImage(record);
                      }}
                    >
                      {#if record.assetId && project.assets[record.assetId]}
                        <AssetThumb asset={project.assets[record.assetId]} projectId={project.id} />
                      {:else}—{/if}
                    </button>
                  {/if}
                </td>
                {#each fields as field (field.id)}
                  <td class:empty={!record.values?.[field.id]} class:invalid={cellEdit?.recordId === record.id && cellEdit?.key === `field:${field.id}` && cellEdit?.error}>
                    {#if cellEdit?.recordId === record.id && cellEdit?.key === `field:${field.id}`}
                      <input
                        bind:this={cellInput}
                        class:invalid={Boolean(cellEdit.error)}
                        type={field.type === 'url' ? 'url' : 'text'}
                        value={cellEdit.value}
                        aria-label={field.label || field.key}
                        aria-invalid={Boolean(cellEdit.error)}
                        oninput={(event) => setCellValue(event.currentTarget.value)}
                        onblur={commitCell}
                        onkeydown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitCell();
                          } else if (event.key === 'Escape') {
                            event.preventDefault();
                            cancelCell();
                          }
                        }}
                        onclick={(event) => event.stopPropagation()}
                      />
                      {#if cellEdit.error}<span class="cell-error">{cellEdit.error}</span>{/if}
                    {:else}
                      <button type="button" class="cell-button" onclick={() => beginFieldCell(record, field)}>{record.values?.[field.id] || '—'}</button>
                    {/if}
                  </td>
                {/each}
                <td>
                  <button
                    type="button"
                    class="row-edit"
                    aria-label={t('ficha.edit')}
                    title={t('ficha.edit')}
                    onclick={(event) => {
                      event.stopPropagation();
                      openRecord(record);
                    }}
                  >
                    <Icon name="chevron-right" size={12} />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if filteredRecords.length === 0}
          <p class="empty">{t('ficha.noRecords')}</p>
        {/if}
      </div>
      <p class="hint">{t('ficha.tableEditHint')}</p>
    </div>
  {:else if csvOpen}
    <div class="csv-panel">
      <div class="schema-head">
        <div>
          <span class="mono-label">{zipImages.length ? t('ficha.zipTitle') : t('ficha.csvTitle')}</span>
          <strong class="csv-file">{csvName}</strong>
        </div>
        <Button size="sm" variant="ghost" onclick={closeCsv}>{t('common.cancel')}</Button>
      </div>
      {#if csvReport}
        <div class="csv-mode">
          <SegmentedControl
            label={t('ficha.csvMode')}
            value={csvMode}
            options={[
              { value: 'create', label: t('ficha.csvModeCreate') },
              { value: 'update', label: t('ficha.csvModeUpdate') }
            ]}
            onchange={changeCsvMode}
          />
          <p class="hint">
            {csvMode === 'update'
              ? t('ficha.csvModeUpdateHint')
              : t('ficha.csvModeCreateHint')}
          </p>
        </div>
        {#if zipImages.length}
          <p class="hint">{t('ficha.zipImages', { count: zipImages.length })}</p>
        {/if}
        <div class="csv-summary">
          <span>{t('ficha.csvRows', { count: csvReport.total })}</span>
          <span>{t('ficha.csvCreates', { count: csvReport.creates })}</span>
          <span>{t('ficha.csvUpdates', { count: csvReport.updates })}</span>
          <span class:error={csvReport.errors.length}>{t('ficha.csvErrors', { count: csvReport.errors.length })}</span>
          <span>{t('ficha.csvWarnings', { count: csvReport.warnings.length })}</span>
        </div>
        {#if csvReport.table.length}
          <div class="csv-preview">
            <table>
              <thead><tr><th>{t('ficha.csvAction')}</th>{#each csvReport.table[0] as header}<th>{header}</th>{/each}</tr></thead>
              <tbody>
                {#each csvReport.table.slice(1, 9) as row, index}
                  <tr>
                    <td>{csvReport.rows[index]?.action === 'update' ? t('ficha.csvUpdate') : t('ficha.csvCreate')}</td>
                    {#each row as cell}<td>{cell}</td>{/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if csvReport.table.length > 9}
            <p class="hint">{t('ficha.csvPreviewMore', { count: csvReport.table.length - 9 })}</p>
          {/if}
        {/if}
        {#if csvReport.errors.length}
          <div class="csv-errors" role="alert">
            <strong>{t('ficha.csvMustFix')}</strong>
            <ul>
              {#each csvReport.errors.slice(0, 20) as item}
                <li>{item.line ? `${t('ficha.csvLine', { line: item.line })} ` : ''}{item.message}</li>
              {/each}
            </ul>
            {#if fields.length === 0 && csvReport.unknownHeaders.length}
              <Button size="sm" variant="accent" onclick={deriveSchema}>
                {t('ficha.deriveSchema')}
              </Button>
            {/if}
          </div>
        {/if}
        {#if csvReport.warnings.length}
          <div class="csv-warnings">
            <ul>
              {#each csvReport.warnings.slice(0, 12) as item}
                <li>{item.line ? `${t('ficha.csvLine', { line: item.line })} ` : ''}{item.message}</li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if csvReport.creates > 0}
          <div class="csv-place">
            <label class="check">
              <input type="checkbox" bind:checked={placeImported} />
              <span>{t('ficha.csvPlace')}</span>
            </label>
            <p class="hint">{t('ficha.csvPlaceHint')}</p>
          </div>
        {/if}
        <div class="form-actions">
          <span class="hint">{t('ficha.csvHint')}</span>
          <span class="action-group">
            {#if csvReport.errors.length}
              <Button size="sm" variant="ghost" onclick={downloadErrors}>
                {t('ficha.csvDownloadErrors')}
              </Button>
            {/if}
            <Button
              size="sm"
              variant="accent"
              disabled={!csvReport.ok}
              onclick={applyCsv}
            >
              {t('ficha.csvImport', { count: csvReport.rows.length })}
            </Button>
          </span>
        </div>
      {:else}
        <p class="empty">{t('ficha.csvEmpty')}</p>
      {/if}
    </div>
  {:else}
    <div class="ficha-workspace">
      <aside class="record-list">
        <div class="record-actions">
          <input
            class="search"
            type="search"
            placeholder={t('ficha.search')}
            bind:value={search}
          />
          <Button size="sm" variant="ghost" onclick={startNew}>
            <Icon name="plus" size={12} />{t('ficha.new')}
          </Button>
          <div class="csv-actions">
            <button type="button" onclick={chooseCsv} disabled={csvBusy}>
              {t('ficha.importCsv')}
            </button>
            <button type="button" onclick={chooseZip} disabled={csvBusy}>
              {t('ficha.importZip')}
            </button>
            <button type="button" onclick={downloadTemplate}>
              {t('ficha.templateCsv')}
            </button>
            <button type="button" onclick={downloadCsv}>
              {t('ficha.exportCsv')}
            </button>
          </div>
        </div>
        <div class="record-scroll">
          {#if filteredRecords.length === 0}
            <p class="empty">{t('ficha.noRecords')}</p>
          {:else}
            {#each filteredRecords as record (record.id)}
              <button
                type="button"
                class="record-row"
                class:active={record.id === selectedId}
                onclick={() => selectRecord(record)}
              >
                <span class="record-thumb">
                  {#if record.assetId && project.assets[record.assetId]}
                    <AssetThumb
                      asset={project.assets[record.assetId]}
                      projectId={project.id}
                    />
                  {:else}
                    <span class="record-thumb-empty"
                      ><Icon name="archive" size={14} /></span
                    >
                  {/if}
                </span>
                <span class="record-copy">
                  <strong>{record.label || t('ficha.item')}</strong>
                  <span>{record.code}</span>
                </span>
                {#if record.id === selectedId}<Icon name="chevron-right" size={12} />{/if}
              </button>
            {/each}
          {/if}
        </div>
      </aside>

      <section class="record-editor">
        {#if !draft}
          <p class="empty">{t('ficha.noRecords')}</p>
        {:else}
          <div class="editor-head">
            <div>
              <span class="mono-label">{draft.id ? t('ficha.edit') : t('ficha.new')}</span
              >
              <strong>{draft.label || t('ficha.item')}</strong>
            </div>
            {#if draft.id}
              <button type="button" class="delete-button" onclick={removeRecord}>
                <Icon name="trash" size={13} />{t('ficha.delete')}
              </button>
            {/if}
          </div>

          <div class="record-grid">
            <Field
              label={t('ficha.code')}
              value={draft.code}
              oninput={(event) => (draft = { ...draft, code: event.currentTarget.value })}
            />
            <Field
              label={t('ficha.label')}
              value={draft.label}
              oninput={(event) =>
                (draft = { ...draft, label: event.currentTarget.value })}
            />
            <Select
              label={t('ficha.image')}
              value={draft.assetId}
              options={[
                { value: '', label: t('ficha.noImage') },
                ...imageAssets.map((asset) => ({ value: asset.id, label: asset.name }))
              ]}
              onchange={(value) => (draft = { ...draft, assetId: value })}
            />
            <Field
              label={t('ficha.alt')}
              value={draft.alt}
              oninput={(event) => (draft = { ...draft, alt: event.currentTarget.value })}
            />
          </div>

          {#if currentAsset}
            <div class="image-preview">
              <AssetThumb asset={currentAsset} projectId={project.id} />
              <span>{currentAsset.name}</span>
            </div>
          {:else}
            <p class="hint">{t('ficha.imageHint')}</p>
          {/if}

          {#if fields.length}
            <div class="metadata-grid">
              {#each fields as field (field.id)}
                {#if field.type === 'longtext'}
                  <label class="metadata-field">
                    <span
                      >{field.label || field.key}{#if field.required}<b>*</b>{/if}</span
                    >
                    <textarea
                      rows="3"
                      value={draft.values?.[field.id] ?? ''}
                      oninput={(event) => setValue(field.id, event.currentTarget.value)}
                    ></textarea>
                  </label>
                {:else}
                  <Field
                    label={`${field.label || field.key}${field.required ? ' *' : ''}`}
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={draft.values?.[field.id] ?? ''}
                    oninput={(event) => setValue(field.id, event.currentTarget.value)}
                  />
                {/if}
              {/each}
            </div>
          {:else}
            <p class="hint">{t('ficha.noFields')}</p>
          {/if}

          <div class="form-actions">
            <span class="hint">{t('ficha.liveHint')}</span>
            <span class="action-group">
              <Button size="sm" variant="ghost" onclick={saveRecord}
                >{t('ficha.save')}</Button
              >
              <Button size="sm" variant="accent" onclick={placeOnPage}>
                <Icon name="plus" size={12} />{t('ficha.place')}
              </Button>
            </span>
          </div>
        {/if}
      </section>
    </div>
  {/if}
</Dialog>

<style>
  .ficha-tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--line);
  }
  .ficha-tabs button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    text-transform: lowercase;
    cursor: pointer;
  }
  .ficha-tabs button.active {
    border-bottom-color: var(--accent);
    color: var(--ink);
  }
  .ficha-tabs button span {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: var(--text-3xs);
  }
  .message {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    font-size: var(--text-xs);
  }
  .message.error {
    color: var(--danger);
    border-color: var(--danger);
  }
  .message.notice {
    color: var(--ink-2);
    background: var(--panel-3);
  }
  .schema-panel,
  .record-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-width: 0;
  }
  .schema-head,
  .form-actions,
  .editor-head,
  .record-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .schema-head p,
  .hint,
  .empty {
    margin: 0;
    color: var(--muted);
    font-size: var(--text-2xs);
    line-height: 1.4;
  }
  .schema-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
  }

  .schema-code-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-2);
    border: 1px solid var(--line);
    background: var(--panel-3);
  }

  .schema-code-row > span:first-child {
    color: var(--ink);
    font-size: var(--text-xs);
    text-transform: lowercase;
  }

  .schema-code-row .hint {
    flex: 1;
  }
  .schema-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 140px 120px 116px;
    gap: var(--space-2);
    align-items: center;
    padding: 5px var(--space-2);
    border-bottom: 1px solid var(--line-soft);
  }
  .schema-row:last-child {
    border-bottom: 0;
  }
  .schema-row--head {
    color: var(--muted);
    font-size: var(--text-2xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: var(--panel-3);
  }
  .schema-row input,
  .schema-row select,
  .search {
    width: 100%;
    min-width: 0;
    height: 28px;
    padding: 0 5px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
  }
  .check {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--muted);
    font-size: var(--text-2xs);
  }
  .check input {
    width: auto;
    height: auto;
  }
  .schema-row-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .move-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid var(--line-soft);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .move-button:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .delete-button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 6px;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--danger);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    cursor: pointer;
  }
  .ficha-workspace {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr);
    gap: var(--space-4);
    min-height: 440px;
  }
  .record-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
    border-right: 1px solid var(--line-soft);
    padding-right: var(--space-3);
  }
  .record-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .csv-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .csv-actions button {
    padding: 2px 4px;
    border: 1px solid var(--line-soft);
    background: transparent;
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: var(--text-2xs);
    text-transform: lowercase;
    cursor: pointer;
  }

  .csv-actions button:hover {
    border-color: var(--line);
    color: var(--ink);
  }

  .table-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .ficha-table-wrap {
    max-height: 540px;
    overflow: auto;
    border: 1px solid var(--line);
  }

  .ficha-table-wrap table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-2xs);
    white-space: nowrap;
  }

  .ficha-table-wrap th,
  .ficha-table-wrap td {
    max-width: 260px;
    padding: 5px 7px;
    border-bottom: 1px solid var(--line-soft);
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .ficha-table-wrap th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--panel-3);
    color: var(--muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .ficha-table-wrap th b {
    color: var(--accent);
    margin-left: 2px;
  }

  .ficha-table-wrap tbody tr {
    cursor: pointer;
  }

  .ficha-table-wrap tbody tr:hover,
  .ficha-table-wrap tbody tr:focus-visible {
    background: var(--panel-3);
    outline: 1px solid var(--selection);
    outline-offset: -1px;
  }

  .ficha-table-wrap td.empty {
    color: var(--muted);
  }

  .cell-button {
    max-width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    cursor: text;
  }

  .cell-button:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .ficha-table-wrap td input {
    width: 100%;
    min-width: 90px;
    height: 24px;
    padding: 0 3px;
    border: 1px solid var(--selection);
    background: var(--panel-2);
    color: var(--ink);
    font: inherit;
  }

  .ficha-table-wrap td input.invalid,
  .ficha-table-wrap td.invalid {
    border-color: var(--danger);
  }

  .cell-error {
    display: block;
    margin-top: 2px;
    color: var(--danger);
    font-size: var(--text-3xs);
    white-space: normal;
  }

  .row-edit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 1px solid transparent;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }

  .row-edit:hover {
    border-color: var(--line);
    color: var(--ink);
  }

  .ficha-table-wrap td.mono {
    font-family: var(--font-mono);
  }

  .ficha-table-wrap td.image-cell :global(.asset-thumb) {
    width: 28px;
    height: 28px;
  }

  .image-button {
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .image-select {
    max-width: 180px;
    height: 24px;
    padding: 0 3px;
    border: 1px solid var(--selection);
    background: var(--panel-2);
    color: var(--ink);
    font: inherit;
  }

  .csv-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .csv-file {
    display: block;
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 400;
  }

  .csv-mode {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    max-width: 420px;
  }

  .csv-place {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line-soft);
    background: var(--panel-3);
  }

  .csv-place .check {
    color: var(--ink);
    font-size: var(--text-xs);
  }

  .csv-place input {
    width: auto;
    height: auto;
  }

  .csv-summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    color: var(--muted);
    font-size: var(--text-2xs);
  }

  .csv-summary .error {
    color: var(--danger);
  }

  .csv-preview {
    max-height: 220px;
    overflow: auto;
    border: 1px solid var(--line);
  }

  .csv-preview table {
    border-collapse: collapse;
    font-size: var(--text-3xs);
    white-space: nowrap;
  }

  .csv-preview th,
  .csv-preview td {
    max-width: 220px;
    padding: 3px 5px;
    border-bottom: 1px solid var(--line-soft);
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }

  .csv-preview th {
    position: sticky;
    top: 0;
    background: var(--panel-3);
    color: var(--muted);
    text-transform: uppercase;
  }

  .csv-errors,
  .csv-warnings {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--danger);
    color: var(--danger);
    font-size: var(--text-2xs);
  }

  .csv-warnings {
    border-color: var(--warning);
    color: var(--ink-2);
  }

  .csv-errors ul,
  .csv-warnings ul {
    margin: 4px 0 0;
    padding-left: 18px;
  }
  .record-scroll {
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
    max-height: 520px;
    padding-right: 2px;
  }
  .record-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 5px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .record-row:hover {
    border-color: var(--line-soft);
  }
  .record-row.active {
    border-color: var(--selection);
    background: var(--panel-3);
  }
  .record-thumb {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    overflow: hidden;
    border: 1px solid var(--line-soft);
  }
  .record-thumb :global(.asset-thumb) {
    width: 100%;
    height: 100%;
  }
  .record-thumb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--muted);
  }
  .record-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
  .record-copy strong,
  .record-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .record-copy strong {
    font-size: var(--text-xs);
    font-weight: 500;
  }
  .record-copy span {
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: var(--text-3xs);
  }
  .editor-head strong {
    display: block;
    margin-top: 2px;
    font-family: var(--font-wordmark);
    font-size: var(--text-xl);
    font-weight: var(--wordmark-weight);
  }
  .record-grid,
  .metadata-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
  .image-preview {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--muted);
    font-size: var(--text-2xs);
  }
  .image-preview :global(.asset-thumb) {
    width: 64px;
    height: 64px;
  }
  .metadata-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .metadata-field > span {
    color: var(--muted);
    font-size: var(--text-2xs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .metadata-field b {
    color: var(--accent);
    margin-left: 2px;
  }
  .metadata-field textarea {
    width: 100%;
    min-height: 70px;
    padding: 5px;
    border: 1px solid var(--line);
    background: var(--panel-2);
    color: var(--ink);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    resize: vertical;
  }
  .ficha-setting {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3);
    border: 1px solid var(--line-soft);
    background: var(--panel-3);
  }

  .ficha-setting .check {
    color: var(--ink);
    font-size: var(--text-xs);
  }

  .ficha-setting input {
    width: auto;
    height: auto;
  }

  .form-actions {
    margin-top: auto;
    padding-top: var(--space-3);
    border-top: 1px solid var(--line-soft);
  }
  .action-group {
    display: flex;
    gap: var(--space-2);
  }
</style>
