import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { Resend } from 'resend'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const resend = new Resend(process.env.RESEND_API_KEY)
const EXPIRY_MINUTES = 10

export async function POST(req: NextRequest) {
  try {
    const { email, firstName } = await req.json() as { email?: string; firstName?: string }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400, headers: CORS })
    }

    const code = String(Math.floor(1000 + Math.random() * 9000))
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60_000).toISOString()

    const db = getServiceClient()
    const { error } = await db.from('verification_codes').insert({ email, code, expires_at: expiresAt })
    if (error) {
      console.error('verification_codes insert error:', error)
      return NextResponse.json({ error: 'Could not send verification code' }, { status: 500, headers: CORS })
    }

    const sendResult = await resend.emails.send({
      from: 'Tattoolicious <noreply@tattoolicious.com>',
      to: email,
      subject: `Your Tattoolicious verification code: ${code}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #0A0A0A;">Hi${firstName ? ` ${firstName}` : ''}!</h2>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #555;">Your verification code is:</p>
          <p style="font-size: 36px; font-weight: 800; letter-spacing: 12px; padding: 18px; background: #F5F5F0; text-align: center; border-radius: 12px; margin: 0 0 16px 0; color: #7B0000;">${code}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #555;">Enter this code in the estimator to receive your estimate. The code expires in ${EXPIRY_MINUTES} minutes.</p>
          <p style="margin: 16px 0 0 0; font-size: 11px; color: #999;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    })

    if (sendResult.error) {
      console.error('Resend error sending verification code:', sendResult.error)
      return NextResponse.json(
        { error: `Email delivery failed: ${sendResult.error.message ?? 'unknown error'}` },
        { status: 502, headers: CORS },
      )
    }

    console.log('Verification code sent', { email, resendId: sendResult.data?.id })
    return NextResponse.json({ success: true, resendId: sendResult.data?.id }, { headers: CORS })
  } catch (e) {
    console.error('send-verification-code error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS })
  }
}
