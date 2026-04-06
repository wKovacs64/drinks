export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class FieldDomainError extends DomainError {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

export class FormDomainError extends DomainError {}
