# Contributing to OpenCode Dashboard

Thank you for your interest in contributing to OpenCode Dashboard! This document provides guidelines and instructions for contributing to the project.

## Prerequisites

Before you begin, ensure you have the following tools installed:

- **[Bun](https://bun.sh/)** v1.0.0 or higher - JavaScript runtime and package manager
- **[Task](https://taskfile.dev/)** (optional) - Task runner for common development commands
- **Git** - Version control

## Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/opencode-dashboard.git
   cd opencode-dashboard
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run the development server:**
   ```bash
   bun run dev
   # or with Task
   task dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to see the dashboard.

## Available Commands

### Using Bun directly:
- `bun run dev` - Start development server with auto-reload
- `bun run start` - Start production server
- `bun run build` - Build the project
- `bun test` - Run tests

### Using Task (if installed):
- `task dev` - Start development server
- `task start` - Start production server
- `task build` - Build the project
- `task test` - Run tests
- `task install` - Install dependencies
- `task clean` - Clean build artifacts

## Code Style

- **JavaScript/TypeScript:** Follow modern ES6+ conventions
- **Formatting:** Use consistent indentation (2 spaces)
- **Comments:** Add clear comments for complex logic
- **File naming:** Use kebab-case for files (e.g., `my-component.js`)

## Testing Requirements

Before submitting a pull request:

1. **Ensure all tests pass:**
   ```bash
   bun test
   ```

2. **Add tests for new features:**
   - Create test files with `.test.js` extension
   - Follow existing test patterns
   - Aim for good test coverage

3. **Test manually:**
   - Run the development server
   - Test your changes in the browser
   - Verify on multiple browsers if UI changes

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clear, concise commit messages
   - Follow conventional commits format:
     - `feat:` - New features
     - `fix:` - Bug fixes
     - `docs:` - Documentation changes
     - `test:` - Test updates
     - `refactor:` - Code refactoring
     - `ci:` - CI/CD changes

3. **Test your changes:**
   ```bash
   bun test
   bun run build
   ```

4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request:**
   - Go to the GitHub repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Description of changes
     - Related issues
     - Testing performed
     - Screenshots (if UI changes)

6. **Address review feedback:**
   - Respond to comments
   - Make requested changes
   - Push updates to the same branch

## Project Structure

```
opencode-dashboard/
├── server.js          # Main server file
├── public/            # Static assets
│   └── index.html     # Frontend UI
├── tests/             # Test files
├── .github/           # GitHub configuration
│   └── workflows/     # CI/CD workflows
├── package.json       # Project metadata
├── Taskfile.yml       # Task definitions
└── README.md          # Project documentation
```

## Reporting Issues

- **Bug reports:** Use the GitHub issue tracker
- **Feature requests:** Open an issue with the "enhancement" label
- **Security issues:** Email maintainers directly (see package.json)

## Questions?

Feel free to open an issue for any questions or clarifications about contributing!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
