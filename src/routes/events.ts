import express from 'express';
import {
    createEvent,
    deleteEvent,
    getAllEvents,
    getEventById,
    getUserEvents,
    joinEvent,
    leaveEvent,
    updateEvent,
    uploadEventCoverImage,
} from '../controllers/events';
import { authenticateUser, isEventCreator } from '../middleware/auth';
import upload from '../middleware/upload';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         location:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         isPrivate:
 *           type: boolean
 *         isPublicGallery:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         creator:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             avatar:
 *               type: string
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get all events
 *     description: Retrieve all public events or user's events if authenticated
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 */
router.get('/', getAllEvents);

/**
 * @swagger
 * /api/events:
 *   post:
 *     tags:
 *       - Events
 *     summary: Create a new event
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isPrivate:
 *                 type: boolean
 *               isPublicGallery:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 */
router.post('/', authenticateUser, createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 */
router.put('/:id', authenticateUser, isEventCreator, updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     tags:
 *       - Events
 *     summary: Delete an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 */
router.delete('/:id', authenticateUser, isEventCreator, deleteEvent);

/**
 * @swagger
 * /api/events/{id}/join:
 *   post:
 *     tags:
 *       - Events
 *     summary: Join an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully joined event
 */
router.post('/:id/join', authenticateUser, joinEvent);

/**
 * @swagger
 * /api/events/{id}/leave:
 *   post:
 *     tags:
 *       - Events
 *     summary: Leave an event
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left event
 */
router.post('/:id/leave', authenticateUser, leaveEvent);

/**
 * @swagger
 * /api/events/{id}/visibility:
 *   put:
 *     tags:
 *       - Events
 *     summary: Update event visibility settings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPrivate:
 *                 type: boolean
 *               isPublicGallery:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Event visibility updated
 */
router.put('/:id/visibility', authenticateUser, isEventCreator, updateEvent);

/**
 * @swagger
 * /api/events/{id}/cover:
 *   post:
 *     tags:
 *       - Events
 *     summary: Upload event cover media
 *     description: Upload a cover image or video for an event (only creator)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file for the event cover
 */
router.post('/:id/cover-image', authenticateUser, isEventCreator, upload.single('coverImage'), uploadEventCoverImage);

/**
 * @swagger
 * /api/events/{id}/visibility:
 *   patch:
 *     deprecated: true
 *     tags:
 *       - Events
 *     summary: Update event visibility
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPrivate:
 *                 type: boolean
 *               isPublicGallery:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Event visibility updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 */
router.patch('/:id/visibility', authenticateUser, isEventCreator, updateEvent);

/**
 * @swagger
 * /api/events/my-events:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get authenticated user's events
 *     description: Retrieve all events that the authenticated user has created or joined
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User events fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *                     joined:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/my-events', authenticateUser, getUserEvents);

/**
 * @swagger
 * /api/events/user:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get authenticated user's events (alternative route)
 *     description: Retrieve all events that the authenticated user has created or joined
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's events retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User events fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *                     joined:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Event'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/user', authenticateUser, getUserEvents);


/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Get event by ID
 *     description: Get detailed event information including paginated media files
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for media pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of media items per page
 *     responses:
 *       200:
 *         description: Event details with paginated media
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 creator:
 *                   $ref: '#/components/schemas/User'
 *                 participants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 images:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Media'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPreviousPage:
 *                           type: boolean
 */
router.get('/:id', authenticateUser, getEventById);

export default router;