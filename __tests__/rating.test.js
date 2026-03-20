/**
 * TESTS DE RATING
 *
 * Testea el endpoint PATCH /api/movies/:id/rating
 * que actualiza la puntuación de la película (0-5).
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS (Igual que en favoritos)
// ============================================
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    // Simulamos que el usuario logueado es 'user-123'
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: RATING
// ============================================
describe('API de Rating', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Limpiamos los mocks después de cada test
  });

  describe('PATCH /api/movies/:id/rating', () => {

    // 1. EL CAMINO FELIZ (Happy Path)
    it('debería actualizar el rating a 4 y devolver status 200', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        rating: 0,
        ownerId: 'user-123',
      };

      const peliculaActualizada = { ...peliculaMock, rating: 4 };

      // Simulamos que encuentra la película y que luego la actualiza
      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send({ rating: 4 }) // Enviamos el rating en el body
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      // Verificamos que se buscó con el ID correcto y el ownerId del usuario mockeado
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      // Verificamos que se guardó el rating correcto
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 4 },
      });
    });

    // 2. CAMINO TRISTE: Rating mayor que 5
    it('debería devolver 400 si el rating es mayor que 5', async () => {
      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send({ rating: 6 })
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('El rating debe ser un número entero entre 0 y 5.');
      // No debería haber llegado a buscar en la base de datos
      expect(prisma.movie.findFirst).not.toHaveBeenCalled(); 
    });

    // 3. CAMINO TRISTE: Rating negativo
    it('debería devolver 400 si el rating es menor que 0', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send({ rating: -1 })
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(400);
    });

    // 4. CAMINO TRISTE: Falta el rating o no es un número
    it('debería devolver 400 si no se envía un número válido en el body', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .send({ rating: "cinco" }) // Enviamos texto en lugar de número
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(400);
    });

    // 5. CAMINO TRISTE: Película no encontrada o de otro usuario
    it('debería devolver 404 si la película no existe o es de otro usuario', async () => {
      // ARRANGE
      prisma.movie.findFirst.mockResolvedValue(null);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-otro-user/rating')
        .send({ rating: 5 })
        .set('Authorization', 'Bearer fake-token');

      // ASSERT
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Película no encontrada o no autorizada.');
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

  });
});