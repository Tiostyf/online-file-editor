import React from 'react'

const DownloadSection = ({ compressedData }) => {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `http://localhost:3001${compressedData.downloadUrl}`
    link.download = `compressed-image.${compressedData.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="download-section">
      <div className="download-card">
        <div className="download-info">
          <h3>🎉 Compression Complete!</h3>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Original Size:</span>
              <span className="stat-value">
                {formatFileSize(compressedData.originalSize)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Compressed Size:</span>
              <span className="stat-value success">
                {formatFileSize(compressedData.compressedSize)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Reduction:</span>
              <span className="stat-value highlight">
                {compressedData.compressionRatio}%
              </span>
            </div>
          </div>
        </div>
        
        <button onClick={handleDownload} className="download-btn">
          📥 Download Compressed Image
        </button>
        
        <div className="format-info">
          Format: {compressedData.format.toUpperCase()} • 
          Quality: Optimized
        </div>
      </div>
    </div>
  )
}

export default DownloadSection