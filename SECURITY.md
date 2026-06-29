# Security Policy

## Supported Versions

Currently, all versions of SeoFlow are supported. We recommend using the latest version for security updates.

## Reporting a Vulnerability

If you find a security vulnerability in SeoFlow, please report it by:

1. Creating a new issue in the GitHub repository
2. Labeling it with the "security" tag
3. Including details about the vulnerability
4. Providing steps to reproduce the issue

We will investigate and fix the vulnerability as soon as possible.

## Security Measures

SeoFlow implements the following security measures:

- **Secret Management**: Never hardcode secrets in source code. Use environment variables or a secret manager.
- **Input Validation**: Validate all user input before processing.
- **Error Handling**: Handle errors explicitly and provide user-friendly messages.
- **API Key Protection**: Check that required API keys are present at startup.
- **Gitignore**: Ignore sensitive files (`.env.local`, `learning.json`, `gsc-baselines.json`) by default.

## Known Security Risks

- **API Keys**: If API keys are leaked, they can be misused. Keep `.env.local` out of version control.
- **AI Providers**: AI providers may have their own security policies. Review their terms of service.

## Best Practices

- Use environment variables to store secrets
- Rotate API keys periodically
- Limit the scope of API keys
- Enable two-factor authentication for all accounts
- Keep dependencies up to date

## License

SeoFlow is licensed under the MIT license. See LICENSE for details.
