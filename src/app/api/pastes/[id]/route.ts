import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid paste ID" },
        { status: 400 }
      );
    }

    // Execute atomic transaction for strict expiration check and view increment
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch current record
      const paste = await tx.paste.findUnique({
        where: { id },
      });

      // Edge case: Paste Not Found -> 404
      if (!paste) {
        return {
          status: 404 as const,
          error: "Paste not found",
        };
      }

      const now = new Date();

      // Expiration Logic: strictly validate if expiresAt is present and server time has passed it
      if (paste.expiresAt && now.getTime() > new Date(paste.expiresAt).getTime()) {
        return {
          status: 410 as const,
          error: "Paste expired",
          reason: "expired_by_time" as const,
          expiresAt: paste.expiresAt.toISOString(),
        };
      }

      // View Limit Logic: check if currentViews >= maxViews
      if (paste.maxViews !== null && paste.currentViews >= paste.maxViews) {
        return {
          status: 410 as const,
          error: "Paste expired",
          reason: "max_views_reached" as const,
          maxViews: paste.maxViews,
          currentViews: paste.currentViews,
        };
      }

      // Atomically increment currentViews and return the record in one go
      const updated = await tx.paste.update({
        where: { id },
        data: {
          currentViews: {
            increment: 1,
          },
        },
      });

      return {
        status: 200 as const,
        paste: updated,
      };
    });

    // Handle distinct 404 vs 410 responses
    if (result.status === 404) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    if (result.status === 410) {
      return NextResponse.json(
        {
          error: result.error,
          reason: result.reason,
          expiresAt: result.expiresAt,
          maxViews: result.maxViews,
          currentViews: result.currentViews,
        },
        { status: 410 }
      );
    }

    const { paste } = result;

    return NextResponse.json(
      {
        id: paste.id,
        content: paste.content,
        createdAt: paste.createdAt.toISOString(),
        expiresAt: paste.expiresAt ? paste.expiresAt.toISOString() : null,
        maxViews: paste.maxViews,
        currentViews: paste.currentViews,
        remainingViews:
          paste.maxViews !== null
            ? Math.max(0, paste.maxViews - paste.currentViews)
            : null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error retrieving paste:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      {
        error: "Failed to retrieve paste",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
