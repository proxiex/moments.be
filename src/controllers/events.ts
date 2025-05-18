import { Event, User } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { BadRequest, Forbidden, NotFound, Unauthorized } from '../libs/Error.Lib';
import ResponseLib from '../libs/Response.Lib';
import { AuthRequest, UploadRequest } from '../types';
import { uploadImage } from '../utils/cloudinary';

interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isPrivate?: boolean;
  isPublicGallery?: boolean;
  maxAttendees?: number;
  maxPhotosPerAttendee?: number;
  galleryStyle?: 'scrapbook' | 'grid' | 'timeline';
  features?: string[];
  allowComments?: boolean;
  coverImageUrl?: string;
}

interface UpdateEventInput extends Partial<CreateEventInput> {}

interface EventWithRelations extends Event {
  creator: Pick<User, 'id' | 'name' | 'avatar'>;
  participants: Array<Pick<User, 'id' | 'name' | 'avatar'>>;
  images: Array<{
    id: string;
    url: string;
    description?: string;
    createdAt: Date;
    uploader: {
      id: string;
      name: string;
    };
  }>;
  _count?: {
    participants: number;
    images: number;
  };
}

export const getAllEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const where = userId ? {
      OR: [
        { isPublicGallery: true },
        { participants: { some: { id: userId } } },
        { creatorId: userId }
      ]
    } : { isPublicGallery: true };
    const events = await req.prisma?.event.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        images: { select: { id: true, url: true }, take: 1 },
        _count: { select: { participants: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    new ResponseLib(req, res).json({
      status: 'success',
      message: 'Events fetched successfully',
      data: events
    });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const event = await req.prisma?.event.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        participants: { select: { id: true, name: true, avatar: true } },
        images: {
          select: { id: true, url: true, description: true, createdAt: true, uploader: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }) as EventWithRelations | null;

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    if (event.isPrivate && !event.isPublicGallery) {
      const isCreator = userId === event.creator.id;
      const isParticipant = event.participants.some(p => p.id === userId);
      if (!isCreator && !isParticipant) {
        throw new Forbidden('Access denied', 'You do not have permission to view this event');
      }
    }

    new ResponseLib(req, res).json(event);
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      name, 
      description, 
      location, 
      startDate, 
      endDate, 
      isPrivate, 
      isPublicGallery, 
      maxAttendees, 
      maxPhotosPerAttendee, 
      galleryStyle, 
      features, 
      allowComments,
      coverImageUrl
    }: CreateEventInput = req.body;
    
    const userId = req.user?.id;
    if (!userId) {
      new ResponseLib(req, res).status(401).json({ message: 'Authentication required' });
      return;
    }
    if (!name) {
      new ResponseLib(req, res).status(400).json({ message: 'Event name is required' });
      return;
    }
    
    const event = await req.prisma?.event.create({
      data: {
        name,
        description,
        location,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isPrivate: isPrivate !== undefined ? isPrivate : true,
        isPublicGallery: isPublicGallery !== undefined ? isPublicGallery : false,
        maxAttendees: maxAttendees || null,
        maxPhotosPerAttendee: maxPhotosPerAttendee || null,
        galleryStyle: galleryStyle || 'scrapbook',
        features: features || [],
        allowComments: allowComments !== undefined ? allowComments : false,
        coverImageUrl,
        creator: { connect: { id: userId } },
        participants: { connect: { id: userId } },
      },
      include: { creator: { select: { id: true, name: true } } },
    });
    
    new ResponseLib(req, res).status(201).json(event);
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if the event exists and user has permission to edit
    const existingEvent = await req.prisma?.event.findUnique({
      where: { id },
      select: { creatorId: true }
    });
    
    if (!existingEvent) {
      throw new NotFound('Event', 'Event not found');
    }
    
    if (existingEvent.creatorId !== userId) {
      throw new Forbidden('Access denied', 'Only the event creator can update the event');
    }
    
    const {
      name,
      description,
      location,
      startDate,
      endDate,
      isPrivate,
      isPublicGallery,
      maxAttendees,
      maxPhotosPerAttendee,
      galleryStyle,
      features,
      allowComments,
      coverImageUrl
    }: UpdateEventInput = req.body; 
    
    const event = await req.prisma?.event.update({
      where: { id },
      data: {
        name,
        description,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isPrivate: isPrivate !== undefined ? isPrivate : undefined,
        isPublicGallery: isPublicGallery !== undefined ? isPublicGallery : undefined,
        maxAttendees: maxAttendees !== undefined ? maxAttendees : undefined,
        maxPhotosPerAttendee: maxPhotosPerAttendee !== undefined ? maxPhotosPerAttendee : undefined,
        galleryStyle: galleryStyle !== undefined ? galleryStyle : undefined,
        features: features !== undefined ? features : undefined,
        allowComments: allowComments !== undefined ? allowComments : undefined,
        coverImageUrl: coverImageUrl !== undefined ? coverImageUrl : undefined,
      },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { participants: true, images: true } },
      },
    });
    
    new ResponseLib(req, res).json({
      status: 'success',
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await req.prisma?.event.findUnique({ where: { id } });
    
    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    await req.prisma?.image.deleteMany({ where: { eventId: id } });
    await req.prisma?.event.delete({ where: { id } });
    new ResponseLib(req, res).json({ message: 'Event deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const joinEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Authentication', 'Authentication required');
    }

    const event = await req.prisma?.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    await req.prisma?.event.update({
      where: { id },
      data: { participants: { connect: { id: userId } } },
    });
    new ResponseLib(req, res).json({ message: 'Successfully joined event' });
  } catch (error) {
    next(error);
  }
};

