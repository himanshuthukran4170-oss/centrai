/**
 * injection.middleware.js
 * Replaces Python finance_app/app.py → failure_injection_middleware
 * One-shot fault injection toggles: INJECT_TRANSIENT_500, INJECT_SLOW_PAGE, INJECT_VALIDATION_ERROR
 */

const injectionState = {
  transient500Fired:     false,
  validationErrorFired:  false,
  slowPageFired:         false,
};

export function resetInjections() {
  injectionState.transient500Fired    = false;
  injectionState.validationErrorFired = false;
  injectionState.slowPageFired        = false;
}

export function injectionMiddleware(req, res, next) {
  // 1. Transient 500 on POST /claims/new (one-shot)
  if (
    process.env.INJECT_TRANSIENT_500 === '1' &&
    req.method === 'POST' &&
    req.path === '/claims/new' &&
    !injectionState.transient500Fired
  ) {
    injectionState.transient500Fired = true;
    return res.status(500).send('<h1>500 Internal Server Error</h1><p>Transient upstream failure injected for testing recovery.</p>');
  }

  // 2. Slow page injection (one-shot, adds 5s latency)
  if (
    process.env.INJECT_SLOW_PAGE === '1' &&
    ['/claims', '/claims/new'].includes(req.path) &&
    !injectionState.slowPageFired
  ) {
    injectionState.slowPageFired = true;
    return setTimeout(() => next(), 5000);
  }

  // 3. Validation error injection — strip cost_center on first POST /claims/new
  if (
    process.env.INJECT_VALIDATION_ERROR === '1' &&
    req.method === 'POST' &&
    req.path === '/claims/new' &&
    !injectionState.validationErrorFired
  ) {
    injectionState.validationErrorFired = true;
    return res.status(422).json({
      error: 'Cost center is required.',
      injected: true,
      fields: req.body,
    });
  }

  next();
}
