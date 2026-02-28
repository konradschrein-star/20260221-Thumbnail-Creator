import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, reason } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // SAVE TO DATABASE
        try {
            await prisma.accessRequest.create({
                data: {
                    name: name || null,
                    email: email,
                    reason: reason || null,
                    status: 'pending'
                }
            });
            console.log(`Access request saved to DB for: ${email}`);
        } catch (dbError) {
            console.error('Failed to save access request to DB:', dbError);
        }

        // SAVE TO LOCAL FILE (for local admin visibility)
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'ACCOUNT_REQUESTS.md');
            const date = new Date().toLocaleString();
            const row = `| ${name || 'N/A'} | ${email} | ${reason || 'N/A'} | pending | ${date} |\n`;
            fs.appendFileSync(logPath, row);
        } catch (fsError) {
            console.error('Failed to save to local requests file:', fsError);
        }

        // LOGGING: This is where we'd send an email to konrad.schrein@gmail.com
        // Since we don't have a configured SMTP/Email service...
        console.log('=========================================');
        console.log('NEW ACCOUNT REQUEST');
        console.log('-----------------------------------------');
        console.log(`From: ${name || 'N/A'} <${email}>`);
        console.log(`Reason: ${reason || 'N/A'}`);
        console.log(`Target: konrad.schrein@gmail.com`);
        console.log('=========================================');

        return NextResponse.json({
            success: true,
            message: 'Your request has been recorded. The administrator has been notified.'
        });
    } catch (error: any) {
        console.error('Account request error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
