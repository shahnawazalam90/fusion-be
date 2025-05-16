const jwt = require('jsonwebtoken');
const { config } = require('../config');
const {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} = require('../utils/errors');

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
    this.tenantModel = userRepository.Tenant;
  }

  async register(userData) {
    if (!userData.tenantId) {
      throw new BadRequestError('Tenant ID is required');
    }

    const tenantExists = await this.tenantModel.findByPk(userData.tenantId);
    if (!tenantExists) {
      throw new BadRequestError('Invalid Tenant ID');
    }

    const existingUser = await this.userRepository.findByEmail(userData.email);

    if (existingUser) {
      throw new BadRequestError('Email already in use');
    }

    const user = await this.userRepository.create(userData);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    return {
      user: userResponse,
      token: this._generateToken(user),
    };
  }

  async login(email, password) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    return {
      user: userResponse,
      token: this._generateToken(user),
    };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    return userResponse;
  }

  async updateProfile(userId, userData) {
    if (userData.tenantId) {
      const tenantExists = await this.userRepository.models.Tenant.findById(userData.tenantId);
      if (!tenantExists) {
        throw new BadRequestError('Invalid Tenant ID');
      }
    }

    // Do not allow password update through this method
    if (userData.password) {
      delete userData.password;
    }

    const updatedUser = await this.userRepository.update(userId, userData);

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    // Remove password from response
    const userResponse = updatedUser.toJSON();
    delete userResponse.password;

    return userResponse;
  }

  _generateToken(user) {
    return jwt.sign({ id: user.id }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  }
}

module.exports = AuthService;
