# Contributing to Brain-Storm

Thank you for your interest in contributing to Brain-Storm! We welcome contributions from the community to help make blockchain education accessible to everyone.

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally.
3. **Follow the [Developer Setup Guide](docs/development-setup.md)** to set up your environment.
4. **Create a new branch** for your feature or bug fix.

## Branch Naming Conventions

We use the following naming convention for branches:
- `feat/feature-name` for new features
- `fix/bug-name` for bug fixes
- `docs/doc-update` for documentation changes
- `chore/task-name` for maintenance tasks

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
- `feat: ...` for a new feature
- `fix: ...` for a bug fix
- `docs: ...` for documentation changes
- `style: ...` for formatting, missing semi colons, etc.
- `refactor: ...` for refactoring production code
- `test: ...` for adding missing tests
- `chore: ...` for updating build tasks, package manager configs, etc.

Example: `feat(api): add input sanitization for XSS protection`

## PR Process

1. **Keep PRs small** and focused on a single change.
2. **Include tests** for new features and bug fixes.
3. **Update documentation** if your change affects existing behavior.
4. **Ensure all tests pass** before submitting.
5. **Describe your changes** clearly in the PR description.

## Review Checklist

Before submitting your PR, ensure:
- [ ] Code follows the style guide (run `npm run lint`).
- [ ] Tests are added and passing (run `npm run test`).
- [ ] Commits follow Conventional Commits format.
- [ ] Documentation is updated if necessary.
- [ ] PR description clearly explains the change.

## Security

If you discover a security vulnerability, please report it following our [Security Policy](SECURITY.md).
