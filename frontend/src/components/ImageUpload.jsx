import React, { useRef } from 'react'

const ImageUpload = ({ onFileSelect, selectedFile }) => {
  const fileInputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="image-upload">
      <div
        className={`upload-area ${selectedFile ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInput}
          className="file-input"
        />
        
        <div className="upload-content">
          {selectedFile ? (
            <>
              <div className="file-info">
                <span className="file-icon">📁</span>
                <div className="file-details">
                  <h3>{selectedFile.name}</h3>
                  <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                className="change-file-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Change File
              </button>
            </>
          ) : (
            <>
              <div className="upload-icon">📤</div>
              <h2>Drag & Drop your image here</h2>
              <p>or click to browse files</p>
              <div className="supported-formats">
                Supports: JPG, PNG, WebP, AVIF
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImageUpload