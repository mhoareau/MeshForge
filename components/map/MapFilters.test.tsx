// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapFilters } from "@/components/map/MapFilters";

const props = (over: Partial<Parameters<typeof MapFilters>[0]> = {}) => ({
  search: "",
  role: "",
  roleOptions: ["CLIENT", "ROUTER"],
  sinceH: 0,
  hopFilter: "all" as const,
  coverage: "off" as const,
  onSearchChange: () => {},
  onRoleChange: () => {},
  onSinceHChange: () => {},
  onHopFilterChange: () => {},
  onCoverageChange: () => {},
  ...over,
});

describe("MapFilters", () => {
  it("remonte la saisie de recherche", async () => {
    const onSearchChange = vi.fn();
    render(<MapFilters {...props({ onSearchChange })} />);
    await userEvent.type(screen.getByPlaceholderText(/Rechercher/), "abc");
    expect(onSearchChange).toHaveBeenCalledTimes(3);
    expect(onSearchChange).toHaveBeenLastCalledWith("c");
  });

  it("propose les rôles fournis, dans les deux variantes d'affichage", () => {
    render(<MapFilters {...props()} />);
    // Le composant duplique chaque select (mobile / desktop) via des classes
    // Tailwind : jsdom n'applique pas les media queries, les deux sont dans le
    // DOM. C'est attendu.
    expect(screen.getAllByRole("option", { name: "CLIENT" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "ROUTER" })).toHaveLength(2);
  });

  it("remonte le changement de rôle", async () => {
    const onRoleChange = vi.fn();
    render(<MapFilters {...props({ onRoleChange })} />);
    await userEvent.selectOptions(
      screen.getAllByRole("combobox")[0],
      "ROUTER",
    );
    expect(onRoleChange).toHaveBeenCalledWith("ROUTER");
  });

  it("convertit la fenêtre « vus depuis » en nombre", async () => {
    const onSinceHChange = vi.fn();
    render(<MapFilters {...props({ onSinceHChange })} />);
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[2], "168");
    expect(onSinceHChange).toHaveBeenCalledWith(168);
  });

  it("expose la couche de couverture avec « off » comme option par défaut", () => {
    render(<MapFilters {...props()} />);
    const couverture = screen.getAllByLabelText("Couche de couverture");
    expect(couverture).toHaveLength(2);
    expect((couverture[0] as HTMLSelectElement).value).toBe("off");
    // « off » est une OPTION du sélecteur, pas une case à cocher séparée.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("remonte le choix de métrique de couverture", async () => {
    const onCoverageChange = vi.fn();
    render(<MapFilters {...props({ onCoverageChange })} />);
    await userEvent.selectOptions(
      screen.getAllByLabelText("Couche de couverture")[0],
      "gateways",
    );
    expect(onCoverageChange).toHaveBeenCalledWith("gateways");
  });

  it("reflète la métrique active", () => {
    render(<MapFilters {...props({ coverage: "nodes" })} />);
    const sel = screen.getAllByLabelText(
      "Couche de couverture",
    )[0] as HTMLSelectElement;
    expect(sel.value).toBe("nodes");
  });

  it("câble AUSSI la variante desktop de chaque sélecteur", async () => {
    // Chaque filtre est rendu deux fois (mobile / desktop) et les deux sont
    // dans le DOM sous jsdom. Un copier-coller pourrait laisser la seconde
    // variante non câblée : les tests ci-dessus n'exercent que la première.
    const onRoleChange = vi.fn();
    const onSinceHChange = vi.fn();
    const onHopFilterChange = vi.fn();
    const onCoverageChange = vi.fn();
    render(
      <MapFilters
        {...props({
          onRoleChange,
          onSinceHChange,
          onHopFilterChange,
          onCoverageChange,
        })}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[1], "CLIENT"); // rôle, desktop
    await userEvent.selectOptions(selects[3], "24"); // vus depuis, desktop
    await userEvent.selectOptions(selects[5], "2"); // hops, desktop
    await userEvent.selectOptions(
      screen.getAllByLabelText("Couche de couverture")[1],
      "snr",
    );
    expect(onRoleChange).toHaveBeenCalledWith("CLIENT");
    expect(onSinceHChange).toHaveBeenCalledWith(24);
    expect(onHopFilterChange).toHaveBeenCalledWith("2");
    expect(onCoverageChange).toHaveBeenCalledWith("snr");
  });

  it("remonte le filtre de hops", async () => {
    const onHopFilterChange = vi.fn();
    render(<MapFilters {...props({ onHopFilterChange })} />);
    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[4], "3plus");
    expect(onHopFilterChange).toHaveBeenCalledWith("3plus");
  });
});
