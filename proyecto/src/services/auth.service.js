import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const registerUser = async ({ nombre, email, password, tipo_usuario }) => {
  const existingUser = await prisma.usuario.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.usuario.create({
    data: {
      nombre,
      email,
      password: hashedPassword,
      tipo_usuario: tipo_usuario || 'final',
    }
  });

  return user;
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id.toString(), email: user.email, role: user.tipo_usuario },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
};
