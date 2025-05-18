import express from 'express';
import {
    deleteImageById,
    getEventImages,
    getRecentImages,
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
 *     Image:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         url:
 *           type: string
 *         description:
 *           type: string
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
 *         event:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 */

/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     tags:
 *       - Images
 *     summary: Upload an image to an event
 *     description: Upload an image to an event (only participants)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - eventId
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               eventId:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Image'
 */
router.post('/upload', authenticateUser, upload.single('image'), uploadImageToEvent);

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
 * /api/images/recent:
 *   get:
 *     tags:
 *       - Images
 *     summary: Get recent images
 *     description: Get recent images across all visible events
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of images to return
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recent images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 */
router.get('/recent', getRecentImages);

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