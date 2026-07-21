// @vitest-environment jsdom
//
// PREMIER test de composant React du dépôt. Il sert autant de couverture que de
// gabarit : il exerce toute la chaîne mise en place par vitest.config.ts —
// environnement jsdom en opt-in par ce commentaire, rendu Testing Library,
// matchers jest-dom, simulation d'interaction, et import par l'alias `@/` en
// VALEUR (ce que l'absence de configuration vitest rendait impossible).
//
// Les tests de logique pure restent en environnement node : ne mettre ce
// commentaire qu'en tête des fichiers qui ont réellement besoin d'un DOM.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapLegend } from "@/components/map/MapLegend";

describe("MapLegend", () => {
  it("affiche les entrées de légende quand elle est ouverte", () => {
    render(<MapLegend open onToggle={() => {}} />);
    expect(screen.getByText("Gateway MQTT")).toBeInTheDocument();
    expect(screen.getByText("Lien direct 0-hop")).toBeInTheDocument();
  });

  it("masque les entrées quand elle est fermée", () => {
    render(<MapLegend open={false} onToggle={() => {}} />);
    expect(screen.queryByText("Gateway MQTT")).not.toBeInTheDocument();
  });

  it("libelle le bouton selon l'état et expose aria-expanded", () => {
    const { unmount } = render(<MapLegend open onToggle={() => {}} />);
    const ouvert = screen.getByRole("button");
    expect(ouvert).toHaveTextContent("Masquer la légende");
    expect(ouvert).toHaveAttribute("aria-expanded", "true");
    unmount();

    render(<MapLegend open={false} onToggle={() => {}} />);
    const ferme = screen.getByRole("button");
    expect(ferme).toHaveTextContent("Légende");
    expect(ferme).toHaveAttribute("aria-expanded", "false");
  });

  it("remonte le clic sur le bouton", async () => {
    const onToggle = vi.fn();
    render(<MapLegend open onToggle={onToggle} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("repart d'un document propre entre deux tests", () => {
    // Vérifie le cleanup de vitest.setup.ts : sans lui, les rendus précédents
    // s'accumuleraient et getByRole("button") deviendrait ambigu.
    render(<MapLegend open onToggle={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
