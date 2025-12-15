from __future__ import annotations

from fastapi.routing import APIRoute


def main() -> None:
    # Import inside main so this script is safe to import.
    from app.main import app

    routes: list[tuple[str, str, str, str]] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue

        methods = sorted(m for m in route.methods or [] if m not in {"HEAD", "OPTIONS"})
        methods_str = ",".join(methods) if methods else ""
        routes.append(
            (
                route.path,
                methods_str,
                route.name or "",
                getattr(route.endpoint, "__module__", ""),
            )
        )

    routes.sort(key=lambda x: (x[0], x[1]))

    print(f"TOTAL {len(routes)}")
    for path, methods, name, module in routes:
        print(f"{methods:10} {path:45} {name:30} {module}")


if __name__ == "__main__":
    main()
