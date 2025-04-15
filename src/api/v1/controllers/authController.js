const { catchAsync } = require('../../../utils/catchAsync');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = catchAsync(async (req, res) => {
    const result = await this.authService.register(req.body);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  });

  login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  getProfile = catchAsync(async (req, res) => {
    const profile = await this.authService.getProfile(req.userId);

    res.status(200).json({
      status: 'success',
      data: { user: profile },
    });
  });

  updateProfile = catchAsync(async (req, res) => {
    const updatedProfile = await this.authService.updateProfile(
      req.userId,
      req.body
    );

    res.status(200).json({
      status: 'success',
      data: { user: updatedProfile },
    });
  });
}

module.exports = AuthController;
