import React, { useState } from 'react'
import Header from './components/Header'
import ImageUpload from './components/ImageUpload'
import CompressionOptions from './components/CompressionOptions'
import ImagePreview from './components/ImagePreview'
import DownloadSection from './components/DownloadSection'
import { useImageCompression } from './hooks/useImageCompression'
import './styles/App.css'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [compressionOptions, setCompressionOptions] = useState({
    quality: 80,
    format: 'jpeg',
    width: '',
    height: ''
  })

  const { compressImage, compressedData, loading, error } = useImageCompression()

  const handleFileSelect = (file) => {
    setSelectedFile(file)
    // Auto-detect format from file extension
    const fileExt = file.name.toLowerCase().split('.').pop()
    const formatMap = {
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'png': 'png',
      'webp': 'webp',
      'avif': 'avif'
    }
    setCompressionOptions(prev => ({
      ...prev,
      format: formatMap[fileExt] || 'jpeg'
    }))
  }

  const handleCompress = async () => {
    if (!selectedFile) {
      setError('Please select an image first')
      return
    }
    await compressImage(selectedFile, compressionOptions)
  }

  const handleOptionsChange = (newOptions) => {
    setCompressionOptions(newOptions)
  }

  const handleReset = () => {
    setSelectedFile(null)
    setCompressedData(null)
    setError(null)
    setCompressionOptions({
      quality: 80,
      format: 'jpeg',
      width: '',
      height: ''
    })
  }

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="container">
          {!selectedFile ? (
            <div className="upload-section">
              <ImageUpload onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <>
              <div className="options-section">
                <CompressionOptions
                  options={compressionOptions}
                  onChange={handleOptionsChange}
                  onCompress={handleCompress}
                  onReset={handleReset}
                  loading={loading}
                />
              </div>

              <div className="preview-section">
                <ImagePreview
                  originalFile={selectedFile}
                  compressedData={compressedData}
                  loading={loading}
                />
              </div>

              {compressedData && (
                <div className="download-section">
                  <DownloadSection compressedData={compressedData} />
                </div>
              )}
            </>
          )}

          {error && (
            <div className="error-message">
              <p>Error: {error}</p>
              <button onClick={handleReset} className="retry-btn">
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 Image Compressor. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default App