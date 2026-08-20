export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    groq: !!process.env.GROQ_API_KEY,
    db: !!process.env.DATABASE_URL,
    jwt: !!process.env.JWT_SECRET,
    smtp: !!process.env.SMTP_HOST,
    googleClient: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });
}
