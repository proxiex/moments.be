import express from 'express';
import {
    getAllUsers,
    getUserById,
    getUserEvents,
    getUserImages,
    updateUser,
    getUserCreatedEvents,
    getUserJoinedEvents,
    getUserProfile,
    getUserMediaStats,
    getUserActivities,
} from '../controllers/users';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         avatar:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         _count:
 *           type: object
 *           properties:
 *             images:
 *               type: number
 *             events:
 *               type: number
 *             createdEvents:
 *               type: number
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: Retrieve all users (authenticated only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/', authenticateUser, getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieve a user's public profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/:id', getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags:
 *       - Users
 *     summary: Update user
 *     description: Update a user's profile (only self)
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
 *               name:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.put('/:id', authenticateUser, updateUser);

/**
 * @swagger
 * /api/users/{id}/events:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user's events
 *     description: Get events a user participates in (respects visibility settings)
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
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 */
router.get('/:id/events', authenticateUser, getUserEvents);

/**
 * @swagger
 * /api/users/{id}/images:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user's images
 *     description: Get images uploaded by a user (respects event visibility)
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
 *         description: List of images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Image'
 */
router.get('/:id/images', authenticateUser, getUserImages);

/**
 * @swagger
 * /api/users/events/created:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get events created by the current user
 *     description: Get events created by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of created events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
router.get('/events/created', authenticateUser, getUserCreatedEvents);

/**
 * @swagger
 * /api/users/events/joined:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get events joined by the current user
 *     description: Get events the authenticated user has joined but didn't create
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of joined events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
router.get('/events/joined', authenticateUser, getUserJoinedEvents);

/**
 * @swagger
 * /api/users/{id}/profile:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get detailed user profile
 *     description: Retrieve detailed information about a user's profile including statistics
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
 *         description: Detailed user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.get('/:id/profile', authenticateUser, getUserProfile);

/**
 * @swagger
 * /api/users/{id}/media-stats:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user media statistics
 *     description: Retrieve statistics about a user's uploaded media, by type, event, etc.
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
 *         description: User media statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
router.get('/:id/media-stats', authenticateUser, getUserMediaStats);

/**
 * @swagger
 * /api/users/{id}/activities:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user activities
 *     description: Retrieve a list of recent user activities including event participations, uploads, etc.
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
 *         description: List of user activities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/:id/activities', authenticateUser, getUserActivities);

export default router;