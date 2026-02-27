import { createMemoryRouter, type RouteObject } from "react-router-dom";

export function createFutureMemoryRouter(routes: RouteObject[], initialEntries: readonly string[]) {
    return createMemoryRouter(routes, {
        initialEntries: [...initialEntries],
        future: {
            v7_relativeSplatPath: true,
        },
    });
}
