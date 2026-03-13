import { make } from './dom.js?v=24';

export function createBoundedPage(pageType, frameClass, options = {}) {
  const pageClasses = ['booklet-page'];
  if (options.pageClass) pageClasses.push(options.pageClass);

  const page = make(options.pageTag || 'section', pageClasses.join(' '));
  if (pageType) {
    page.setAttribute('data-page-type', pageType);
  }

  const boundaryClasses = ['page-boundary'];
  if (options.boundaryClass) boundaryClasses.push(options.boundaryClass);
  const boundary = make('div', boundaryClasses.join(' '));
  boundary.setAttribute('data-page-boundary', 'true');
  boundary.setAttribute('data-boundary-role', options.boundaryRole || pageType || 'page');

  const frameClasses = ['page-frame'];
  if (frameClass) frameClasses.push(frameClass);
  const frame = make(options.frameTag || 'div', frameClasses.join(' '));

  if (options.layoutVariant) {
    frame.setAttribute('data-layout-variant', options.layoutVariant);
  }

  boundary.appendChild(frame);
  page.appendChild(boundary);

  return {
    page,
    boundary,
    frame
  };
}

export function getPageBoundary(page) {
  return page ? page.querySelector(':scope > .page-boundary') : null;
}

export function getPageFrame(page) {
  const boundary = getPageBoundary(page);
  return boundary ? boundary.firstElementChild : null;
}
