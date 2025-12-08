const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const sharp = require('sharp');
const apiManager = require('./api-manager');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Optimized media processing with caching and resource management
 */
class MediaProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.processingQueue = new Map();
    this.activeProcesses = new Set();
    this.maxConcurrentProcesses = 3;
    
    // Ensure temp directory exists
    this.ensureTempDir();
    
    // Cleanup old files on startup
    this.cleanupOldFiles();
    
    // Performance metrics
    this.stats = {
      processedFiles: 0,
      failedProcesses: 0,
      totalProcessingTime: 0,
      cacheHits: 0,
      tempFilesCreated: 0,
      tempFilesDeleted: 0
    };
  }

  /**
   * Ensure temp directory exists
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clean up old temporary files
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour
      
      let cleaned = 0;
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
          this.stats.tempFilesDeleted++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`Media Processor: Cleaned ${cleaned} old temp files`);
      }
    } catch (error) {
      console.error('Media Processor: Error cleaning old files:', error.message);
    }
  }

  /**
   * Generate unique filename for temp files
   */
  generateTempFilename(prefix, extension) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return path.join(this.tempDir, `${prefix}_${timestamp}_${random}.${extension}`);
  }

  /**
   * Download media with caching and optimization
   */
  async downloadMedia(url, options = {}) {
    const {
      maxSize = 50 * 1024 * 1024, // 50MB
      timeout = 30000,
      useCache = true
    } = options;

    try {
      // Check if already processing this URL
      if (this.processingQueue.has(url)) {
        return await this.processingQueue.get(url);
      }

      // Create processing promise
      const processingPromise = this._downloadMediaInternal(url, { maxSize, timeout, useCache });
      this.processingQueue.set(url, processingPromise);

      const result = await processingPromise;
      
      // Clean up processing queue
      this.processingQueue.delete(url);
      
      return result;

    } catch (error) {
      this.processingQueue.delete(url);
      this.stats.failedProcesses++;
      throw error;
    }
  }

  /**
   * Internal media download implementation
   */
  async _downloadMediaInternal(url, options) {
    const startTime = Date.now();
    
    try {
      const buffer = await apiManager.downloadMedia(url, {
        maxContentLength: options.maxSize,
        timeout: options.timeout
      });

      this.stats.processedFiles++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      
      return Buffer.from(buffer);

    } catch (error) {
      console.error('Media Processor: Download failed:', error.message);
      throw error;
    }
  }

  /**
   * Convert image to sticker format with optimization
   */
  async imageToSticker(inputBuffer, options = {}) {
    const {
      width = 512,
      height = 512,
      quality = 80,
      format = 'webp'
    } = options;

    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      throw new Error('Too many concurrent processes. Please try again later.');
    }

    const processId = `sticker_${Date.now()}`;
    this.activeProcesses.add(processId);

    try {
      const startTime = Date.now();
      
      // Use Sharp for image processing (faster than FFmpeg for images)
      const processedBuffer = await sharp(inputBuffer)
        .resize(width, height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality })
        .toBuffer();

      this.stats.processedFiles++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      
      return processedBuffer;

    } finally {
      this.activeProcesses.delete(processId);
    }
  }

  /**
   * Convert video to sticker with FFmpeg
   */
  async videoToSticker(inputBuffer, options = {}) {
    const {
      width = 512,
      height = 512,
      duration = 10,
      fps = 15
    } = options;

    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      throw new Error('Too many concurrent processes. Please try again later.');
    }

    const processId = `video_sticker_${Date.now()}`;
    this.activeProcesses.add(processId);

    let tempInput = null;
    let tempOutput = null;

    try {
      const startTime = Date.now();
      
      // Create temp files
      tempInput = this.generateTempFilename('video_input', 'mp4');
      tempOutput = this.generateTempFilename('video_output', 'webp');
      
      // Write input buffer to temp file
      fs.writeFileSync(tempInput, inputBuffer);
      this.stats.tempFilesCreated++;

      // Process with FFmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .outputOptions([
            '-vcodec', 'libwebp',
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,fps=${fps}`,
            '-lossless', '0',
            '-compression_level', '6',
            '-q:v', '50',
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-t', duration.toString()
          ])
          .toFormat('webp')
          .save(tempOutput)
          .on('end', resolve)
          .on('error', reject);
      });

      // Read processed file
      const processedBuffer = fs.readFileSync(tempOutput);
      
      this.stats.processedFiles++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      
      return processedBuffer;

    } finally {
      this.activeProcesses.delete(processId);
      
      // Clean up temp files
      this.cleanupTempFiles([tempInput, tempOutput]);
    }
  }

  /**
   * Convert media to audio format
   */
  async toAudio(inputBuffer, options = {}) {
    const {
      format = 'mp3',
      bitrate = '128k',
      duration = null
    } = options;

    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      throw new Error('Too many concurrent processes. Please try again later.');
    }

    const processId = `audio_${Date.now()}`;
    this.activeProcesses.add(processId);

    let tempInput = null;
    let tempOutput = null;

    try {
      const startTime = Date.now();
      
      // Create temp files
      tempInput = this.generateTempFilename('audio_input', 'tmp');
      tempOutput = this.generateTempFilename('audio_output', format);
      
      // Write input buffer to temp file
      fs.writeFileSync(tempInput, inputBuffer);
      this.stats.tempFilesCreated++;

      // Process with FFmpeg
      const ffmpegCommand = ffmpeg(tempInput)
        .audioBitrate(bitrate)
        .toFormat(format);

      if (duration) {
        ffmpegCommand.duration(duration);
      }

      await new Promise((resolve, reject) => {
        ffmpegCommand
          .save(tempOutput)
          .on('end', resolve)
          .on('error', reject);
      });

      // Read processed file
      const processedBuffer = fs.readFileSync(tempOutput);
      
      this.stats.processedFiles++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      
      return processedBuffer;

    } finally {
      this.activeProcesses.delete(processId);
      
      // Clean up temp files
      this.cleanupTempFiles([tempInput, tempOutput]);
    }
  }

  /**
   * Convert sticker to image
   */
  async stickerToImage(inputBuffer, options = {}) {
    const {
      format = 'png',
      quality = 90
    } = options;

    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      throw new Error('Too many concurrent processes. Please try again later.');
    }

    const processId = `image_${Date.now()}`;
    this.activeProcesses.add(processId);

    try {
      const startTime = Date.now();
      
      let processedBuffer;
      
      if (format === 'png') {
        processedBuffer = await sharp(inputBuffer)
          .png({ quality })
          .toBuffer();
      } else if (format === 'jpg' || format === 'jpeg') {
        processedBuffer = await sharp(inputBuffer)
          .jpeg({ quality })
          .toBuffer();
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      this.stats.processedFiles++;
      this.stats.totalProcessingTime += Date.now() - startTime;
      
      return processedBuffer;

    } finally {
      this.activeProcesses.delete(processId);
    }
  }

  /**
   * Get media information
   */
  async getMediaInfo(inputBuffer) {
    let tempInput = null;

    try {
      // Create temp file
      tempInput = this.generateTempFilename('info_input', 'tmp');
      fs.writeFileSync(tempInput, inputBuffer);
      this.stats.tempFilesCreated++;

      // Get info with FFprobe
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(tempInput, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              duration: metadata.format.duration,
              size: metadata.format.size,
              bitrate: metadata.format.bit_rate,
              format: metadata.format.format_name,
              streams: metadata.streams.map(stream => ({
                type: stream.codec_type,
                codec: stream.codec_name,
                width: stream.width,
                height: stream.height,
                fps: stream.r_frame_rate
              }))
            });
          }
        });
      });

    } finally {
      this.cleanupTempFiles([tempInput]);
    }
  }

  /**
   * Clean up temporary files
   */
  cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.stats.tempFilesDeleted++;
        } catch (error) {
          console.error(`Media Processor: Error deleting temp file ${filePath}:`, error.message);
        }
      }
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const avgProcessingTime = this.stats.processedFiles > 0
      ? (this.stats.totalProcessingTime / this.stats.processedFiles).toFixed(2)
      : 0;

    return {
      ...this.stats,
      avgProcessingTime: `${avgProcessingTime}ms`,
      activeProcesses: this.activeProcesses.size,
      queuedProcesses: this.processingQueue.size,
      tempFilesBalance: this.stats.tempFilesCreated - this.stats.tempFilesDeleted
    };
  }

  /**
   * Periodic cleanup of temp files
   */
  startPeriodicCleanup() {
    // Clean up every 30 minutes
    setInterval(() => {
      this.cleanupOldFiles();
    }, 30 * 60 * 1000);
  }

  /**
   * Shutdown media processor
   */
  async shutdown() {
    console.log('Media Processor: Shutting down...');
    
    // Wait for active processes to complete
    while (this.activeProcesses.size > 0) {
      console.log(`Media Processor: Waiting for ${this.activeProcesses.size} active processes...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Clean up all temp files
    this.cleanupOldFiles();
    
    console.log('Media Processor: Shutdown complete');
  }
}

// Create singleton instance
const mediaProcessor = new MediaProcessor();

// Start periodic cleanup
mediaProcessor.startPeriodicCleanup();

module.exports = mediaProcessor;