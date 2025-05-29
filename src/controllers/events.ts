import { Event, EventVisibility, GalleryStyle, ParticipantStatus, User } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { BadRequest, Forbidden, NotFound, Unauthorized } from '../libs/Error.Lib';
import ResponseLib from '../libs/Response.Lib';
import { AuthRequest, UploadRequest } from '../types';
import { getMediaVersions, uploadFile } from '../utils/cloudinary';

interface CreateEventInput {
  name: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  visibility?: EventVisibility;
  isPublicGallery?: boolean;
  maxAttendees?: number;
  maxPhotosPerAttendee?: number;
  galleryStyle?: GalleryStyle;
  features?: string[];
  allowComments?: boolean;
  allowJoining?: boolean;
  coverImageUrl?: string;
}

interface UpdateEventInput extends Partial<Omit<CreateEventInput, 'creatorId' | 'visibility'>> {
  visibility?: EventVisibility;
  joinCode?: string | null;
  joinCodeExpiresAt?: Date | null;
  
}

interface EventWithRelations extends Event {
  creator: Pick<User, 'id' | 'name' | 'avatar'>;
  participants: Array<{
    id: string;
    status: ParticipantStatus;
    joinedAt: Date;
    user: Pick<User, 'id' | 'name' | 'avatar'>;
  }>;
  images: Array<{
    id: string;
    url: string;
    description?: string;
    mediaType: string;
    width?: number;
    height?: number;
    size?: number;
    format?: string;
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
      visibility, 
      isPublicGallery, 
      maxAttendees, 
      maxPhotosPerAttendee, 
      galleryStyle, 
      features, 
      allowComments,
      allowJoining,
      coverImageUrl
    }: CreateEventInput = req.body;
    
    const userId = req.user?.id;
    if (!userId) {
      throw new Unauthorized('Authentication required');
    }
    if (!name) {
      throw new BadRequest('Event name is required');
    }
    
    // Create the event
    const event = await req.prisma?.event.create({
      data: {
        name,
        description,
        location,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        visibility: visibility !== undefined ? visibility : EventVisibility.PRIVATE,
        isPublicGallery: isPublicGallery !== undefined ? isPublicGallery : false,
        maxAttendees: maxAttendees || null,
        maxPhotosPerAttendee: maxPhotosPerAttendee || null,
        galleryStyle: galleryStyle?.toLocaleUpperCase() as GalleryStyle || GalleryStyle.SCRAPBOOK,
        features: features || [],
        allowComments: allowComments !== undefined ? allowComments : false,
        allowJoining: allowJoining !== undefined ? allowJoining : false,
        coverImageUrl,
        creator: { connect: { id: userId } },
      },
      include: { creator: { select: { id: true, name: true } } },
    });
    
    // Create the participation record for the creator
    await req.prisma?.eventParticipant.create({
      data: {
        eventId: event!.id,
        userId,
        status: ParticipantStatus.JOINED,
        role: 'ADMIN'
      }
    });
    
