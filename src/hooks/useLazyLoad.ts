import { useEffect, useRef, useState, useCallback } from 'react'

// 圖片懶加載 Hook
export const useLazyLoad = (src: string, fallback?: string) => {
  const [imageSrc, setImageSrc] = useState<string>(fallback || '')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const currentImgRef = imgRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = src
            observer.unobserve(img)
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    )

    if (currentImgRef) {
      observer.observe(currentImgRef)
    }

    return () => {
      if (currentImgRef) {
        observer.unobserve(currentImgRef)
      }
    }
  }, [src])

  const handleLoad = () => {
    setImageSrc(src)
    setIsLoading(false)
    setError(false)
  }

  const handleError = () => {
    setError(true)
    setIsLoading(false)
    if (fallback && fallback !== src) {
      setImageSrc(fallback)
    }
  }

  return {
    imgRef,
    imageSrc,
    isLoading,
    error,
    handleLoad,
    handleError,
  }
}

// 組件懶加載 Hook
export const useLazyComponent = <T>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  deps: React.DependencyList = []
) => {
  const [Component, setComponent] = useState<React.ComponentType<T> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const memoizedImportFn = useCallback(importFn, [importFn, ...deps]);

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    memoizedImportFn()
      .then((module) => {
        setComponent(() => module.default)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err)
        setIsLoading(false)
      })
  }, [memoizedImportFn])

  return { Component, isLoading, error }
}

// 數據懶加載 Hook
export const useLazyData = <T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const memoizedFetchFn = useCallback(fetchFn, [fetchFn, ...deps]);

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    memoizedFetchFn()
      .then((result) => {
        setData(result)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err)
        setIsLoading(false)
      })
  }, [memoizedFetchFn])

  return { data, isLoading, error }
} 