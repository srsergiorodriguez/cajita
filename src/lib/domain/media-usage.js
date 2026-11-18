/**
 * Count every project reference to an asset. A medium is only deletable when
 * all counts are zero: page elements, composition children, fichas, drawings,
 * and fonts.
 */
export function assetUsageMap(project) {
  const usage = new Map();
  const bump = (assetId, key, reference = null) => {
    if (!assetId) return;
    const current = usage.get(assetId) ?? {
      elements: 0,
      compositions: 0,
      fichas: 0,
      drawings: 0,
      fonts: 0,
      references: []
    };
    current[key] += 1;
    if (
      reference &&
      !current.references.some(
        (item) => item.kind === reference.kind && item.label === reference.label
      )
    ) {
      current.references.push(reference);
    }
    usage.set(assetId, current);
  };

  for (const page of project?.pages ?? []) {
    for (const element of page.elements ?? []) {
      if (element.assetId) {
        bump(element.assetId, 'elements', { kind: 'page', label: page.title });
      }
      for (const frame of element.composition?.frames ?? []) {
        for (const child of frame.children ?? []) {
          if (child.assetId) {
            bump(child.assetId, 'compositions', {
              kind: 'composition',
              label: `${page.title} · ${frame.name}`
            });
          }
        }
      }
    }
  }
  for (const ficha of Object.values(project?.fichas ?? {})) {
    bump(ficha.assetId, 'fichas', {
      kind: 'ficha',
      label: ficha.label || ficha.code || 'ficha'
    });
  }
  for (const drawing of Object.values(project?.drawings ?? {})) {
    bump(drawing.assetId, 'drawings', { kind: 'drawing', label: 'dibujo' });
  }
  for (const font of Object.values(project?.fonts ?? {})) {
    bump(font.assetId, 'fonts', { kind: 'font', label: font.name || 'tipografía' });
  }
  return usage;
}

export function assetUsage(project, assetId) {
  return (
    assetUsageMap(project).get(assetId) ?? {
      elements: 0,
      compositions: 0,
      fichas: 0,
      drawings: 0,
      fonts: 0,
      references: []
    }
  );
}

export function assetUseCount(usage) {
  return (
    (usage?.elements ?? 0) +
    (usage?.compositions ?? 0) +
    (usage?.fichas ?? 0) +
    (usage?.drawings ?? 0) +
    (usage?.fonts ?? 0)
  );
}
