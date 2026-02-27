import { createMemoryRouter, type RouteObject } from "react-router-dom";

export function createFutureMemoryRouter(routes: RouteObject[], initialEntries: readonly string[]) {
    return createMemoryRouter(routes, {
        initialEntries,
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        },
    });
}
