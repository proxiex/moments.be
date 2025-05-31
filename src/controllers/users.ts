import { User } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { BadRequest, NotFound, Unauthorized } from '../libs/Error.Lib';
import ResponseLib from '../libs/Response.Lib';
import { AuthRequest } from '../types';

interface UpdateUserInput {
  name?: string;
  avatar?: string;
}

interface UserWithRelations extends User {
  images: Array<{
    id: string;
    url: string;
    createdAt: Date;
    event: {
      id: string;
      name: string;
    };
  }>;
  events: Array<{
    id: string;
    name: string;
    createdAt: Date;
  }>;
  createdEvents: Array<{
    id: string;
    name: string;
    createdAt: Date;
    _count: {
      participants: number;
      images: number;
    };
  }>;
  _count: {
    images: number;
    events: number;
    createdEvents: number;
  };
}

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await req.prisma?.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            images: true,
            events: true,
            createdEvents: true,
          },
        },
      },
    });

    new ResponseLib(req, res).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await req.prisma?.user.findUnique({
      where: { id },
      include: {
        images: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            url: true,
            createdAt: true,
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        events: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        createdEvents: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: {
                participants: true,
                images: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            images: true,
            events: true,
            createdEvents: true,
          },
        },
      },
    }) as UserWithRelations | null;

    if (!user) {
      throw new NotFound('User', 'User not found');
    }

    new ResponseLib(req, res).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates: UpdateUserInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    if (id !== userId) {
      throw new Unauthorized('Auth', 'You can only update your own profile');
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequest('Validation', 'No updates provided');
    }

    const user = await req.prisma?.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    new ResponseLib(req, res).json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    if (id !== userId) {
      throw new Unauthorized('Auth', 'You can only delete your own account');
    }

    await req.prisma?.user.delete({
      where: { id },
    });

    new ResponseLib(req, res).json({ message: 'User deleted successfully' });
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
    const { id } = req.params;
    const requestingUserId = req.user?.id;
    
    if (!requestingUserId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    const where: any = {
      participants: {
        some: {
          userId: id,
          status: 'JOINED'
        },
      },
    };
    
    if (id !== requestingUserId) {
      where.OR = [
        { isPublicGallery: true },
        { participants: { some: { userId: requestingUserId, status: 'JOINED' } } },
      ];
    }
    
    const events = await req.prisma?.event.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            participants: true,
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    new ResponseLib(req, res).json(events);
  } catch (error) {
    next(error);
  }
};

export const getUserImages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id;
    
    if (!requestingUserId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    const where = id === requestingUserId
      ? { uploaderId: id }
      : {
          uploaderId: id,
          OR: [
            { event: { isPublicGallery: true } },
            { event: { participants: { some: { id: requestingUserId } } } },
          ],
        };
    
    const images = await req.prisma?.image.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    new ResponseLib(req, res).json(images);
  } catch (error) {
    next(error);
  }
};

export const getUserCreatedEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    const events = await req.prisma?.event.findMany({
      where: {
        creatorId: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            participants: true,
            images: true,
          },
        },
        // Get first image as thumbnail
        images: {
          take: 1,
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    new ResponseLib(req, res).json({
      status: 'success', 
      message: 'Created events fetched successfully',
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserJoinedEvents = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new Unauthorized('Auth', 'Authentication required');
    }

    const events = await req.prisma?.event.findMany({
      where: {
        participants: {
          some: {
            id: userId,
          },
        },
        // Exclude events created by the user
        NOT: {
          creatorId: userId,
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            participants: true,
            images: true,
          },
        },
        // Get first image as thumbnail
        images: {
          take: 1,
          select: {
            url: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    new ResponseLib(req, res).json({
      status: 'success', 
      message: 'Joined events fetched successfully',
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserParticipation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await req.prisma?.user.findUnique({
      where: { id },
      include: {
        events: {
          where: {
            OR: [
              { isPublicGallery: true },
              { participants: { some: { id } } },
              { creatorId: id }
            ]
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                participants: true,
                images: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFound('User', 'User not found');
    }

    new ResponseLib(req, res).json(user.events);
  } catch (error) {
    next(error);
  }
};
export const getUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id;
    
    if (!requestingUserId) {
      throw new Unauthorized('Authentication required');
    }
    
    const user = await req.prisma?.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            participations: true,
            createdEvents: true,
            images: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new NotFound('User', 'User not found');
    }
    
    // Get additional profile statistics
    const participationStats = await req.prisma?.eventParticipant.groupBy({
      by: ['status'],
      where: { userId: id },
      _count: { _all: true },
    });
    
    new ResponseLib(req, res).json({
      status: 'success',
      message: 'User profile fetched successfully',
      data: {
        ...user,
        participationStats: participationStats || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserMediaStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id;
    
    if (!requestingUserId) {
      throw new Unauthorized('Authentication required');
    }
    
    // Check if user exists
    const user = await req.prisma?.user.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!user) {
      throw new NotFound('User', 'User not found');
    }
    
    // Get media count by type
    const mediaByType = await req.prisma?.image.groupBy({
      by: ['mediaType'],
      where: { uploaderId: id },
      _count: { _all: true },
    });
    
    // Get media count by event
    // const mediaByEvent = await req.prisma?.image.groupBy({
    //   by: ['eventId'],
    //   where: { uploaderId: id },
    //   _count: { _all: true },
    // });
    
    // Get events with media counts for this user
    const eventsWithMedia = await req.prisma?.event.findMany({
      where: {
        images: {
          some: { uploaderId: id },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            images: { where: { uploaderId: id } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Get total uploads and other stats
    const totalUploads = await req.prisma?.image.count({
      where: { uploaderId: id },
    });
    
    const latestUpload = await req.prisma?.image.findFirst({
      where: { uploaderId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        mediaType: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    new ResponseLib(req, res).json({
      status: 'success',
      message: 'User media statistics fetched successfully',
      data: {
        totalUploads,
        mediaByType: mediaByType || [],
        eventsWithMedia: eventsWithMedia || [],
        latestUpload,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user?.id;
    
    if (!requestingUserId) {
      throw new Unauthorized('Authentication required');
    }
    
    // Check if user exists
    const user = await req.prisma?.user.findUnique({
      where: { id },
      select: { id: true },
    });
    
    if (!user) {
      throw new NotFound('User', 'User not found');
    }
    
    // Get recent event participations
    const recentParticipations = await req.prisma?.eventParticipant.findMany({
      where: { userId: id },
      orderBy: { joinedAt: 'desc' },
      take: 10,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            startDate: true,
            endDate: true,
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // Get recent media uploads
    const recentUploads = await req.prisma?.image.findMany({
      where: { uploaderId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        url: true,
        mediaType: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Get recent event creations
    const recentCreatedEvents = await req.prisma?.event.findMany({
      where: { creatorId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            participants: true,
            images: true,
          },
        },
      },
    });
    
    // Combine activities in chronological order
    const activities = [
      ...(recentParticipations?.map(p => ({
        type: 'participation',
        timestamp: p.joinedAt,
        data: p,
      })) || []),
      ...(recentUploads?.map(u => ({
        type: 'upload',
        timestamp: u.createdAt,
        data: u,
      })) || []),
      ...(recentCreatedEvents?.map(e => ({
        type: 'event_creation',
        timestamp: e.createdAt,
        data: e,
      })) || []),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
     .slice(0, 20);
    
    new ResponseLib(req, res).json({
      status: 'success',
      message: 'User activities fetched successfully',
      data: activities,
    });
  } catch (error) {
    next(error);
  }
};
