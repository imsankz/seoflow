# Contributing to SeoFlow

## How to Contribute

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m "feat: add your feature"`)
6. Push to the branch (`git push origin feature/your-feature`)
7. Create a pull request

## Development Setup

```bash
git clone https://github.com/imsankz/seoflow.git .seoflow
cd .seoflow
npm install
npm run seoflow:init
```

## Testing

```bash
npm run seoflow:test          # All tests (unit + integration)
npm run seoflow:test:unit     # Unit tests only (no file I/O)
```

## Code Style

- Follow TypeScript/JavaScript coding style guidelines (see `rules/typescript/coding-style.md`)
- Use `npm run test` to verify changes
- Keep functions small and focused (<50 lines)
- Avoid deep nesting (>4 levels)
- Handle errors explicitly

## Pull Request Guidelines

- Use conventional commit messages (feat, fix, refactor, docs, test, chore)
- Include a description of the changes
- Link to any related issues
- Ensure all tests pass
- Update documentation if necessary

## Reporting Bugs

Use the GitHub issue tracker to report bugs. Include:

- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Environment details (Node.js version, OS)

## Feature Requests

Use the GitHub issue tracker to request features. Include:

- A clear description of the feature
- Use case examples
- Any relevant screenshots or mockups

## License

By contributing to SeoFlow, you agree that your contributions will be licensed under the MIT license.
