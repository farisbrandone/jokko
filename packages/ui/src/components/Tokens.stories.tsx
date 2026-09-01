import type { Meta, StoryObj } from '@storybook/react';

const COLORS = [
  'bg',
  'surface',
  'surface-2',
  'border',
  'ink',
  'muted',
  'faint',
  'brand',
  'brand-ink',
  'brand-soft',
  'good',
  'danger',
];

function Swatches() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {COLORS.map((name) => (
        <div
          key={name}
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 56, background: `var(--color-${name})` }} />
          <div style={{ padding: '6px 8px', fontSize: 12 }}>
            <code>--color-{name}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

const meta: Meta = { title: 'Fondations/Tokens' };
export default meta;

type Story = StoryObj;

export const Couleurs: Story = { render: () => <Swatches /> };

export const Rayons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16 }}>
      {(['--radius-btn', '--radius-card'] as const).map((r) => (
        <div key={r} style={{ textAlign: 'center', fontSize: 12 }}>
          <div
            style={{
              width: 96,
              height: 96,
              background: 'var(--color-brand-soft)',
              border: '1px solid var(--color-border)',
              borderRadius: `var(${r})`,
            }}
          />
          <code>{r}</code>
        </div>
      ))}
    </div>
  ),
};
