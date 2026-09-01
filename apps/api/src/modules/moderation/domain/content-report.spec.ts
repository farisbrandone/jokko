import { describe, expect, it } from 'vitest';
import { statusForAction } from './content-report';

describe('statusForAction', () => {
  it('takedown → actioned', () => {
    expect(statusForAction('takedown')).toBe('actioned');
  });

  it('dismiss → dismissed', () => {
    expect(statusForAction('dismiss')).toBe('dismissed');
  });
});
