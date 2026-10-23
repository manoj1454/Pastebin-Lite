import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { randomUUID } from "crypto";

const BASE_URL =
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const DATABASE_URL = process.env.DATABASE_URL;

interface TestResult {
  scenario: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

const client = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // Don't throw on 4xx/5xx responses
  headers: {
    "Content-Type": "application/json",
  },
});

function recordPass(scenario: string, message?: string) {
  console.log(`[PASS] ${scenario}${message ? ` - ${message}` : ""}`);
  results.push({ scenario, passed: true, message });
}

function recordFail(scenario: string, error: string) {
  console.error(`[FAIL] ${scenario} - ${error}`);
  results.push({ scenario, passed: false, message: error });
}

async function runSmokeTests() {
  console.log("==================================================");
  console.log("          PASTELITE AUTOMATED SMOKE TESTS          ");
  console.log("==================================================");
  console.log(`Target BASE_URL: ${BASE_URL}`);
  console.log(`Database Configured: ${DATABASE_URL ? "YES" : "NO"}`);
  console.log("--------------------------------------------------\n");

  // --------------------------------------------------------------------------
  // Scenario 1: Standard Paste
  // Create a paste -> fetch it -> verify content matches and currentViews is 1.
  // --------------------------------------------------------------------------
  try {
    const testContent = `Automated standard paste content [${Date.now()}]`;
    const postRes = await client.post("/api/pastes", {
      content: testContent,
    });

    if (postRes.status !== 201) {
      recordFail(
        "Scenario 1: Standard Paste",
        `Expected POST /api/pastes status 201, got ${postRes.status}: ${JSON.stringify(
          postRes.data
        )}`
      );
    } else {
      const pasteId = postRes.data.id;
      const getRes = await client.get(`/api/pastes/${pasteId}`);

      if (getRes.status !== 200) {
        recordFail(
          "Scenario 1: Standard Paste",
          `Expected GET /api/pastes/${pasteId} status 200, got ${getRes.status}: ${JSON.stringify(
            getRes.data
          )}`
        );
      } else if (getRes.data.content !== testContent) {
        recordFail(
          "Scenario 1: Standard Paste",
          `Content mismatch. Expected "${testContent}", got "${getRes.data.content}"`
        );
      } else if (getRes.data.currentViews !== 1) {
        recordFail(
          "Scenario 1: Standard Paste",
          `Expected currentViews to be 1, got ${getRes.data.currentViews}`
        );
      } else {
        recordPass(
          "Scenario 1: Standard Paste",
          `Created paste ${pasteId}, verified content match & currentViews=1`
        );
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordFail("Scenario 1: Standard Paste", `Network/Execution error: ${errorMsg}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 2: Time Expiration
  // Create paste with expiresAt set to 1 minute ago -> fetch it -> verify 410 with reason: "expired_by_time"
  // --------------------------------------------------------------------------
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const testContent = "This paste expired 1 minute ago";

    const postRes = await client.post("/api/pastes", {
      content: testContent,
      expiresAt: oneMinuteAgo,
    });

    if (postRes.status !== 201) {
      recordFail(
        "Scenario 2: Time Expiration",
        `Expected POST /api/pastes status 201, got ${postRes.status}: ${JSON.stringify(
          postRes.data
        )}`
      );
    } else {
      const pasteId = postRes.data.id;
      const getRes = await client.get(`/api/pastes/${pasteId}`);

      if (getRes.status !== 410) {
        recordFail(
          "Scenario 2: Time Expiration",
          `Expected HTTP 410, got ${getRes.status}: ${JSON.stringify(getRes.data)}`
        );
      } else if (getRes.data.reason !== "expired_by_time") {
        recordFail(
          "Scenario 2: Time Expiration",
          `Expected reason: "expired_by_time", got: "${getRes.data.reason}"`
        );
      } else {
        recordPass(
          "Scenario 2: Time Expiration",
          `Verified HTTP 410 with reason: "expired_by_time"`
        );
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordFail("Scenario 2: Time Expiration", `Network/Execution error: ${errorMsg}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 3: View Expiration
  // Create paste with maxViews: 1 -> fetch once (Success) -> fetch 2nd time -> verify 410 with reason: "max_views_reached"
  // --------------------------------------------------------------------------
  try {
    const testContent = "Single view burn-after-reading paste";
    const postRes = await client.post("/api/pastes", {
      content: testContent,
      maxViews: 1,
    });

    if (postRes.status !== 201) {
      recordFail(
        "Scenario 3: View Expiration",
        `Expected POST /api/pastes status 201, got ${postRes.status}: ${JSON.stringify(
          postRes.data
        )}`
      );
    } else {
      const pasteId = postRes.data.id;

      // First fetch: Expected Success (HTTP 200, currentViews = 1)
      const firstGetRes = await client.get(`/api/pastes/${pasteId}`);
      if (firstGetRes.status !== 200) {
        recordFail(
          "Scenario 3: View Expiration",
          `First fetch expected HTTP 200, got ${firstGetRes.status}`
        );
      } else if (firstGetRes.data.currentViews !== 1) {
        recordFail(
          "Scenario 3: View Expiration",
          `First fetch expected currentViews=1, got ${firstGetRes.data.currentViews}`
        );
      } else {
        // Second fetch: Expected Expired (HTTP 410, reason: "max_views_reached")
        const secondGetRes = await client.get(`/api/pastes/${pasteId}`);
        if (secondGetRes.status !== 410) {
          recordFail(
            "Scenario 3: View Expiration",
            `Second fetch expected HTTP 410, got ${secondGetRes.status}: ${JSON.stringify(
              secondGetRes.data
            )}`
          );
        } else if (secondGetRes.data.reason !== "max_views_reached") {
          recordFail(
            "Scenario 3: View Expiration",
            `Second fetch expected reason: "max_views_reached", got: "${secondGetRes.data.reason}"`
          );
        } else {
          recordPass(
            "Scenario 3: View Expiration",
            `First fetch succeeded (HTTP 200, currentViews=1), second fetch returned HTTP 410 (max_views_reached)`
          );
        }
      }
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordFail("Scenario 3: View Expiration", `Network/Execution error: ${errorMsg}`);
  }

  // --------------------------------------------------------------------------
  // Scenario 4: Not Found
  // Fetch a random UUID -> verify response is HTTP 404
  // --------------------------------------------------------------------------
  try {
    const randomId = randomUUID();
    const getRes = await client.get(`/api/pastes/${randomId}`);

    if (getRes.status !== 404) {
      recordFail(
        "Scenario 4: Not Found",
        `Expected HTTP 404 for random ID, got ${getRes.status}: ${JSON.stringify(
          getRes.data
        )}`
      );
    } else {
      recordPass(
        "Scenario 4: Not Found",
        `Non-existent ID (${randomId}) returned HTTP 404`
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    recordFail("Scenario 4: Not Found", `Network/Execution error: ${errorMsg}`);
  }

  // --------------------------------------------------------------------------
  // Final Results Summary
  // --------------------------------------------------------------------------
  console.log("\n==================================================");
  console.log("                  TEST SUMMARY                    ");
  console.log("==================================================");

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  console.log(`Total: ${results.length} | Passed: ${totalPassed} | Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log("STATUS: FAIL ❌ Some scenarios did not pass.\n");
    process.exit(1);
  } else {
    console.log("STATUS: ALL TESTS PASSED ✅\n");
    process.exit(0);
  }
}

runSmokeTests();
