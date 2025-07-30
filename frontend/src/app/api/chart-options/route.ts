import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename required' },
        { status: 400 }
      );
    }

    // Get the API base URL from settings
    const settings = typeof window !== 'undefined' ? 
      JSON.parse(localStorage.getItem('apiSettings') || '{}') : {};
    
    const baseUrl = settings.infographicBaseUrl || 'http://localhost:5000';
    const optionsUrl = `${baseUrl}/api/chart-options`;

    // Forward the request to Flask API
    const response = await fetch(optionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      options: result.options
    });

  } catch (error) {
    console.error('Chart options error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get chart options' },
      { status: 500 }
    );
  }
} 