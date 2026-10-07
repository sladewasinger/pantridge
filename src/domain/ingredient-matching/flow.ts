interface Edge {
  target: number;
  reverse: number;
  capacity: number;
  initial: number;
}
export class CapacityGraph {
  private readonly nodes: Edge[][];
  constructor(count: number) {
    this.nodes = Array.from({ length: count }, () => []);
  }
  connect(source: number, target: number, capacity: number): Edge {
    const edge = { target, reverse: this.nodes[target]!.length, capacity, initial: capacity };
    const reverse = {
      target: source,
      reverse: this.nodes[source]!.length,
      capacity: 0,
      initial: 0,
    };
    this.nodes[source]!.push(edge);
    this.nodes[target]!.push(reverse);
    return edge;
  }
  private path(
    source: number,
    target: number,
  ): Map<number, { source: number; edge: Edge }> | undefined {
    const previous = new Map<number, { source: number; edge: Edge }>();
    const seen = new Set([source]);
    const queue = [source];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]!;
      for (const edge of this.nodes[current]!) {
        if (edge.capacity <= 1e-9 || seen.has(edge.target)) continue;
        previous.set(edge.target, { source: current, edge });
        if (edge.target === target) return previous;
        seen.add(edge.target);
        queue.push(edge.target);
      }
    }
    return undefined;
  }
  private augment(
    source: number,
    target: number,
    path: Map<number, { source: number; edge: Edge }>,
  ): void {
    let amount = Number.POSITIVE_INFINITY;
    for (let current = target; current !== source;) {
      const step = path.get(current)!;
      amount = Math.min(amount, step.edge.capacity);
      current = step.source;
    }
    for (let current = target; current !== source;) {
      const step = path.get(current)!;
      step.edge.capacity -= amount;
      this.nodes[step.edge.target]![step.edge.reverse]!.capacity += amount;
      current = step.source;
    }
  }
  allocate(source: number, target: number): void {
    let path = this.path(source, target);
    while (path) {
      this.augment(source, target, path);
      path = this.path(source, target);
    }
  }
}
