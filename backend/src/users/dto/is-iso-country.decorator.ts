import { registerDecorator, ValidationOptions } from 'class-validator';

const regionDisplayNames = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
});

// ISO 3166-1 alpha-2 validation using Intl.DisplayNames
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames
export function isIsoCountryCode(val: unknown): boolean {
  if (typeof val !== 'string' || !/^[A-Z]{2}$/.test(val)) return false;
  try {
    const name = regionDisplayNames.of(val);
    return !!name && name !== 'Unknown Region' && name !== val;
  } catch {
    return false;
  }
}

export function IsIsoCountry(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isIsoCountry',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid ISO 3166-1 alpha-2 country code (e.g. FR, US)`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          return isIsoCountryCode(value);
        },
      },
    });
  };
}
