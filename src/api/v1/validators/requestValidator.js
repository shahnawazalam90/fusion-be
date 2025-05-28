const Joi = require('joi');
const { BadRequestError } = require('../../../utils/errors');

const requestSchema = Joi.object({
  name: Joi.string().required(),
  method: Joi.string().valid('get', 'post', 'put', 'delete').required(),
  url: Joi.string().required(),
  headers: Joi.object().optional(),
  type: Joi.string().valid('polling', 'stateless').required(),
  pollingOptions: Joi.object().optional(),
  expectedResponse: Joi.object().optional(),
  payload: Joi.object().optional()
});

const validateRequest = (req, res, next) => {
  const { error } = requestSchema.validate(req.body);
  if (error) throw new BadRequestError(error.details[0].message);
  next();
};

module.exports = { validateRequest };