    return void new ResponseLib(req, res).status(201).json(event);
  } catch (error) {
    next(error);
  }
};

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
        { participants: { some: { userId, status: ParticipantStatus.JOINED } } },
        { creatorId: userId }
      ]
    } : { isPublicGallery: true };

    const events = await req.prisma?.event.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
        images: { 
          select: { 
            id: true, 
            url: true,
            mediaType: true,
            width: true,
            height: true
          }, 
          take: 1 
        },
        _count: { 
          select: { 
            participants: { where: { status: ParticipantStatus.JOINED } },
            images: true 
          } 
        },
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
        participants: { 
          where: { status: ParticipantStatus.JOINED },
          select: { 
            id: true, 
            status: true,
            joinedAt: true,
            user: { select: { id: true, name: true, avatar: true } }
          } 
        },
        images: {
          select: {
            id: true,
            url: true,
            description: true,
            mediaType: true,
            width: true,
            height: true,
            size: true,
            format: true,
            createdAt: true,
            uploader: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { 
            participants: { where: { status: ParticipantStatus.JOINED } },
            images: true 
          }
        }
      },
    }) as EventWithRelations | null;

    if (!event) {
      throw new NotFound('Event', 'Event not found');
    }

    // Check access permissions based on visibility
    if (event.visibility === EventVisibility.PRIVATE && !event.isPublicGallery) {  
      const isCreator = userId === event.creator.id;
      const isParticipant = event.participants.some(p => p.user.id === userId);
      if (!isCreator && !isParticipant) {
        throw new Forbidden('Access denied', 'You do not have permission to view this event');
      }
    }

    return void new ResponseLib(req, res).json(event);
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
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Authentication required');
    }

    // Check if event exists and user is the creator
    const event = await req.prisma?.event.findUnique({
      where: { id },
      select: { id: true, creatorId: true }
    });

    if (!event) {
      throw new NotFound('Event not found');
    }

    if (event.creatorId !== userId) {
      throw new Forbidden('Only the event creator can delete this event');
    }

    // First delete all event participants
    await req.prisma?.eventParticipant.deleteMany({
      where: { eventId: id }
    });

    // Then delete all images associated with the event
    await req.prisma?.image.deleteMany({
      where: { eventId: id }
    });

    // Finally delete the event
    await req.prisma?.event.delete({
      where: { id }
    });

    return void new ResponseLib(req, res).json({
      status: 'success',
      message: 'Event deleted successfully'
    });
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
      visibility,
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
        visibility: visibility !== undefined ? visibility : undefined,
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
    
    return void new ResponseLib(req, res).json({
      status: 'success',
      message: 'Event updated successfully',
      data: event
    });
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
    const { id: eventId } = req.params;
    const userId = req.user?.id;
    const { joinCode } = req.body as { joinCode?: string };

    if (!userId) {
      throw new Unauthorized('Authentication required');
    }

    // First get the event with participant count
    const eventWithCount = await req.prisma?.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        creatorId: true,
        allowJoining: true,
        joinCode: true,
        maxAttendees: true,
        _count: {
          select: {
            participants: { 
              where: { 
                status: 'JOINED' as const
              } 
            }
          }
        }
      },
    });

    if (!eventWithCount) {
      throw new NotFound('Event not found');
    }

    // Check existing participation
    const existingParticipation = await req.prisma?.eventParticipant.findFirst({
      where: { 
        eventId,
        userId,
      },
      select: { 
        id: true, 
        status: true 
      },
    });

    if (existingParticipation) {
      if (existingParticipation.status === 'JOINED') {
        throw new BadRequest('You are already a participant of this event');
      }
      if (existingParticipation.status === 'LEFT') {
        // Update existing participation
        await req.prisma?.eventParticipant.update({
          where: { id: existingParticipation.id },
          data: { 
            status: 'JOINED' as const,
            leftAt: null
          },
        });
        
        return void new ResponseLib(req, res).json({
          status: 'success',
          message: 'Successfully rejoined the event',
        });
      }
    }

    // Check if event allows joining
    if (!eventWithCount.allowJoining && eventWithCount.creatorId !== userId) {
      throw new Forbidden('This event is not accepting new participants');
    }

    // Check join code if required
    if (eventWithCount.joinCode && eventWithCount.joinCode !== joinCode) {
      throw new Forbidden('Invalid join code');
    }

    // Check max attendees if set
    if (eventWithCount.maxAttendees && eventWithCount._count.participants >= eventWithCount.maxAttendees) {
      throw new BadRequest('This event has reached maximum capacity');
    }

    // Create new participation
    await req.prisma?.eventParticipant.create({
      data: {
        eventId,
        userId,
        status: 'JOINED' as const,
        role: eventWithCount.creatorId === userId ? 'ADMIN' : 'ATTENDEE',
      },
    });

    return void new ResponseLib(req, res).json({
      status: 'success',
      message: 'Successfully joined the event',
    });
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
    const { id: eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new Unauthorized('Authentication required');
    }

    const participation = await req.prisma?.eventParticipant.findFirst({
      where: { 
        eventId,
        userId,
        status: 'JOINED' as const
      },
      select: { id: true }
    });

    if (!participation) {
      throw new BadRequest('You are not a participant of this event');
    }

    // Mark as left instead of deleting to preserve history
    await req.prisma?.eventParticipant.update({
      where: { id: participation.id },
      data: { 
        status: 'LEFT' as const,
        leftAt: new Date()
      },
    });

    return void new ResponseLib(req, res).json({
      status: 'success',
      message: 'Successfully left the event',
    });
  } catch (error) {
    next(error);
  }
};

// ... rest of the file ...

export const uploadEventCoverImage = async (
  req: UploadRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw new BadRequest('Upload', 'No media file provided');
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
      throw new Forbidden('Access', 'Only the event creator can update the cover media');
    }

    // Determine media type
    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // Upload to Cloudinary
    const result = await uploadFile(
      req.file.buffer,
      `scrapbook_events/covers`,
      mediaType
    );

    // Get different versions of the media
    const versions = getMediaVersions(result.secure_url, mediaType);
    
    // Update event with new cover media URL
    await req.prisma?.event.update({
      where: { id: eventId },
      data: {
        coverImageUrl: result.secure_url,
      },
    });

    // Return the cover media URL with versions
    new ResponseLib(req, res).json({
      coverImageUrl: result.secure_url,
      versions,
      mediaType,
      message: `Cover ${mediaType} updated successfully`,
    });
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
      throw new Unauthorized('Authentication required');
    }

    const events = await req.prisma?.event.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { 
            participants: { 
              some: { 
                userId, 
                status: ParticipantStatus.JOINED 
              } 
            } 
          }
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
          where: { status: ParticipantStatus.JOINED },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
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
            participants: { where: { status: ParticipantStatus.JOINED } }, 
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

    return void new ResponseLib(req, res).json({
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