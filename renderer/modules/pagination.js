function ensurePageNumberNodes(page) {
  const existing = [...page.querySelectorAll('.page-num')];
  if (existing.length > 0) return existing;

  let folio = page.querySelector(':scope > .page-folio');
  if (!folio) {
    folio = document.createElement('div');
    folio.className = 'page-folio';
    const number = document.createElement('span');
    number.className = 'page-num';
    folio.appendChild(number);
    page.appendChild(folio);
  }

  return [...folio.querySelectorAll('.page-num')];
}

export function setPageNumbers(pages) {
  (pages || []).forEach((page, index) => {
    const pageNumber = index + 1;
    page.setAttribute('data-page-number', String(pageNumber));
    page.classList.remove('page-left', 'page-right');
    page.classList.add(pageNumber % 2 === 0 ? 'page-left' : 'page-right');

    ensurePageNumberNodes(page).forEach((node) => {
      node.textContent = 'P.' + String(pageNumber).padStart(2, '0');
    });
  });
}