export const leaveEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Authentication', 'Authentication required');
    }

    const event = await req.prisma?.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    await req.prisma?.event.update({
      where: { id },
      data: { participants: { disconnect: { id: userId } } },
    });
    new ResponseLib(req, res).json({ message: 'Successfully left event' });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload an event cover image
 */
export const uploadEventCoverImage = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new BadRequest('Upload', 'No image file provided');
    }

    const eventId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    // Check if event exists and user is the creator
    const event = await req.prisma?.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        creatorId: true,
      },
    });

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    // Only the event creator can update the cover image
    if (event.creatorId !== userId) {
      throw new Forbidden('Access', 'Only the event creator can update the cover image');
    }

    // Upload to Cloudinary
    const result = await uploadImage(req.file.buffer, `scrapbook_events/covers`);
    
    // Update event with new cover image URL
    await req.prisma?.event.update({
      where: { id: eventId },
      data: {
        coverImageUrl: result.secure_url,
      },
    });

    // Return the cover image URL
    new ResponseLib(req, res).json({
      coverImageUrl: result.secure_url,
      message: 'Cover image updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateEventVisibility = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await req.prisma?.event.findUnique({ where: { id } });
    
    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    const { isPrivate, isPublicGallery } = req.body;
    const updatedEvent = await req.prisma?.event.update({
      where: { id },
      data: {
        isPrivate: isPrivate !== undefined ? isPrivate : undefined,
        isPublicGallery: isPublicGallery !== undefined ? isPublicGallery : undefined,
      },
    });
    new ResponseLib(req, res).json(updatedEvent);
  } catch (error) {
    next(error);
  }
};

export const getUserEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Authentication', 'Authentication required');
    }

    const events = await req.prisma?.event.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { id: userId } } }
        ]
      },
      include: {
        creator: { 
          select: { 
            id: true, 
            name: true, 
            avatar: true 
          } 
        },
        participants: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        images: { 
          select: { 
            id: true, 
            url: true 
          }, 
          take: 1 
        },
        _count: { 
          select: { 
            participants: true, 
            images: true 
          } 
        },
      },
      orderBy: { 
        createdAt: 'desc' 
      },
    });

    // Separate events into created and joined
    const createdEvents = events?.filter(event => event.creatorId === userId);
    const joinedEvents = events?.filter(event => event.creatorId !== userId);

    new ResponseLib(req, res).json({
      status: 'success',
      message: 'User events fetched successfully',
      data: {
        created: createdEvents,
        joined: joinedEvents
      }
    });
  } catch (error) {
    next(error);
  }
};