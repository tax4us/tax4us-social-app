import { useState, useEffect, useCallback } from 'react'

interface UseDataFetchingOptions {
  enabled?: boolean
  refetchOnMount?: boolean
}

interface UseDataFetchingReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDataFetching<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  options: UseDataFetchingOptions = {}
): UseDataFetchingReturn<T> {
  const { enabled = true, refetchOnMount = true } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(refetchOnMount && enabled)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setLoading(true)
    setError(null)
    
    try {
      const result = await fetcher()
      setData(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      console.error('Data fetching error:', error)
    } finally {
      setLoading(false)
    }
  }, [fetcher, enabled, ...dependencies])

  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData()
    }
  }, [fetchData, enabled, refetchOnMount])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

// Specialized hook for API endpoints
export function useApiData<T>(
  endpoint: string,
  options: UseDataFetchingOptions = {}
): UseDataFetchingReturn<T> {
  const fetcher = useCallback(async () => {
    const response = await fetch(endpoint)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }, [endpoint])

  return useDataFetching(fetcher, [endpoint], options)
}

// Hook for multiple API endpoints
export function useMultipleApiData(
  endpoints: string[],
  options: UseDataFetchingOptions = {}
): UseDataFetchingReturn<any[]> {
  const fetcher = useCallback(async () => {
    const responses = await Promise.all(
      endpoints.map(endpoint => 
        fetch(endpoint).then(res => {
          if (!res.ok) {
            throw new Error(`API request failed for ${endpoint}: ${res.status}`)
          }
          return res.json()
        })
      )
    )
    return responses
  }, [endpoints])

  return useDataFetching(fetcher, [endpoints.join(',')], options)
}