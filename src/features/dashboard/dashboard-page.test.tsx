import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderAppAt } from "@/test/test-utils";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DashboardPage readiness card", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading state, then the success state with database status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ status: "ready", database: "ok" }),
    );

    renderAppAt("/");

    expect(screen.getByRole("status")).toHaveTextContent("Checking API readiness");
    expect(await screen.findByText("API is ready.")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/health/ready",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("shows an accessible error with the request ID and a retry action", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: "service_unavailable",
              message: "Database is unavailable.",
              request_id: "req-42",
            },
          },
          503,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ status: "ready", database: "ok" }));

    renderAppAt("/");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("API is not reachable");
    expect(alert).toHaveTextContent("Database is unavailable.");
    expect(alert).toHaveTextContent("req-42");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("API is ready.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows the empty state for obligations, since no data exists yet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ status: "ready", database: "ok" }),
    );

    renderAppAt("/");

    expect(screen.getByText("No obligations loaded")).toBeInTheDocument();
    await screen.findByText("API is ready.");
  });
});
