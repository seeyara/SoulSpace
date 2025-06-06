import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Add any critical service checks here
    const healthy = true;
    
    if (!healthy) {
      return NextResponse.json(
        { status: 'error', message: 'Service unhealthy' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { status: 'ok', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    );
  }
} 