import { EventVisibility, ParticipantStatus } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { BadRequest, Forbidden, NotFound, Unauthorized } from '../libs/Error.Lib';
import ResponseLib from '../libs/Response.Lib';
import { UploadRequest } from '../types';
import { deleteFile, getMediaVersions, uploadFile } from '../utils/cloudinary';

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
      throw new BadRequest('Upload', 'No media file provided');
    }

    const { eventId, description }: UploadImageInput = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    // Check if event exists and user is a participant
    const event = await req.prisma?.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }
    
    // Check if user is a participant with JOINED status
    const isParticipant = await req.prisma?.eventParticipant.findFirst({
      where: {
        eventId,
        userId,
        status: ParticipantStatus.JOINED
      }
    });

    if (!isParticipant) {
      throw new Forbidden('Access', 'You must be a participant to upload media to this event');
    }

    // Determine media type
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Upload to Cloudinary
    const result = await uploadFile(
      req.file.buffer,
      `scrapbook_events/${eventId}`,
      mediaType
    );

    // Get different versions of the media
    const versions = getMediaVersions(result.secure_url, mediaType);
    
    // Save media info to database
    const image = await req.prisma?.image.create({
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        mediaType,
        description: description || '',
        uploader: {
          connect: { id: userId },
        },
        event: {
          connect: { id: eventId },
        },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    new ResponseLib(req, res).status(201).json({
      id: image?.id,
      url: image?.url,
      versions,
      mediaType,
      description: image?.description,
      uploader: image?.uploader,
      message: `${mediaType} uploaded successfully`,
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
      },
    });

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    // Get images for the event
    const images = await req.prisma?.image.findMany({
      where: { eventId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add versions for each media
    const imagesWithVersions = images?.map(image => ({
      ...image,
      versions: getMediaVersions(image.url, image.mediaType as 'image' | 'video'),
    }));

    new ResponseLib(req, res).json({
      count: imagesWithVersions?.length || 0,
      data: imagesWithVersions,
    });
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

    // Find the image and check ownership
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

    // Only allow the uploader or event creator to delete
    if (image.uploaderId !== userId && image.event?.creatorId !== userId) {
      throw new Forbidden('Access', 'You do not have permission to delete this media');
    }

    // Delete from Cloudinary
    await deleteFile(image.publicId, image.mediaType as 'image' | 'video');

    // Delete from database
    await req.prisma?.image.delete({
      where: { id },
    });

    new ResponseLib(req, res).json({
      message: `${image.mediaType} deleted successfully`,
    });
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
    // Get pagination parameters from query string
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
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

    // Get total count for pagination
    const totalItems = await req.prisma?.image.count({
      where: whereClause
    });
    
    // Fetch paginated images
    const images = await req.prisma?.image.findMany({
      where: whereClause,
      skip,
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

    // Add versions for each media item
    const imagesWithVersions = images?.map(image => ({
      ...image,
      versions: getMediaVersions(image.url, image.mediaType as 'image' | 'video'),
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil((totalItems || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    new ResponseLib(req, res).json({
      data: imagesWithVersions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalItems || 0,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEventMedia = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    // Get pagination parameters from query string
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Check if event exists and user has access
    const event = await req.prisma?.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        visibility: true,
        isPublicGallery: true,
        creatorId: true,
        _count: {
          select: { images: true }
        }
      },
    });

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    // Check access permissions
    if (event.visibility === EventVisibility.PRIVATE && !event.isPublicGallery) {
      const isCreator = userId === event.creatorId;
      
      // Check if user is a participant
      const isParticipant = await req.prisma?.eventParticipant.findFirst({
        where: {
          eventId: event.id,
          userId,
          status: ParticipantStatus.JOINED
        }
      });
      
      if (!isCreator && !isParticipant) {
        throw new Forbidden('Access', 'You do not have permission to view this event\'s media');
      }
    }

    // Fetch paginated media
    const media = await req.prisma?.image.findMany({
      where: { eventId },
      select: { 
        id: true, 
        url: true, 
        description: true, 
        mediaType: true,
        createdAt: true, 
        uploader: { 
          select: { 
            id: true, 
            name: true,
            avatar: true
          } 
        } 
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Add versions for each media item
    const mediaWithVersions = media?.map(item => ({
      ...item,
      versions: getMediaVersions(item.url, item.mediaType as 'image' | 'video'),
    }));

    // Calculate pagination metadata
    const totalItems = event._count?.images || 0;
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    new ResponseLib(req, res).json({
      data: mediaWithVersions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      }
    });
  } catch (error) {
    next(error);
  }
};

interface GalleryFilters {
  startDate?: Date;
  endDate?: Date;
  eventId?: string;
  mediaType?: 'image' | 'video' | 'all';
}

// interface GallerySort {
//   field: 'createdAt' | 'eventDate';
//   order: 'asc' | 'desc';
// }

export const getUserGallery = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get filter parameters
    const filters: GalleryFilters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      eventId: req.query.eventId as string,
      mediaType: req.query.mediaType as 'image' | 'video' | 'all',
    };

    // Get sort parameters
    const sortField = (req.query.sortField as 'createdAt' | 'eventDate') || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    // Build where clause based on filters
    const whereClause: any = {
      uploaderId: userId
    };

    if (filters.eventId) {
      whereClause.eventId = filters.eventId;
    }

    if (filters.mediaType && filters.mediaType !== 'all') {
      whereClause.mediaType = filters.mediaType;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate;
      }
    }

    // Get total count for pagination
    const totalItems = await req.prisma?.image.count({
      where: whereClause
    });

    // Build sort object
    const orderBy: any = {};
    if (sortField === 'eventDate') {
      orderBy['event'] = { startDate: sortOrder };
    } else {
      orderBy[sortField] = sortOrder;
    }

    // Fetch paginated media
    const media = await req.prisma?.image.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
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
      orderBy,
      skip,
      take: limit,
    });

    // Add versions for each media item
    const mediaWithVersions = media?.map(item => ({
      ...item,
      versions: getMediaVersions(item.url, item.mediaType as 'image' | 'video'),
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil((totalItems || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Get event list for filters
    const userEvents = await req.prisma?.event.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { id: userId } } }
        ]
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    new ResponseLib(req, res).json({
      data: mediaWithVersions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalItems || 0,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage,
      },
      filters: {
        events: userEvents,
        appliedFilters: {
          ...filters,
          sortField,
          sortOrder,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};