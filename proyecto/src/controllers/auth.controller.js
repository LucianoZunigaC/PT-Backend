import * as authService from '../services/auth.service.js';

export const register = async (req, res, next) => {
  try {
    const { nombre, email, password, tipo_usuario } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await authService.registerUser({ nombre, email, password, tipo_usuario });
    res.status(201).json({ message: 'User registered successfully', userId: user.id.toString() });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const { user, token } = await authService.loginUser({ email, password });
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id.toString(),
        nombre: user.nombre,
        email: user.email,
        tipo_usuario: user.tipo_usuario
      }
    });
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    next(error);
  }
};
