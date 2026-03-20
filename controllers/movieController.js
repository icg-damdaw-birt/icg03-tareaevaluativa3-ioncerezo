const prisma = require('../lib/prisma');

// CRUD para películas: cada operación está protegida por autenticación
// Solo se pueden ver/modificar las películas del usuario logueado

// GET /api/movies - Lista todas las películas del usuario actual
exports.getAllMovies = async (req, res) => {
  try {
    // req.user.userId viene del middleware de autenticación
    const movies = await prisma.movie.findMany({
      where: { ownerId: req.user.userId },  // Solo las del usuario actual
      orderBy: { createdAt: 'desc' },       // Más recientes primero
    });

    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las películas' });
  }
};

// GET /api/movies/:id - Obtiene una película específica
exports.getMovieById = async (req, res) => {
  const { id } = req.params;

  try {
    // Seguridad: solo puede ver sus propias películas
    const movie = await prisma.movie.findFirst({
      where: { id, ownerId: req.user.userId },
    });

    if (!movie) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la película' });
  }
};

// POST /api/movies - Crea una nueva película
exports.createMovie = async (req, res) => {
  const { title, director, year, posterUrl } = req.body;

  try {
    // Crea la película y la asocia automáticamente al usuario logueado
    const movie = await prisma.movie.create({
      data: {
        title,
        director,
        year,
        posterUrl,
        ownerId: req.user.userId,  // Viene del token JWT
      },
    });

    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({ error: 'Datos inválidos' });
  }
};

// PUT /api/movies/:id - Actualiza una película existente
exports.updateMovie = async (req, res) => {
  const { id } = req.params;
  const { title, director, year, posterUrl } = req.body;

  try {
    // updateMany con where: solo actualiza si la película pertenece al usuario
    const movie = await prisma.movie.updateMany({
      where: { id, ownerId: req.user.userId },
      data: { title, director, year, posterUrl },
    });

    if (movie.count === 0) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    const updatedMovie = await prisma.movie.findUnique({ where: { id } });

    res.json(updatedMovie);
  } catch (error) {
    res.status(400).json({ error: 'No se pudo actualizar la película' });
  }
};

// DELETE /api/movies/:id - Elimina una película
exports.deleteMovie = async (req, res) => {
  const { id } = req.params;

  try {
    // deleteMany con where: solo elimina si la película pertenece al usuario
    const movie = await prisma.movie.deleteMany({
      where: { id, ownerId: req.user.userId },
    });

    if (movie.count === 0) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar la película' });
  }
};

// PATCH /api/movies/:id/favorite - Alternar favorito
exports.toggleFavorite = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que la película existe y pertenece al usuario
    const movie = await prisma.movie.findFirst({
      where: { id, ownerId: req.user.userId },
    });

    if (!movie) {
      return res.status(404).json({ error: 'Película no encontrada' });
    }

    // Alternar el valor de isFavorite (true ↔ false)
    const updatedMovie = await prisma.movie.update({
      where: { id },
      data: { isFavorite: !movie.isFavorite },
    });

    res.json(updatedMovie);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar favorito' });
  }
};

// PATCH /api/movies/:id/rating - Actualizar la nota de la película
exports.updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    
    // Usamos req.user.userId para mantener la coherencia con el resto de tu código
    const currentUserId = req.user.userId; 

    // 1. VALIDACIÓN: Comprobamos que el rating es un número y está entre 0 y 5
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      return res.status(400).json({ message: "El rating debe ser un número entero entre 0 y 5." });
    }

    // 2. VERIFICACIÓN DE PROPIEDAD: Usamos ownerId como en el resto de tus rutas
    const movie = await prisma.movie.findFirst({
      where: { 
        id: id, 
        ownerId: currentUserId 
      }
    });

    if (!movie) {
      return res.status(404).json({ message: "Película no encontrada o no autorizada." });
    }

    // 3. ACTUALIZACIÓN: Guardamos la nueva nota
    const updatedMovie = await prisma.movie.update({
      where: { id: id },
      data: { rating: rating }
    });

    // 4. RESPUESTA: Devolvemos un status 200 y la película actualizada
    res.status(200).json(updatedMovie);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};