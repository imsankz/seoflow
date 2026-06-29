# Getting Started with SeoFlow

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

### One-liner Install (Recommended)

```bash
bash <(curl -s https://raw.githubusercontent.com/imsankz/seoflow/main/install.sh)
```

This will:
1. Create a `seoflow.config.json` file
2. Add npm scripts to your `package.json`
3. Configure your `.gitignore`

### Manual Installation

```bash
# Clone the repo
git clone https://github.com/imsankz/seoflow.git .seoflow

# Install dependencies
cd .seoflow
npm install

# Initialize SeoFlow
npm run seoflow:init
```

## Configuration

SeoFlow uses a `seoflow.config.json` file for configuration. You can generate a default config using:

```bash
npx seoflow init
```

### Required Fields

- `siteName`: Your site name (e.g., "My Travel Blog")
- `siteUrl`: Your site URL (e.g., "https://example.com")
- `author`: Author name (e.g., "John Doe")
- `authorLocation`: Author location (e.g., "Berlin, Germany")
- `postsDir`: Directory containing your blog posts (e.g., "posts")

### Optional Fields

- `writingSample`: Single voice sample for AI content generation
- `writingSamples`: Per-content-type voice samples (e.g., { "guide": "...", "review": "..." })
- `contentFormat`: Content format ("mdx", "markdown", "wordpress")
- `imageSearchFallback`: Default image search term (e.g., "travel")
- `defaultCategory`: Default category for AI prompts (e.g., "travel")
- `contentDomain`: Content domain (e.g., "travel blog")

## Usage

### Run an Audit

```bash
npx seoflow audit
```

This will run the pipeline on the top 10 priority posts.

### Audit a Specific Post

```bash
npx seoflow audit <slug>
```

### Check Pipeline Status

```bash
npx seoflow status
```

### Generate New Posts

```bash
npx seoflow generate
```

### Publish Posts

```bash
npx seoflow publish
```

## Hooks

SeoFlow uses hooks for local validation and automation. The default setup validates JSON files, but you can extend it with custom hooks.

### Install Hooks

```bash
npm run install:repo
```

This will install the repo-level plugin metadata and hook assets under `.claude-plugin` and `hooks`.
