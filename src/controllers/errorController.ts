import { ErrorRequestHandler } from 'express';
import AppError from '../utils/appError';

const handleCastErrorDB: ErrorRequestHandler = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};
const handleDuplicateFieldsDB: ErrorRequestHandler = (err: any) => {
  const value = err.keyValue.name;
  const message = `Duplicate field value: ${value}. Please use another value`;

  return new AppError(message, 400);
};

const handleValidationErrorDB: ErrorRequestHandler = (err) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  new AppError('Invalid token!, please log in again', 401);
};

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again', 401);

const sendErrorDev: ErrorRequestHandler = (err, req, res, next) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd: ErrorRequestHandler = (err, req, res, next) => {
  // Operational error
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming error
    console.error('ERROR 💥  🥵 ', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

export const globalErrorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  next
) => {
  // console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res, next);
  } else if (process.env.NODE_ENV === 'production') {
    let errorStr = JSON.stringify(err);
    let error = JSON.parse(errorStr);

    // CastError
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error, req, res, next);
    }
    // Duplicate Field Error
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error, req, res, next);
    }

    // Validation Error
    if (error.name === 'validationError') {
      error = handleValidationErrorDB(error, req, res, next);
    }

    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }

    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, req, res, next);
  }
};
