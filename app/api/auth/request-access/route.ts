import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, reason } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // LOGGING: This is where we'd send an email to konrad.schrein@gmail.com
        // Since we don't have a configured SMTP/Email service (Resend, SendGrid, etc.)
        // we log this for the administrator to see in the Vercel/Server logs.
        console.log('=========================================');
        console.log('NEW ACCOUNT REQUEST');
        console.log('-----------------------------------------');
        console.log(`From: ${name || 'N/A'} <${email}>`);
        console.log(`Reason: ${reason || 'N/A'}`);
        console.log(`Target: konrad.schrein@gmail.com`);
        console.log('=========================================');

        // In a real scenario, we would use a service like Resend here:
        // await resend.emails.send({
        //   from: 'onboarding@resend.dev',
        //   to: 'konrad.schrein@gmail.com',
        //   subject: 'New Account Request',
        //   text: `Name: ${name}\nEmail: ${email}\nReason: ${reason}`
        // });

        return NextResponse.json({
            success: true,
            message: 'Your request has been sent to the administrator. We will get back to you soon!'
        });
    } catch (error: any) {
        console.error('Account request error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
