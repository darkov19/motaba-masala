# UI Audit and Fixes

Based on the visual audit of the application screenshots, here is the detailed list of UI/UX issues that need to be addressed. This list is organized by component/page to help us systematically tackle the improvements.

## 1. Sidebar Navigation

- [x] **Iconography**: Replace the 2-letter text-bubble avatars (e.g., `DB`, `IM`, `GR`) with standard, recognizable SVG icons (e.g., using Lucide-React or Heroicons).
- [x] **Contrast**: Improve the readability of the category headers (`MASTERS`, `PROCUREMENT`, etc.) by darkening the text color or adding a subtle background tint.

## 2. Form Layout & Dynamic Fields (Packaging Profiles)

- [x] **Button Stacking Risk**: Fix the stacked buttons (`Remove`, `Add Component`, `Create Profile`) in the bottom left corner to prevent accidental clicks.
    - Move the `Remove` action to the row it controls (use a red Trash icon).
    - Place `Add Component` directly beneath the dynamic list.
    - Separate and align the `Create Profile` and `Reset` buttons at the bottom of the form.

## 3. Item Master Grid & Split View

- [x] **Input Placeholder Contrast**: Darken the placeholder text (e.g., "Enter item name") to `slate-400` or `gray-400` so the hints are legible.
- [x] **Empty Table Cells**: Add a fallback character (like `-` or `N/A`) for empty data cells (e.g., in the "Subtype" column) so the table structure doesn't look broken.

## 4. Admin Command Center Dashboard

- [x] **Wireframe State**: Replace pure placeholder text descriptions (e.g., "Command-center valuation widgets attach here") with actual UI (either KPI cards/trend arrows if data is ready, or nice empty state/skeleton loaders if not).
- [x] **Tab/Button Spacing**: Adjust the margin/padding for the top action buttons (`New GRN`, `New Batch`, etc.) so they feel connected to the content area below them.

## 5. Unsaved Changes Modal

- [x] **Brand Color Inconsistency**: Change the "Leave anyway" button color from the default bright blue to a "Danger" red or the primary Motaba brand red, as this is a destructive action.
- [x] **Visual Polish**: Improve the modal's visual weight by refining the drop shadow, adjusting the border-radius, and ensuring perfect vertical alignment between the warning icon and the text.

## 6. Users Management Page

- [x] **Overly Wide Form Inputs**: Constrain the maximum width of the "Create User" form inputs (e.g., `max-w-2xl`) or arrange them into a multi-column CSS grid to prevent them from stretching awkwardly across large screens.
- [x] **Icon Mismatch**: Swap the magnifying glass icon on the "Reset" action button for a more appropriate icon (e.g., a key or a circular undo/refresh arrow).
- [x] **Toggle Switch Styling**: Clean up the "Active" toggle switch in the actions column. Remove the embedded text from the switch rail for a standard, sleek slider toggle appearance.
- [x] **Row Alignment & Padding**: Add subtle vertical centering and padding adjustments to the table rows to ensure avatars, names, and action buttons align perfectly and aren't cramped.

## 7. Desktop System Tray Notification (Masala Inventory Server)

- [x] **Icon Resolution & Formatting**: The Motaba logo in the "Masala Inventory is still running" toast notification appears slightly pixelated and has an unpolished solid red background box. Update the notification asset to use a high-quality, transparent PNG (or an ICO format optimized for Windows notifications) so it blends cleanly with the OS styling.

## 8. Global Workspace Sizing

- [x] **Unused Screen Space**: Removed overly restricted `max-width` limiters on the right workspace content panels so they stretch 100% Edge-to-Edge on large screens.
