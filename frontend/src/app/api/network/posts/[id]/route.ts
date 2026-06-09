import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function forwardResponse(response: Response) {
  const text = await response.text();

  try {
    return NextResponse.json(JSON.parse(text), {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        success: response.ok,
        message: text || 'Sunucu yanıtı alınamadı.',
      },
      {
        status: response.status,
      },
    );
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const response = await fetch(`${API_BASE_URL}/network/posts/${id}`, {
    method: 'GET',
    cache: 'no-store',
  });

  return forwardResponse(response);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await readJsonBody(request);

  const response = await fetch(`${API_BASE_URL}/network/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  return forwardResponse(response);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await readJsonBody(request);

  const response = await fetch(`${API_BASE_URL}/network/posts/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  return forwardResponse(response);
}