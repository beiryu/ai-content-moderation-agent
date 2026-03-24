import * as React from "react"

// @see https://usehooks.com/useQueue.
export function useQueue(initialValue = []) {
  const [queue, setQueue] = React.useState<any[]>(initialValue)

  const add = React.useCallback((element: any) => {
    setQueue((q) => [...q, element])
  }, [])

  const remove = React.useCallback(() => {
    let removedElement

    setQueue(([first, ...q]) => {
      removedElement = first
      return q
    })

    return removedElement
  }, [])

  const clear = React.useCallback(() => {
    setQueue([])
  }, [])

  return {
    add,
    remove,
    clear,
    first: queue[0],
    last: queue[queue.length - 1],
    size: queue.length,
    queue,
  }
}
