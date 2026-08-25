const { ApiError } = require('./errorHandler');

// Wraps a Zod schema; validates req.body (or req.query/req.params if specified)
// and replaces it with the parsed/coerced value.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ApiError(400, 'Validation failed', result.error.flatten());
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
