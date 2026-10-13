import mongoose from 'mongoose';

/**
 * User model — mirrors Python finance_app/models.py class User
 * Auth uses bcryptjs for hashing instead of SHA-256 (more secure).
 */
const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, index: true, trim: true },
  passwordHash: { type: String, required: true },
  isAdmin:      { type: Boolean, default: false },
});

userSchema.methods.toSafeObject = function () {
  return { id: this._id, username: this.username, isAdmin: this.isAdmin };
};

export default mongoose.model('User', userSchema);
