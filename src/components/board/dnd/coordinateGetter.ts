import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

/**
 * Keyboard coordinate getter for keyboard navigation during drag
 * Based on MultipleContainers reference
 */
export const multipleContainersCoordinateGetter: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates }
) => {
  const step = 25;
  switch (event.code) {
    case 'ArrowDown':
      return { x: currentCoordinates.x, y: currentCoordinates.y + step };
    case 'ArrowUp':
      return { x: currentCoordinates.x, y: currentCoordinates.y - step };
    case 'ArrowLeft':
      return { x: currentCoordinates.x - step, y: currentCoordinates.y };
    case 'ArrowRight':
      return { x: currentCoordinates.x + step, y: currentCoordinates.y };
    default:
      return undefined;
  }
};

