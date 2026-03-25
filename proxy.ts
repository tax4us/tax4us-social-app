import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const password = process.env.ADMIN_PASSWORD;
    const allowedUsers = process.env.ADMIN_USERS?.split(',') || ['ben'];

    // Require password in production
    if (!password) {
        console.error('SECURITY: ADMIN_PASSWORD not set - denying access');
        return new NextResponse('Configuration Error', { status: 500 });
    }

    // Exempt API routes and public assets from authentication
    if (request.nextUrl.pathname.startsWith('/api/slack') ||
        request.nextUrl.pathname.startsWith('/api/pipeline/') ||
        request.nextUrl.pathname.startsWith('/api/social-publish') ||
        request.nextUrl.pathname.startsWith('/api/cron/') ||
        request.nextUrl.pathname.startsWith('/videos/') ||
        request.nextUrl.pathname.startsWith('/_next/') ||
        request.nextUrl.pathname.includes('.')) {
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

                if (allowedUsers.includes(username) && providedPassword === password) {
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