import express from 'express';
import {
    deleteImageById,
    getEventImages,
    getEventMedia,
    getRecentImages,
    getUserGallery,
    uploadImageToEvent,
} from '../controllers/images';
import { authenticateUser } from '../middleware/auth';
import upload from '../middleware/upload';

const router = express.Router();

router.use(authenticateUser);

/**
 * @swagger
 * components:
 *   schemas:
 *     Media:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         url:
 *           type: string
 *         description:
 *           type: string
 *         mediaType:
 *           type: string
 *           enum: [image, video]
 *         publicId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         uploader:
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
 * /api/media/upload:
 *   post:
 *     tags:
 *       - Media
 *     summary: Upload media to an event
 *     description: Upload an image or video to an event (only participants)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - eventId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file (supports common formats)
 *               eventId:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 */
router.post('/upload', authenticateUser, upload.single('file'), uploadImageToEvent);

/**
 * @swagger
 * /api/images/event/{eventId}:
 *   get:
 *     tags:
 *       - Images
 *     summary: Get images for an event
 *     description: Get all images for an event (respects event visibility)
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 */
router.get('/event/:eventId', getEventImages);

/**
 * @swagger
 * /api/images/event/{eventId}/media:
 *   get:
 *     tags:
 *       - Media
 *     summary: Get paginated media for an event
 *     description: Retrieve paginated list of images and videos for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of media items with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 */
router.get('/event/:eventId/media', getEventMedia);

/**
 * @swagger
 * /api/images/recent:
 *   get:
 *     tags:
 *       - Media
 *     summary: Get recent media items
 *     description: Get paginated list of recent images and videos from public events or events user has access to
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of recent media items with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 */
router.get('/recent', getRecentImages);

/**
 * @swagger
 * /api/images/gallery:
 *   get:
 *     tags:
 *       - Media
 *     summary: Get user's media gallery
 *     description: Get a filtered and sorted list of user's uploaded media
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter media from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter media until this date
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter media by specific event
 *       - in: query
 *         name: mediaType
 *         schema:
 *           type: string
 *           enum: [image, video, all]
 *         description: Filter by media type
 *       - in: query
 *         name: sortField
 *         schema:
 *           type: string
 *           enum: [createdAt, eventDate]
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *     responses:
 *       200:
 *         description: User's gallery with filters and pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *                 filters:
 *                   type: object
 *                   properties:
 *                     events:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                     appliedFilters:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           format: date
 *                         endDate:
 *                           type: string
 *                           format: date
 *                         eventId:
 *                           type: string
 *                         mediaType:
 *                           type: string
 *                         sortField:
 *                           type: string
 *                         sortOrder:
 *                           type: string
 */
router.get('/gallery', authenticateUser, getUserGallery);

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     tags:
 *       - Images
 *     summary: Delete an image
 *     description: Delete an image (only uploader or event creator)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Image deleted successfully
 */
router.delete('/:id', authenticateUser, deleteImageById);

export default router;