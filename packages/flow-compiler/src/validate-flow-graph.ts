import type { FlowDefinition } from '@besliswijzer/flow-schema'

export function validateFlowGraph(flow: FlowDefinition): string[] {
  const errors: string[] = []
  const entryNode = flow.nodes.find((node) => node.isEntry)

  if (!entryNode) {
    return errors
  }

  const nodeKeys = new Set(flow.nodes.map((node) => node.nodeKey))
  const nodeEdges = buildNodeEdges(flow)
  const resultReachableFrom = buildResultReachability(flow)

  const reachableNodes = collectReachableNodes(entryNode.nodeKey, nodeEdges)
  for (const nodeKey of nodeKeys) {
    if (!reachableNodes.has(nodeKey)) {
      errors.push(`Node "${nodeKey}" is unreachable from entry node "${entryNode.nodeKey}"`)
    }
  }

  for (const cycle of findNodeCycles(nodeEdges)) {
    errors.push(`Cycle detected in flow graph: ${cycle.join(' -> ')}`)
  }

  for (const nodeKey of reachableNodes) {
    if (!canReachResult(nodeKey, nodeEdges, resultReachableFrom)) {
      errors.push(`Node "${nodeKey}" has no path to a result`)
    }
  }

  const sortOrders = flow.nodes.map((node) => node.sortOrder)
  if (new Set(sortOrders).size !== sortOrders.length) {
    errors.push('Node sortOrder values must be unique')
  }

  for (const node of flow.nodes) {
    const optionSortOrders = node.options.map((option) => option.sortOrder)
    if (new Set(optionSortOrders).size !== optionSortOrders.length) {
      errors.push(`Duplicate option sortOrder values on node "${node.nodeKey}"`)
    }
  }

  return errors
}

function buildNodeEdges(flow: FlowDefinition): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>()

  for (const rule of flow.rules) {
    if (rule.ruleType !== 'branch' || !rule.targetNodeKey) {
      continue
    }

    const fromKey = rule.fromNodeKey
    if (!edges.has(fromKey)) {
      edges.set(fromKey, new Set())
    }
    edges.get(fromKey)!.add(rule.targetNodeKey)
  }

  return edges
}

function buildResultReachability(flow: FlowDefinition): Map<string, Set<string>> {
  const reachable = new Map<string, Set<string>>()

  for (const rule of flow.rules) {
    if (rule.ruleType !== 'result_map' || !rule.targetResultKey) {
      continue
    }

    if (!reachable.has(rule.fromNodeKey)) {
      reachable.set(rule.fromNodeKey, new Set())
    }
    reachable.get(rule.fromNodeKey)!.add(rule.targetResultKey)
  }

  return reachable
}

function collectReachableNodes(entryKey: string, edges: Map<string, Set<string>>): Set<string> {
  const reachable = new Set<string>()
  const queue = [entryKey]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) {
      continue
    }

    reachable.add(current)
    for (const next of edges.get(current) ?? []) {
      if (!reachable.has(next)) {
        queue.push(next)
      }
    }
  }

  return reachable
}

function findNodeCycles(edges: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const stack = new Set<string>()
  const path: string[] = []

  for (const nodeKey of edges.keys()) {
    if (!visited.has(nodeKey)) {
      dfsCycle(nodeKey, edges, visited, stack, path, cycles)
    }
  }

  return cycles
}

function dfsCycle(
  nodeKey: string,
  edges: Map<string, Set<string>>,
  visited: Set<string>,
  stack: Set<string>,
  path: string[],
  cycles: string[][],
): void {
  visited.add(nodeKey)
  stack.add(nodeKey)
  path.push(nodeKey)

  for (const next of edges.get(nodeKey) ?? []) {
    if (!visited.has(next)) {
      dfsCycle(next, edges, visited, stack, path, cycles)
      continue
    }

    if (stack.has(next)) {
      const cycleStart = path.indexOf(next)
      if (cycleStart >= 0) {
        cycles.push([...path.slice(cycleStart), next])
      }
    }
  }

  stack.delete(nodeKey)
  path.pop()
}

function canReachResult(
  startKey: string,
  nodeEdges: Map<string, Set<string>>,
  resultReachableFrom: Map<string, Set<string>>,
): boolean {
  const visited = new Set<string>()
  const queue = [startKey]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) {
      continue
    }

    visited.add(current)

    if ((resultReachableFrom.get(current)?.size ?? 0) > 0) {
      return true
    }

    for (const next of nodeEdges.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next)
      }
    }
  }

  return false
}
