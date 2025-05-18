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
  [key: string]: any;
}

/**
 * Upload a file to Cloudinary
 * @param buffer - The file buffer
 * @param folder - The folder to upload to
 * @returns The upload result
 */
export const uploadImage = async (
  buffer: Buffer,
  folder = 'scrapbook_events'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
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
 * Delete an image from Cloudinary
 * @param publicId - The public ID of the image
 * @returns The deletion result
 */
export const deleteImage = async (publicId: string): Promise<CloudinaryUploadResult> => {
  return cloudinary.uploader.destroy(publicId) as Promise<CloudinaryUploadResult>;
};

export { cloudinary };
