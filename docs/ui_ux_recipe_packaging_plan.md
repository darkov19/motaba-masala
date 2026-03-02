# Modern UX Plan: Recipes & Packaging Profiles

## Current State Analysis

Currently, `RecipeForm.tsx` and `PackagingProfileForm.tsx` use a standard Ant Design "Split View" (Left: Data Grid, Right: Vertical Form). While functional, the right-side forms are heavily text-based, using standard `Form.List` inputs. They lack a visual sense of "building" something physical. The Packaging Profile currently doesn't even support editing.

## The Goal: "Visual Building" UX

We want the user to see the Recipe or Packaging Profile taking shape dynamically as they add components. It should feel less like filling out a tax form and more like constructing a product block by block.

---

## 1. Recipe Builder: The "Mixology" View

The goal here is to clearly visualize the input (Raw Spices) transforming into the output (Bulk Powder), taking the new "100% Base" into account.

### Layout Shift

- **Move away from the rigid 50/50 split:** Give the Builder view full-width focus when creating/editing, perhaps using a Drawer or a dedicated full-screen "Builder Mode" overlay.

### Visual Components

- **The Output Target (Top Center):** A prominent visual card indicating what we are making (e.g., "Turmeric Powder 100KG Base").
- **The Funnel/Mixer (Middle):** A visual indicator pointing downwards into the output.
- **The Ingredient Cards (The dynamic list):** Instead of standard table rows, each ingredient is a "Card" or "Block".
    - **Interactive Input:** A large, easily clickable numerical input for the Percentage.
    - **Visual Status:** If `IsPercentageBase` is true, a dynamic progress bar at the bottom shows the total sum of all ingredients filling up to 100%.
    - **Color Coding:** If the sum is < 100%, the bar is Yellow/Orange. At exactly 100%, it turns Green. If > 100%, it turns Red with a warning.

### Key Interactions

- **Drag and Drop Reordering:** Allow users to drag ingredient cards to reorder them (important for process steps).
- **Live Preview:** As percentages are adjusted, show a small "Live Example" text: _(e.g., "For a 500kg batch, this requires 125kg of Cumin")._

---

## 2. Packaging Profile Builder: The "Anatomy" View

Packaging profiles map one pack (e.g., 100g Jar) to its physical components. The UX should reflect the physical anatomy of the packaging.

### Layout Shift

- Similar to the Recipe Builder, use a larger dedicated space rather than a cramped right-side panel.

### Visual Components

- **The Final Pack (Left or Top):** A visual representation of the `Pack Mode` being created.
- **The Component Tree (Right or Bottom):** A hierarchical or visual list showing what goes into it.
- **Icon-Driven Categories:** Since packaging materials have subtypes (Jars, Lids, Stickers, Cartons), we can auto-assign icons based on the item subtype.
    - _Icon of a Lid_ -> "Red Plastic Cap" (1 per unit)
    - _Icon of a Jar_ -> "100g Glass Jar" (1 per unit)
    - _Icon of a Label_ -> "Front Sticker" (1 per unit)

### Key Interactions

- **"Add Component" Grid:** Instead of a simple dropdown, opening "Add Component" could show a visual grid of available packing materials grouped by type (Bottles, Lids, Labels, Boxes), making it faster to visually identify what's missing.
- **Edit Capability:** Implement the missing "Edit" function so existing profiles can be updated visually.

## Technical Implementation Path (React + Ant Design)

1.  **Component Library:** Continue using Ant Design `Form`, but wrap the inputs in custom styled `div` cards using Tailwind for the visual layout.
2.  **State Observation:** Use `Form.useWatch` aggressively.
    - _Recipe:_ Watch the entire `components` array to calculate the total percentage in real-time and drive the Progress Bar.
3.  **Refactoring Forms:**
    - Extract the "Form" part of `RecipeForm.tsx` into a new `RecipeBuilder.tsx` component.
    - Extract the "Form" part of `PackagingProfileForm.tsx` into `PackagingProfileBuilder.tsx`.
    - Change the split view: Clicking "New Recipe" or "Edit" on the Table opens a full-screen or wide-drawer Builder, giving the UI room to breathe.
