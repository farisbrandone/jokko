import type { Preview } from '@storybook/react';
import './tokens.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
