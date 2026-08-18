/**
 * rules-block.js — Rules spread atom (left or right side)
 *
 * Wraps booklet-primitives.js renderRulesLeftPage() and renderSealedPage()
 * plus booklet-models.js model builders into the atom interface.
 *
 * Data shape: { side, rules, meta }
 *   - side: 'left' or 'right'
 *   - For 'left': the full booklet data object (for buildRulesLeftPageModelWithVariant)
 *   - For 'right': the full booklet data object (for buildSealedPageModel)
 *
 * These are full-page atoms. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { PAGE_BUDGET } from '../engine/page-spec.js';
import { make } from '../dom.js';
import {
  buildRulesLeftPageModelWithVariant,
  buildSealedPageModel,
} from '../booklet-models.js';
import {
  renderRulesLeftPage,
  renderSealedPage,
} from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = PAGE_BUDGET.heightPx;

/**
 * THE ESTABLISHMENT SURFACE (W1, 2026-08-18) — `rulesSpread.orientation`.
 *
 * The author's verdict on the first delivered book was that he did not know
 * what was being said. Half of that is prose; the other half is that the book
 * never established anything — documents performed at a reader who had not been
 * told where he was or who anyone was, and the rules page taught procedure
 * against a fiction nobody had handed him.
 *
 * `situation` is the plain-words paragraph; `cast` is the named-persons table.
 * Both print ABOVE the procedure, because that is the order a stranger needs
 * them in: who and what, then how.
 *
 * BUILT HERE RATHER THAN IN booklet-primitives.js, and the seam is deliberate:
 * `renderRulesLeftPage()` renders a MODEL, and the orientation is read straight
 * off the booklet, so threading it through the model builder would add a field
 * to two files to carry a block that no other caller wants. The insertion point
 * is named (`.rules-body`), not positional.
 *
 * ESTIMATE-NEUTRAL BY CONSTRUCTION: this atom is `full-page` / `canShare:false`
 * and estimates PAGE_BUDGET.heightPx whatever it contains, so nothing here can
 * detune the solver. What it CAN do is overflow a page that is already dense —
 * `.rules-left` is `overflow:hidden` — which is why the prompt caps the
 * situation at 700 characters and the cast at eight rows, and why the CSS keeps
 * the table at instrument size.
 */
function renderOrientation(orientation) {
  const situation = String((orientation && orientation.situation) || '').trim();
  const cast = (orientation && Array.isArray(orientation.cast)) ? orientation.cast : [];
  const rows = cast
    .map((entry) => ({
      name: String((entry && entry.name) || '').trim(),
      role: String((entry && entry.role) || '').trim(),
      note: String((entry && entry.note) || '').trim(),
    }))
    // A row with no name is not a half-row, it is a typo that reads as a
    // record — the normalizeManifestPointer rule, applied here.
    .filter((entry) => entry.name);
  if (!situation && !rows.length) return null;

  const block = make('section', 'rules-orientation');
  if (situation) {
    block.appendChild(make('p', 'rules-orientation-situation', situation));
  }
  if (rows.length) {
    const table = make('div', 'rules-orientation-cast');
    // The label is chrome, not fiction: it names what the table IS. The shell's
    // own dress reaches it through the theme tokens on the page, never through
    // a string chosen here.
    table.appendChild(make('div', 'rules-orientation-label', 'Persons named in this file'));
    rows.forEach((entry) => {
      const row = make('div', 'rules-orientation-row');
      row.appendChild(make('span', 'rules-orientation-name', entry.name));
      row.appendChild(make('span', 'rules-orientation-role', entry.role));
      // THE THIRD CELL IS ALWAYS EMITTED, even empty. The rows are
      // `display:contents` over a three-column grid, so a row that contributed
      // two cells would let the NEXT row's name fall into the third column and
      // every name below it would step sideways — a silent misalignment on the
      // one page whose whole job is being scannable.
      row.appendChild(make('span', 'rules-orientation-note', entry.note));
      table.appendChild(row);
    });
    block.appendChild(table);
  }
  return block;
}

registerAtom('rules-block', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const side = data.side || 'left';
    const d = density ?? 0;

    // adapter wraps as { side, data: <bookletData> }
    const bookletData = data.data || data;

    // Map density to layout variant so CSS compact/dense selectors activate
    const layoutVariant = d >= 0.6 ? 'dense' : d >= 0.3 ? 'compact' : 'standard';

    if (side === 'right') {
      const sealedModel = buildSealedPageModel(bookletData, layoutVariant);
      return renderSealedPage(sealedModel);
    }

    const rulesModel = buildRulesLeftPageModelWithVariant(bookletData, layoutVariant);
    const page = renderRulesLeftPage(rulesModel);

    // Presence-guarded: a book with no orientation prints byte-identically to
    // the way it printed before this surface existed, which is what makes the
    // schema field safe to be additive-optional.
    const orientation = renderOrientation(
      ((bookletData || {}).rulesSpread || {}).orientation);
    if (orientation) {
      // Above the procedure — who and what, then how. `.rules-body` is the
      // named anchor; if it is ever renamed the block appends at the end of the
      // frame rather than vanishing, because a missing establishing shot is
      // worse than a mis-placed one.
      const body = page.querySelector('.rules-body');
      if (body && body.parentNode) body.parentNode.insertBefore(orientation, body);
      else (page.querySelector('.page-frame') || page).appendChild(orientation);
    }
    return page;
  },
});

export default 'rules-block';
