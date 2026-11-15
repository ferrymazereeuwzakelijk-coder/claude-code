/** Errors whose message is safe to show to end users. */
export class UserFacingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
export class ForbiddenError extends UserFacingError {
  constructor(message = 'Je hebt geen toegang tot deze actie.') {
    super(message, 403);
  }
}
export class NotFoundError extends UserFacingError {
  constructor(message = 'Niet gevonden.') {
    super(message, 404);
  }
}
