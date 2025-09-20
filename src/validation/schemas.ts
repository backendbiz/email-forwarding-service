import Joi from 'joi';

// Email forwarding request validation schema
export const emailForwardingRequestSchema = Joi.object({
  data: Joi.object({
    object: Joi.object({
      snippet: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
          'string.empty': 'Snippet is required',
          'string.min': 'Snippet must be at least 10 characters long',
          'string.max': 'Snippet must not exceed 1000 characters',
        }),
      body: Joi.string()
        .min(50)
        .max(50000)
        .required()
        .messages({
          'string.empty': 'Body is required',
          'string.min': 'Body must be at least 50 characters long',
          'string.max': 'Body must not exceed 50000 characters',
        }),
    }).required(),
  }).required(),
}).options({
  stripUnknown: true,
  abortEarly: false,
});

// Health check query parameters schema
export const healthCheckQuerySchema = Joi.object({
  detailed: Joi.boolean().default(false),
}).options({
  stripUnknown: true,
});

// Validation middleware factory
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));
      
      return res.status(400).json({
        error: 'Validation error',
        message: 'Request body validation failed',
        details: errorDetails,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      });
    }
    
    req.body = value;
    next();
  };
};

// Query parameter validation middleware factory
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));
      
      return res.status(400).json({
        error: 'Query validation error',
        message: 'Query parameters validation failed',
        details: errorDetails,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      });
    }
    
    req.query = value;
    next();
  };
};
