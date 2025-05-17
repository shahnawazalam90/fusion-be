const Joi = require('joi');
const { BadRequestError } = require('../../../utils/errors');

const validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().allow('', null),
    lastName: Joi.string().allow('', null),
    tenantId: Joi.string().uuid().required(), // Added tenantId as an optional field
  });

  const { error } = schema.validate(req.body);

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

const validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    firstName: Joi.string().allow('', null),
    lastName: Joi.string().allow('', null),
    profilePicture: Joi.string().allow('', null),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    throw new BadRequestError(error.details[0].message);
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
};
