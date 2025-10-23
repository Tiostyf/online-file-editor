import { useState } from 'react'

export const useImageCompression = () => {
  const [compressedData, setCompressedData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const compressImage = async (file, options) => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('quality', options.quality)
      formData.append('format', options.format)
      
      if (options.width) formData.append('width', options.width)
      if (options.height) formData.append('height', options.height)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout

      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCompressedData(data)
      } else {
        throw new Error(data.error || 'Compression failed')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timeout. Please try again.')
      } else {
        setError(err.message || 'Something went wrong')
      }
      setCompressedData(null)
    } finally {
      setLoading(false)
    }
  }

  const setErrorMessage = (msg) => setError(msg)

  const reset = () => {
    setCompressedData(null)
    setError(null)
    setLoading(false)
  }

  return {
    compressImage,
    compressedData,
    loading,
    error,
    setErrorMessage,
    reset
  }
}