const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

// Cloudinary configuration from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/upload
 * Accepts base64 image data URI: { image: "data:image/jpeg;base64,...", folder: "portfolio/projects" }
 * Returns uploaded Cloudinary secure_url and metadata
 */
router.post('/', async (req, res) => {
  try {
    const { image, file, folder } = req.body;
    const imageData = image || file;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'No image data provided. Please provide image as a base64 Data URI.',
      });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary credentials are not configured on the server.',
      });
    }

    console.log(`[Upload] Uploading image to Cloudinary (folder: ${folder || 'portfolio'})...`);

    const uploadResponse = await cloudinary.uploader.upload(imageData, {
      folder: folder || 'portfolio',
      resource_type: 'auto',
    });

    console.log(`[Upload] Success! URL: ${uploadResponse.secure_url}`);

    return res.status(200).json({
      success: true,
      url: uploadResponse.secure_url,
      secure_url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
      width: uploadResponse.width,
      height: uploadResponse.height,
      format: uploadResponse.format,
      bytes: uploadResponse.bytes,
    });
  } catch (error) {
    console.error('[Upload Error]', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Image upload failed',
      error: error.message,
    });
  }
});

module.exports = router;
