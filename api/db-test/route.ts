import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const result = await pool.query("SELECT 1 as connected");
    await pool.end();

    return NextResponse.json({
      status: "success",
      db: result.rows[0],
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
        error: String(error),
      },
      { status: 500 }
    );
  }
}
