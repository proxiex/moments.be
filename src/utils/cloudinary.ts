import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  [key: string]: any;
}

interface MediaVersions {
  thumbnail: string;
  medium: string;
  original: string;
}

/**
 * Generate different versions of a media URL using Cloudinary transformations
 * @param url - The original Cloudinary URL
 * @param mediaType - The type of media ('image' or 'video')
 * @returns Different versions of the media URL
 */
export const getMediaVersions = (url: string, mediaType: 'image' | 'video'): MediaVersions => {
  if (mediaType === 'image') {
    return {
      thumbnail: url.replace('/upload/', '/upload/w_200,h_200,c_fill/'),
      medium: url.replace('/upload/', '/upload/w_800,h_800,c_fill/'),
      original: url
    };
  } else {
    // For videos, generate video thumbnails and compressed versions
    return {
      thumbnail: url.replace('/upload/', '/upload/w_200,h_200,c_fill/').replace(/\.[^/.]+$/, '.jpg'),
      medium: url.replace('/upload/', '/upload/w_800,q_auto/'),
      original: url
    };
  }
}

/**
 * Upload a file to Cloudinary
 * @param buffer - The file buffer
 * @param folder - The folder to upload to
 * @param resourceType - The type of resource ('image' or 'video')
 * @returns The upload result
 */
export const uploadFile = async (
  buffer: Buffer,
  folder = 'scrapbook_events',
  resourceType: 'image' | 'video' = 'image'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as CloudinaryUploadResult);
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file
 * @param resourceType - The type of resource ('image' or 'video')
 * @returns The deletion result
 */
export const deleteFile = async (
  publicId: string, 
  resourceType: 'image' | 'video' = 'image'
): Promise<CloudinaryUploadResult> => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType }) as Promise<CloudinaryUploadResult>;
};

export { cloudinary };
