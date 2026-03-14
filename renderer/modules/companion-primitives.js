import { make } from './dom.js?v=44';
import { createBoundedPage } from './page-shell.js?v=44';
import {
  renderCompanionComponent,
  renderGameplayClocks
} from './field-ops-primitives.js?v=44';

export function renderCompanionSpreadPage(model) {
  const scaffold = createBoundedPage(model.pageType, 'companion-page', {
    boundaryRole: 'play-grid',
    layoutVariant: model.layoutVariant || 'balanced'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  frame.setAttribute('data-clock-family', ((model.mechanicProfile || {}).clockFamily) || 'none');
  frame.setAttribute('data-companion-count', String((model.companionComponents || []).length));
  frame.setAttribute('data-spread-side', model.side || 'left');

  const header = make('header', 'rp-header');
  header.appendChild(make('span', '', model.headerTitle || 'Companion Surface'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const kicker = make('div', 'week-kicker');
  kicker.textContent = [
    model.weekLabel || '',
    'companion spread',
    (model.side || 'left') + ' page'
  ].filter(Boolean).join(' · ');
  frame.appendChild(kicker);
  frame.appendChild(make('h2', 'week-title companion-title', model.title || 'Companion Surface'));

  if (model.subtitle) {
    frame.appendChild(make('div', 'companion-intro', model.subtitle));
  }

  const body = make('div', 'companion-page-body');

  if ((model.gameplayClocks || []).length) {
    const clockZone = make('section', 'companion-clock-zone');
    clockZone.appendChild(renderGameplayClocks(model.gameplayClocks));
    body.appendChild(clockZone);
  }

  const stack = make('section', 'companion-stack');
  if ((model.companionComponents || []).length) {
    (model.companionComponents || []).forEach((component) => {
      stack.appendChild(renderCompanionComponent(component));
    });
  } else {
    stack.appendChild(make('div', 'companion-empty-note', 'No additional companion elements assigned to this page.'));
  }
  body.appendChild(stack);

  frame.appendChild(body);
  return page;
}
