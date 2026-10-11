import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiFetchJson } from "@/services/api-client";
import { TOKEN_KEY } from "@/services/auth-session";
import { renderAppAt } from "@/test/test-utils";

describe("application shell", () => {
  it("shows grouped primary navigation with the active page marked", async () => {
    renderAppAt("/");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Compliance overview" }),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: /Documents/ })).toHaveAttribute(
      "href",
      "/documents",
    );
    expect(within(nav).getByRole("link", { name: /Dashboard/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: /Audit log/ })).toHaveAttribute("href", "/audit");
  });

  it("computes the compliance KPIs from the demo data", async () => {
    renderAppAt("/");

    const kpis = await screen.findByRole("region", { name: "Key metrics" });
    expect(within(kpis).getByText("Open P1 gaps").closest(".kpi")).toHaveTextContent("3");
    expect(within(kpis).getByText("12 open gaps in total")).toBeInTheDocument();
    expect(within(kpis).getByText("Remediation").closest(".kpi")).toHaveTextContent("3 / 12");
  });

  it("shows the analyst review desk and the signed-in user for an analyst", async () => {
    renderAppAt("/", { signedInAs: "usr-rahul" });

    expect(
      await screen.findByRole("heading", { name: "Analyst review queue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Rahul Mehta", { selector: ".user-badge strong" })).toBeInTheDocument();
    expect(
      screen.getByText("Compliance Analyst", { selector: ".user-badge small" }),
    ).toBeInTheDocument();
    // No impersonation: there is no "acting as" switcher any more.
    expect(screen.queryByRole("combobox", { name: /acting as/i })).not.toBeInTheDocument();
  });

  it("toggles the dark theme and remembers the choice", async () => {
    const user = userEvent.setup();
    renderAppAt("/");

    await user.click(await screen.findByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("rulesight-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("labels mock data so it is never mistaken for live results", async () => {
    renderAppAt("/");
    expect(await screen.findByText("Mock data")).toBeInTheDocument();
  });

  it("renders a not-found page for unknown paths", async () => {
    renderAppAt("/regulations");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});

// These tests type into the form and render the full app twice, which can be slow on CI.
describe("sign-in", { timeout: 15_000 }, () => {
  it("sends a signed-out visitor to sign-in, then back to the page they asked for", async () => {
    const user = userEvent.setup({ delay: null });
    renderAppAt("/gaps", { signedInAs: null });

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText(/there is no password/i)).not.toBeInTheDocument();
    expect(screen.getByText(/any non-empty password/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");

    await user.type(screen.getByLabelText("Email"), "rahul@rulesight.bank");
    await user.type(screen.getByLabelText("Password"), "correct horse");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { level: 1, name: /gaps/i })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(screen.getByText("Rahul Mehta", { selector: ".user-badge strong" })).toBeInTheDocument();
  });

  it("shows an error and stays on sign-in when the credentials are wrong", async () => {
    const user = userEvent.setup({ delay: null });
    renderAppAt("/", { signedInAs: null });

    await user.type(await screen.findByLabelText("Email"), "nobody@rulesight.bank");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup({ delay: null });
    renderAppAt("/", { signedInAs: null });

    const password = await screen.findByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });

  it("signs out and returns to the sign-in page", async () => {
    const user = userEvent.setup({ delay: null });
    renderAppAt("/");
    await screen.findByRole("heading", { name: "Compliance overview" });

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("ends the session on a 401 from the API and returns there after signing in", async () => {
    const user = userEvent.setup({ delay: null });
    renderAppAt("/audit");
    await screen.findByRole("heading", { level: 1, name: /audit/i });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ detail: "Token expired." }), { status: 401 }),
      );
    let caught: unknown;
    await act(async () => {
      caught = await apiFetchJson("/gaps").catch((error: unknown) => error);
    });
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ status: 401, message: "Token expired." });
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toMatch(/^Bearer .+/);
    expect(headers.has("X-Actor")).toBe(false);

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("Your session has ended")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();

    await user.type(screen.getByLabelText("Email"), "priya@rulesight.bank");
    await user.type(screen.getByLabelText("Password"), "again");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { level: 1, name: /audit/i })).toBeInTheDocument();
  });

  it("restores a session from the saved token via /auth/me after a reload", async () => {
    renderAppAt("/gaps", { signedInAs: "usr-rahul", restoreFromToken: true });

    expect(await screen.findByRole("heading", { level: 1, name: /gaps/i })).toBeInTheDocument();
    expect(screen.getByText("Rahul Mehta", { selector: ".user-badge strong" })).toBeInTheDocument();
  });

  it("drops a saved token that /auth/me no longer accepts", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, "stale-token");
    renderAppAt("/gaps", { signedInAs: null });
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("permissions", () => {
  it("hides gap sign-off from an analyst but shows it to a compliance officer", async () => {
    renderAppAt("/gaps/g-07", { signedInAs: "usr-rahul" });
    const verdict = await screen.findByRole("complementary", { name: "Verdict and actions" });
    expect(within(verdict).queryByRole("button", { name: "Confirm gap" })).not.toBeInTheDocument();
    expect(within(verdict).queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
    expect(within(verdict).getByText(/Sign-off needs a Compliance Officer/)).toBeInTheDocument();
  });

  it("shows gap sign-off to a compliance officer", async () => {
    renderAppAt("/gaps/g-07");
    const verdict = await screen.findByRole("complementary", { name: "Verdict and actions" });
    expect(within(verdict).getByRole("button", { name: "Confirm gap" })).toBeInTheDocument();
  });

  it("hides Run pipeline from an analyst but keeps upload", async () => {
    renderAppAt("/documents", { signedInAs: "usr-rahul" });
    expect(await screen.findByRole("heading", { level: 1, name: "Documents" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run pipeline" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload document" })).toBeInTheDocument();
  });

  it("gives an auditor a read-only documents page", async () => {
    renderAppAt("/documents", { signedInAs: "usr-auditor" });
    expect(await screen.findByRole("heading", { level: 1, name: "Documents" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run pipeline" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload document" })).not.toBeInTheDocument();
  });
});

describe("search", () => {
  it("opens with Ctrl+K and jumps to a page", async () => {
    const user = userEvent.setup();
    renderAppAt("/");
    await screen.findByRole("heading", { name: "Compliance overview" });

    await user.keyboard("{Control>}k{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Search RuleSight" });
    await user.type(within(dialog).getByRole("combobox"), "audit");
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("heading", { level: 1, name: /audit/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Search RuleSight" })).not.toBeInTheDocument();
  });
});
