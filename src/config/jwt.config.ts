export const jwtConfig = () => ({
  secret: process.env.JWT_ACCESS_SECRET!,
  issuer: process.env.JWT_ISSUER || 'auth-service',
  audience: process.env.JWT_AUDIENCE || 'payment-service',
});

