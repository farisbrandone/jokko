import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'Composants/Card',
  component: Card,
  argTypes: { flush: { control: 'boolean' } },
};
export default meta;

type Story = StoryObj<typeof Card>;

export const Simple: Story = {
  render: (args) => (
    <Card {...args} style={{ width: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Chez Awa</strong>
        <Badge tone="brand">Pro</Badge>
      </div>
      <p style={{ margin: '8px 0 12px', color: 'var(--color-muted)', fontSize: 14 }}>
        12 produits · 3 conversations ouvertes
      </p>
      <Button size="sm">Ouvrir la boutique</Button>
    </Card>
  ),
};
