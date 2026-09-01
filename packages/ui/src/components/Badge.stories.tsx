import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Composants/Badge',
  component: Badge,
  args: { children: 'Publié' },
  argTypes: {
    tone: { control: 'inline-radio', options: ['neutral', 'brand', 'good', 'danger'] },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Neutral: Story = { args: { tone: 'neutral', children: 'Brouillon' } };
export const Brand: Story = { args: { tone: 'brand', children: 'Pro' } };
export const Good: Story = { args: { tone: 'good', children: 'Payé' } };
export const Danger: Story = { args: { tone: 'danger', children: 'Suspendu' } };

export const Toutes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Badge tone="neutral">Brouillon</Badge>
      <Badge tone="brand">Pro</Badge>
      <Badge tone="good">Payé</Badge>
      <Badge tone="danger">Suspendu</Badge>
    </div>
  ),
};
