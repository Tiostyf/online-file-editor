import React from 'react'

const CompressionOptions = ({ options, onChange, onCompress, loading }) => {
  const handleQualityChange = (e) => {
    onChange({
      ...options,
      quality: parseInt(e.target.value)
    })
  }

  const handleFormatChange = (e) => {
    onChange({
      ...options,
      format: e.target.value
    })
  }

  const handleDimensionChange = (dimension, value) => {
    onChange({
      ...options,
      [dimension]: value ? parseInt(value) : ''
    })
  }

  return (
    <div className="compression-options">
      <h3>Compression Settings</h3>
      
      <div className="options-grid">
        <div className="option-group">
          <label htmlFor="quality">Quality: {options.quality}%</label>
          <input
            id="quality"
            type="range"
            min="10"
            max="100"
            value={options.quality}
            onChange={handleQualityChange}
            className="slider"
          />
          <div className="slider-labels">
            <span>Smaller File</span>
            <span>Better Quality</span>
          </div>
        </div>

        <div className="option-group">
          <label htmlFor="format">Output Format</label>
          <select
            id="format"
            value={options.format}
            onChange={handleFormatChange}
            className="format-select"
          >
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
          </select>
        </div>

        <div className="option-group dimensions">
          <label>Resize (optional)</label>
          <div className="dimension-inputs">
            <div className="dimension">
              <input
                type="number"
                placeholder="Width"
                value={options.width}
                onChange={(e) => handleDimensionChange('width', e.target.value)}
                min="1"
              />
              <span>px</span>
            </div>
            <span className="dimension-separator">×</span>
            <div className="dimension">
              <input
                type="number"
                placeholder="Height"
                value={options.height}
                onChange={(e) => handleDimensionChange('height', e.target.value)}
                min="1"
              />
              <span>px</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onCompress}
        disabled={loading}
        className={`compress-btn ${loading ? 'loading' : ''}`}
      >
        {loading ? 'Compressing...' : 'Compress Image'}
      </button>
    </div>
  )
}

export default CompressionOptions