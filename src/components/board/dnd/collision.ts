import {
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  getFirstCollision,
} from '@dnd-kit/core';
import type { UniqueIdentifier } from '@dnd-kit/core';

/**
 * Container-first collision detection strategy
 * Based on MultipleContainers reference implementation
 */
export function createContainerCollisionDetection(
  activeId: UniqueIdentifier | null,
  containerIds: Set<UniqueIdentifier>,
  lastOverIdRef: { current: UniqueIdentifier | null },
  recentlyMovedRef: { current: boolean },
  itemsByContainer: Record<string, UniqueIdentifier[]>
): CollisionDetection {
  return (args) => {
    // If dragging a container, use closestCenter for containers only
    if (activeId && containerIds.has(activeId)) {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) =>
          containerIds.has(c.id)
        ),
      });
    }

    // For items, use pointer-first collision
    const pointerIntersections = pointerWithin(args);
    const intersections =
      pointerIntersections.length > 0
        ? pointerIntersections
        : rectIntersection(args);

    let overId = getFirstCollision(intersections, 'id');

    if (overId != null) {
      // If over trash, return it
      if (overId === 'trash') {
        return intersections;
      }

      // If over a container with items, find the closest item within
      if (containerIds.has(overId)) {
        const containerItems = itemsByContainer[overId as string] || [];
        if (containerItems.length > 0) {
          // Find closest item within the container
          overId = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) =>
                container.id !== overId && containerItems.includes(container.id)
            ),
          })[0]?.id;
        }
      }

      lastOverIdRef.current = overId;
      return [{ id: overId }];
    }

    // Fallback to last known overId if we recently moved
    if (recentlyMovedRef.current) {
      lastOverIdRef.current = activeId;
    }

    return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
  };
}

