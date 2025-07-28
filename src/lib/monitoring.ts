// Performance monitoring utilities

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Measure function execution time
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    return fn().finally(() => {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
    })
  }

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now()
    try {
      return fn()
    } finally {
      const duration = performance.now() - start
      this.recordMetric(name, duration)
    }
  }

  private recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    const metrics = this.metrics.get(name)!
    metrics.push(duration)
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift()
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    }
  }

  getMetrics(name: string) {
    const metrics = this.metrics.get(name) || []
    if (metrics.length === 0) return null

    const avg = metrics.reduce((a, b) => a + b, 0) / metrics.length
    const min = Math.min(...metrics)
    const max = Math.max(...metrics)

    return { avg, min, max, count: metrics.length }
  }

  getAllMetrics() {
    const result: Record<string, ReturnType<typeof this.getMetrics>> = {}
    for (const [name, _] of this.metrics) {
      result[name] = this.getMetrics(name)
    }
    return result
  }

  private observers: PerformanceObserver[] = []

  // Web Vitals monitoring with proper cleanup
  observeWebVitals() {
    if (typeof window === 'undefined') return

    try {
      // Observe Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('LCP', entry.startTime)
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // Observe First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming
          this.recordMetric('FID', fidEntry.processingStart - entry.startTime)
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // Observe Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const clsEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
          if (!clsEntry.hadRecentInput) {
            this.recordMetric('CLS', clsEntry.value || 0)
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)
    } catch (error) {
      console.warn('Failed to set up performance observers:', error)
    }
  }

  // Disconnect all observers to prevent memory leaks
  disconnect() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('Failed to disconnect performance observer:', error)
      }
    })
    this.observers = []
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return performanceMonitor
}