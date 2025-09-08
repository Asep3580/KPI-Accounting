/**
 * Middleware untuk menangani error secara global.
 * @param {Error} err - Objek error.
 * @param {import('express').Request} req - Objek request Express.
 * @param {import('express').Response} res - Objek response Express.
 * @param {import('express').NextFunction} next - Fungsi next middleware.
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    console.error('--- UNHANDLED ERROR ---');
    console.error(`[${req.method}] ${req.originalUrl}`);
    console.error('Message:', err.message);
    console.error(err.stack);
    console.error('-----------------------');

    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = { errorHandler, notFound };