import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Listbox } from "@/components/ui/listbox";

const OPTIONS = [
  { value: "RBI", label: "RBI" },
  { value: "SEBI", label: "SEBI" },
];

describe("Listbox", () => {
  it("renders its list at the page level, not inside a transformed dialog", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <div style={{ transform: "translateY(8px)" }}>
        <Listbox options={OPTIONS} value="RBI" onChange={onChange} aria-label="Regulator" />
      </div>,
    );

    await user.click(screen.getByRole("combobox", { name: "Regulator" }));

    const list = await screen.findByRole("listbox");
    expect(container).not.toContainElement(list);
    expect(document.body).toContainElement(list);

    await user.click(within(list).getByRole("option", { name: "SEBI" }));
    expect(onChange).toHaveBeenCalledWith("SEBI");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
