import { body, validationResult } from 'express-validator';

// Reusable validations
const mobileValidation = [
  body('mobileNumber')
    .notEmpty().withMessage('Mobile number is required')
    .isString().withMessage('Mobile number must be a string')
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Must be exactly 10 digits')
    .customSanitizer(value => value.replace(/[^\d]/g, ''))
];

const countryCodeValidation = [
  body('countryCode')
    .notEmpty().withMessage('Country code is required')
    .isString().withMessage('Country code must be a string')
    .trim()
    .matches(/^\+?\d{1,4}$/).withMessage('Invalid country code format')
];

// Validation middleware handler
const validate = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map(err => ({
            field: err.param,
            message: err.msg
          }))
        });
      }
      next();
    }
  ];
};

// Export validated endpoints
export const validateSendOTP = validate([
  ...mobileValidation,
  ...countryCodeValidation
]);

export const validateVerifyOTP = validate([
  ...mobileValidation,
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('Must be 6 digits')
    .isNumeric().withMessage('Must contain only numbers')
]);

export const validateRegister = validate([
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3 }).withMessage('Must be at least 3 characters')
    .trim(),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  ...mobileValidation
]);

export const validateSocialLogin = validate([
  body('provider')
    .notEmpty().withMessage('Provider is required')
    .isIn(['google', 'facebook']).withMessage('Invalid provider'),
  body('accessToken')
    .notEmpty().withMessage('Access token is required')
]);