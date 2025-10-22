import React from 'react'

const ImagePreview = ({ originalFile, compressedData, loading }) => {
  const originalUrl = URL.createObjectURL(originalFile)

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="image-preview">
      <h3>Image Preview</h3>
      
      <div className="preview-comparison">
        <div className="preview-item">
          <h4>Original</h4>
          <div className="image-container">
            <img src={originalUrl} alt="Original" />
          </div>
          <div className="file-info">
            <p>Size: {formatFileSize(originalFile.size)}</p>
            <p>Format: {originalFile.name.split('.').pop().toUpperCase()}</p>
          </div>
        </div>

        <div className="preview-item">
          <h4>Compressed</h4>
          <div className="image-container">
            {loading ? (
              <div className="loading-spinner">Compressing...</div>
            ) : compressedData ? (
              <img 
                src={`http://localhost:3001${compressedData.downloadUrl}`} 
                alt="Compressed" 
              />
            ) : (
              <div className="placeholder">Compressed image will appear here</div>
            )}
          </div>
          {compressedData && (
            <div className="file-info">
              <p>Size: {formatFileSize(compressedData.compressedSize)}</p>
              <p>Format: {compressedData.format.toUpperCase()}</p>
              <p className="savings">
                Savings: {compressedData.compressionRatio}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImagePreview