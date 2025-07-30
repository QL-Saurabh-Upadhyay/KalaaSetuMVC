import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { filename, parameters } = await request.json();

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
    const generateUrl = `${baseUrl}/api/generate`;

    // Forward the request to Flask API
    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        filename, 
        parameters: {
          chart_type: parameters.chart_type || 'bar',
          x_axis: parameters.x_axis,
          y_axis: parameters.y_axis,
          tone: parameters.tone || 'formal',
          color_scheme: parameters.color_scheme || 'blue-green',
          language: parameters.language || 'en',
          title: parameters.title,
          custom_prompt: parameters.custom_prompt,
          inference_steps: parameters.inference_steps || 25,
          guidance_scale: parameters.guidance_scale || 7.5,
          width: parameters.width || 512,
          height: parameters.height || 512
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      chart_config: result.chart_config,
      infographic: result.infographic,
      metrics: result.metrics
    });

  } catch (error) {
    console.error('Generate chart error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate chart' },
      { status: 500 }
    );
  }
} 