import { expect } from '@jest/globals';

import { formatRoom } from './helpers';

test('Format room', () => {
  const currentRoom = '-12345';
  expect(formatRoom(currentRoom)).toBe('s12345');
});
