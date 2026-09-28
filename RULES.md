# FARV-IA: Engineering Rules & Conventions

## 1. Architectural Principles (SOLID & Clean Architecture)
- **Single Responsibility Principle (SRP)**: Each module, service, and class has exactly one responsibility. Prompt construction is isolated from image generation; metrics calculation (ITA/Monk) is isolated from persistence.
- **Open-Closed Principle (OCP)**: Image generation providers implement an abstract `ImageGenerator` protocol. Adding new models (e.g., Midjourney, Flux, Imagen) requires adding an adapter without altering the audit engine.
- **Liskov Substitution Principle (LSP)**: The `MockImageGenerator` must be a seamless drop-in replacement for `DalleImageGenerator` and `StabilityImageGenerator` in both tests and offline execution.
- **Interface Segregation Principle (ISP)**: Interfaces and typing protocols must be lean and focused on consumer requirements.
- **Dependency Inversion Principle (DIP)**: High-level business logic (e.g., `AuditRunnerService`) depends on abstractions (`ImageGenerator`, `MetricsCalculator`, `AuditRepository`), never on concrete third-party SDKs.

## 2. Python & Code Quality Standards
- **Package Manager**: Exclusively `uv` (`uv pip`, `uv run`). No raw `pip` or unpinned `requirements.txt`.
- **Typing**: 100% type annotations on all function signatures, return types, and class attributes. Use Python 3.10+ standard types (`list[str]`, `dict[str, Any]`, `X | None`).
- **Comments Policy**: Do NOT leave redundant or obvious comments (e.g., `# initialize variable`, `# return result`). Code structure, clear variable names, and type hints must communicate intent. Docstrings are used only for public APIs, complex algorithmic formulas (such as CIELab ITA), or domain concepts.
- **Linter & Formatter**: `ruff check` and `ruff format`. Zero tolerance for lint errors or unused imports.
- **Data Validation**: Strict Pydantic v2 models with validated fields and frozen schemas where applicable.

## 3. Testing Policy
- Every domain calculation (ITA angle, Monk Euclidean/Delta-E distance, prompt matrix generation) must have dedicated unit tests in `tests/`.
- Integration tests must run against the `MockImageGenerator` to ensure CI/CD and local development run without network dependencies or paid API keys.
- Target: 90%+ branch coverage on domain algorithms.

## 4. Frontend Standards (Vite + React + TypeScript + Tailwind)
- Functional components with strict TypeScript types (`props` interfaces).
- Tailwind CSS for responsive styling, prioritizing accessible color contrast and clean academic aesthetics.
- State management with predictable hooks and API services decoupled into `src/services/api.ts`.
