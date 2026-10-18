class ApiError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function success(res, data, meta) {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(200).json(payload);
}

function created(res, data) {
  return res.status(201).json({ success: true, data });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details,
    });
  }
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE',
      message: 'A record with the same unique value already exists.',
    });
  }
  if (err.name === 'MulterError') {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large (max 10 MB).'
        : 'File upload failed.';
    return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: msg });
  }
  console.error('[error]', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  });
}

module.exports = { ApiError, success, created, errorHandler };
