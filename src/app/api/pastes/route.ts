import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generatePasteId } from "@/lib/id";
import { createPasteSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = createPasteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content, expiresAt, maxViews } = validationResult.data;

    // Generate unique ID
    let id = generatePasteId();

    // Verify collision resistance
    let collisionCheck = await db.paste.findUnique({ where: { id } });
    let attempts = 0;
    while (collisionCheck && attempts < 3) {
      id = generatePasteId();
      collisionCheck = await db.paste.findUnique({ where: { id } });
      attempts++;
    }

    const paste = await db.paste.create({
      data: {
        id,
        content,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxViews: maxViews ?? null,
      },
    });

    // Determine base URL
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "localhost:3000";
    const protocol =
      request.headers.get("x-forwarded-proto") ||
      (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const shareableUrl = `${baseUrl}/p/${paste.id}`;

    return NextResponse.json(
      {
        id: paste.id,
        url: shareableUrl,
        createdAt: paste.createdAt.toISOString(),
        expiresAt: paste.expiresAt ? paste.expiresAt.toISOString() : null,
        maxViews: paste.maxViews,
        currentViews: paste.currentViews,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating paste:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      {
        error: "Failed to create paste",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
