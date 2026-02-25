import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const password = process.env.ADMIN_PASSWORD;

    // If no password is set, allow access (for initial setup/dev)
    if (!password) {
        return NextResponse.next();
    }

    // Exempt Slack callbacks from authentication
    if (request.nextUrl.pathname.startsWith('/api/slack')) {
        return NextResponse.next();
    }

    // Check for the authorization header
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
        const [scheme, encoded] = authHeader.split(' ');
        if (scheme === 'Basic') {
            try {
                const decoded = atob(encoded);
                const [username, providedPassword] = decoded.split(':');

                if (username === 'ben' && providedPassword === password) {
                    return NextResponse.next();
                }
            } catch (e) {
                // Fallback for invalid encoding
            }
        }
    }

    // If not authorized, return a 401 with a basic auth prompt
    return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Tax4Us Agent Platform Access"',
        },
    });
}

// Only protect the dashboard and api routes
export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
