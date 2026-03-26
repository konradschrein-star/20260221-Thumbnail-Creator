import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export default async function middleware(request: NextRequest) {
    // HTTPS Enforcement: Force HTTPS in production
    if (
        process.env.NODE_ENV === 'production' &&
        request.nextUrl.protocol === 'http:' &&
        !request.nextUrl.hostname.includes('localhost')
    ) {
        const httpsUrl = `https://${request.nextUrl.hostname}${request.nextUrl.pathname}${request.nextUrl.search}`;
        return NextResponse.redirect(httpsUrl, 301);
    }

    // Run authentication middleware
    const authResult = await auth(request as any, {} as any);

    // Create response (either from auth or continue)
    const response = authResult || NextResponse.next();

    // Add security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS header only in production
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/api/:path*",
        "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"
    ]
}
