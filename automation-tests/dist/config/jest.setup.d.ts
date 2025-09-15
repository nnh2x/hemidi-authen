declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidJWT(): R;
            toHaveRateLimitHeaders(): R;
        }
    }
}
export {};
