import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('csvFile') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Create form data for the Flask API
    const flaskFormData = new FormData();
    flaskFormData.append('file', file);

    // Get the API base URL from settings
    const settings = typeof window !== 'undefined' ? 
      JSON.parse(localStorage.getItem('apiSettings') || '{}') : {};
    
    const baseUrl = settings.infographicBaseUrl || 'http://localhost:5000';
    const uploadUrl = `${baseUrl}/api/upload`;

    // Forward the request to Flask API
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: flaskFormData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: result.sample_data || [],
      columns: result.columns || [],
      filename: result.filename,
      numeric_columns: result.numeric_columns || [],
      categorical_columns: result.categorical_columns || [],
      row_count: result.row_count || 0
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process CSV file' },
      { status: 500 }
    );
  }
} 