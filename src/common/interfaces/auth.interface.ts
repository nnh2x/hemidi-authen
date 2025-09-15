export interface AuthenticatedRequest {
    user: {
        id: number;
        username: string;
    };
}
