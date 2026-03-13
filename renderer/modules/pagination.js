export function setPageNumbers(pages) {
  (pages || []).forEach((page, index) => {
    const pageNumber = index + 1;
    page.setAttribute('data-page-number', String(pageNumber));
    page.classList.remove('page-left', 'page-right');
    page.classList.add(pageNumber % 2 === 0 ? 'page-left' : 'page-right');
    page.querySelectorAll('.page-num').forEach((node) => {
      node.textContent = 'P.' + String(pageNumber).padStart(2, '0');
    });
  });
}
