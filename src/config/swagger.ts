import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Scrapbook Events API',
    version: '1.0.0',
    description: 'API documentation for Scrapbook Events application',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 4000}`,
      description: 'Development server',
    },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The user ID'
          },
          name: {
            type: 'string',
            description: 'The user\'s full name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'The user\'s email address'
          },
          avatar: {
            type: 'string',
            nullable: true,
            description: 'URL to user\'s avatar image'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'When the user was created'
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/User'
          },
          token: {
            type: 'string',
            description: 'JWT authentication token'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Error message'
          },
          error: {
            type: 'object',
            description: 'Error details (only in development)'
          }
        }
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication is required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ValidationError: {
        description: 'Invalid input',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
