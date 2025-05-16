const Joi = require('joi');
const { BadRequestError } = require('../../../utils/errors');

const validateRegisterTenant = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

const validateGetTenant = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().uuid().required(),
  });

  const { error } = schema.validate(req.params);

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

const validateUpdateTenant = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().uuid().required(),
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
  });

  const { error } = schema.validate({ ...req.params, ...req.body });

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

const validateDeleteTenant = (req, res, next) => {
  const schema = Joi.object({
    id: Joi.string().uuid().required(),
  });

  const { error } = schema.validate(req.params);

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

module.exports = {
  validateRegisterTenant,
  validateGetTenant,
  validateUpdateTenant,
  validateDeleteTenant,
};
