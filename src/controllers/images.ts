import { NextFunction, Response } from 'express';
import { BadRequest, Forbidden, NotFound, Unauthorized } from '../libs/Error.Lib';
import ResponseLib from '../libs/Response.Lib';
import { UploadRequest } from '../types';
import { deleteImage, uploadImage } from '../utils/cloudinary';

interface UploadImageInput {
  eventId: string;
  description?: string;
}

export const uploadImageToEvent = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new BadRequest('Upload', 'No image file provided');
    }

    const { eventId, description }: UploadImageInput = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    // Check if event exists and user is a participant
    const event = await req.prisma?.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          where: { id: userId },
          select: { id: true },
        },
      },
    });

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    if (event.participants.length === 0) {
      throw new Forbidden('Access', 'You must be a participant to upload images to this event');
    }

    // Upload to Cloudinary
    const result = await uploadImage(req.file.buffer, `scrapbook_events/${eventId}`);
    
    // Save image info to database
    const image = await req.prisma?.image.create({
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        description: description || '',
        uploader: {
          connect: { id: userId },
        },
        event: {
          connect: { id: eventId },
        },
      },
    });

    new ResponseLib(req, res).status(201).json({
      id: image?.id,
      url: image?.url,
      description: image?.description,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getEventImages = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;
    
    // Check if event exists
    const event = await req.prisma?.event.findUnique({
      where: { id: eventId },
      include: {
        participants: {
          where: userId ? { id: userId } : undefined,
          select: { id: true },
        },
        creator: {
          select: { id: true },
        },
      },
    });

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    if (event.isPrivate && !event.isPublicGallery) {
      const isCreator = event.creator.id === userId;
      const isParticipant = event.participants.length > 0;
      
      if (!isCreator && !isParticipant) {
        throw new Forbidden('Access', 'You do not have permission to view images from this event');
      }
    }

    const images = await req.prisma?.image.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    new ResponseLib(req, res).json(images);
  } catch (error) {
    next(error);
  }
};

export const deleteImageById = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    const image = await req.prisma?.image.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            creatorId: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFound('Image', 'Image not found');
    }

    // Check if user is the uploader or event creator
    if (image.uploaderId !== userId && image.event?.creatorId !== userId) {
      throw new Forbidden('Access', 'You are not authorized to delete this image');
    }

    // Delete from Cloudinary
    await deleteImage(image.publicId);
    
    // Delete from database
    await req.prisma?.image.delete({
      where: { id },
    });

    new ResponseLib(req, res).json({ message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getRecentImages = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 20;
    const userId = req.user?.id;
    
    // Build where clause based on user authentication
    const whereClause = userId ? {
      OR: [
        { event: { isPublicGallery: true } },
        { event: { participants: { some: { id: userId } } } },
        { event: { creatorId: userId } },
        { uploaderId: userId }
      ]
    } : {
      event: { isPublicGallery: true }
    };
    
    const images = await req.prisma?.image.findMany({
      where: whereClause,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    new ResponseLib(req, res).json(images);
  } catch (error) {
    next(error);
  }
};