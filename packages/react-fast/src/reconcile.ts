const reconcileArrays = (parentNode: Node, current: ChildNode[], next: ChildNode[]): void => {
  let nextLength = next.length,
    currentEnd = current.length,
    nextEnd = nextLength,
    currentStart = 0,
    nextStart = 0,
    afterNode = current[currentEnd - 1]?.nextSibling ?? null,
    nodeIndexMap: Map<Node, number> | null = null;

  while (currentStart < currentEnd || nextStart < nextEnd) {
    if (current[currentStart] === next[nextStart]) {
      currentStart++;
      nextStart++;
      continue;
    }

    while (current[currentEnd - 1] === next[nextEnd - 1]) {
      currentEnd--;
      nextEnd--;
    }

    if (currentEnd === currentStart) {
      const referenceNode =
        nextEnd < nextLength
          ? nextStart
            ? next[nextStart - 1]!.nextSibling
            : next[nextEnd - nextStart]!
          : afterNode;

      while (nextStart < nextEnd) parentNode.insertBefore(next[nextStart++]!, referenceNode);
    } else if (nextEnd === nextStart) {
      while (currentStart < currentEnd) {
        if (!nodeIndexMap || !nodeIndexMap.has(current[currentStart]!))
          current[currentStart]!.remove();
        currentStart++;
      }
    } else if (
      current[currentStart] === next[nextEnd - 1] &&
      next[nextStart] === current[currentEnd - 1]
    ) {
      const referenceNode = current[--currentEnd]!.nextSibling;
      parentNode.insertBefore(next[nextStart++]!, current[currentStart++]!.nextSibling);
      parentNode.insertBefore(next[--nextEnd]!, referenceNode);
      current[currentEnd] = next[nextEnd]!;
    } else {
      if (!nodeIndexMap) {
        nodeIndexMap = new Map();
        let scanIndex = nextStart;
        while (scanIndex < nextEnd) nodeIndexMap.set(next[scanIndex]!, scanIndex++);
      }

      const foundIndex = nodeIndexMap.get(current[currentStart]!);
      if (foundIndex != null) {
        if (nextStart < foundIndex && foundIndex < nextEnd) {
          let scanIndex = currentStart,
            sequenceLength = 1,
            mappedIndex: number | undefined;

          while (++scanIndex < currentEnd && scanIndex < nextEnd) {
            if (
              (mappedIndex = nodeIndexMap.get(current[scanIndex]!)) == null ||
              mappedIndex !== foundIndex + sequenceLength
            )
              break;
            sequenceLength++;
          }

          if (sequenceLength > foundIndex - nextStart) {
            const referenceNode = current[currentStart]!;
            while (nextStart < foundIndex)
              parentNode.insertBefore(next[nextStart++]!, referenceNode);
          } else parentNode.replaceChild(next[nextStart++]!, current[currentStart++]!);
        } else currentStart++;
      } else current[currentStart++]!.remove();
    }
  }
};

export default reconcileArrays;
