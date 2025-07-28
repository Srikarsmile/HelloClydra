// Performance utilities for optimizing the app

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Memoize expensive calculations with cache size limit and stable serialization
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T, maxCacheSize: number = 100): T {
  const cache = new Map()
  const keyOrder: string[] = []

  // Stable serialization that handles circular references and normalizes object property order
  const stableStringify = (obj: unknown): string => {
    const seen = new WeakSet()
    
    const replacer = (key: string, value: unknown) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
        
        // Sort object keys for consistent serialization
        if (Array.isArray(value)) {
          return value
        } else {
          const sorted: Record<string, unknown> = {}
          Object.keys(value).sort().forEach(k => {
            sorted[k] = (value as Record<string, unknown>)[k]
          })
          return sorted
        }
      }
      return value
    }
    
    try {
      return JSON.stringify(obj, replacer)
    } catch {
      return String(obj)
    }
  }

  return ((...args: Parameters<T>) => {
    const key = stableStringify(args)
    
    if (cache.has(key)) {
      // Move to end (most recently used)
      const index = keyOrder.indexOf(key)
      if (index > -1) {
        keyOrder.splice(index, 1)
        keyOrder.push(key)
      }
      return cache.get(key)
    }
    
    const result = fn(...args)
    
    // Evict oldest entries if cache is full
    if (cache.size >= maxCacheSize) {
      const oldestKey = keyOrder.shift()
      if (oldestKey) {
        cache.delete(oldestKey)
      }
    }
    
    cache.set(key, result)
    keyOrder.push(key)
    return result
  }) as T
}

// Virtual scrolling helper for large lists
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
) {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const end = Math.min(totalItems, start + visibleCount + overscan * 2)
  
  return { start, end }
}