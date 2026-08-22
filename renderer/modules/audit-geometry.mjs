function finite(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

/**
 * Sum the unoccupied vertical intervals between a flow surface and its footer.
 * Middle rectangles are printed content, not slack; every positive gap around
 * them remains visible to the audit.
 */
export function verticalFlowSlackPx(startRect, middleRects, endRect) {
  if (!startRect || !endRect) return null;
  let cursor = finite(startRect.bottom);
  let slack = 0;
  (middleRects || []).forEach((rect) => {
    if (!rect) return;
    const top = finite(rect.top);
    const bottom = finite(rect.bottom);
    if (bottom <= cursor) return;
    slack += Math.max(0, top - cursor);
    cursor = Math.max(cursor, bottom);
  });
  slack += Math.max(0, finite(endRect.top) - cursor);
  return slack;
}

/** Safari can retain FontFaceSet.status="loading" after every observable face
 * has settled. Prefer the faces when the browser exposes them; fall back to
 * the aggregate flag only when it does not. */
export function fontFacesStillLoading(fontSet) {
  if (!fontSet) return false;
  if (typeof fontSet.forEach === 'function') {
    let observed = false;
    let loading = false;
    fontSet.forEach((face) => {
      observed = true;
      if (face && face.status === 'loading') loading = true;
    });
    if (observed) return loading;
  }
  return fontSet.status !== 'loaded';
}
