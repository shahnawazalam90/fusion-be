class UserRepository {
  constructor(models) {
    this.User = models.User;
  }

  async findByEmail(email) {
    return this.User.findOne({ where: { email } });
  }

  async findById(id) {
    return this.User.findByPk(id);
  }

  async create(userData) {
    return this.User.create(userData);
  }

  async update(id, userData) {
    const user = await this.findById(id);
    if (!user) return null;

    return user.update(userData);
  }
}

module.exports = UserRepository;
