// Custom Jest matchers type definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
      toHaveRateLimitHeaders(): R;
      toHaveJwtTokens(): R;
    }
  }
}

export {};
