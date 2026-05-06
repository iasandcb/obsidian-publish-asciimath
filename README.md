# obsidian-publish-asciimath

## publish.js
publish.js supports rendering AsciiMath on Obsidian Publish.

The AsciiMath syntax is based on https://asciimath.widcard.win/en/introduction/ since AsciiMath plugin for Obsidian stems from it.

Examples are
 * https://iasandcb.netlify.app/site/blogs/2024-09-04 
 * https://iasandcb.netlify.app/site/blogs/2024-11-11

While publish.js works well, it basically depends on Obsidian Publish, which is not free. So now I use the following program and share documents on GitHub like the below

 * https://github.com/iasandcb/probstat-for-programmers/blob/main/ch1/1-4.md

## make-pub.js

`make-pub` is a CLI tool that converts AsciiMath expressions in Markdown files to LaTeX or image-based HTML for better compatibility across different platforms (like GitHub).

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Link the CLI command globally:
   ```bash
   npm link
   ```

Now you can use the `make-pub` command from any directory in your shell.

### Usage

#### 1. Convert to LaTeX (File-based)
This command replaces AsciiMath blocks (`$$...$$`) with LaTeX math blocks (` ```math `) and inline `$ ... $` with LaTeX syntax.

```bash
make-pub convert <input.md> <output.md>
```

#### 2. Batch Convert Directory to Image-based HTML
This processes all Markdown files in a specified directory and generates PNG images for math expressions.

```bash
make-pub batch <input_path>
```

Example:
```bash
make-pub batch ~/workspace/book
```

Alternatively, running `make-pub` without arguments will process a predefined sequence of files (01.md to 12.md) from the hardcoded `INPUT_PATH` in the script.


#### 3. Compilation with Pandoc (Optional)
You can compile the converted files into an EPUB book using Pandoc:

```bash
pandoc --metadata author="Author" --metadata title="Title" *.md \
  --from=gfm+raw_html --to=epub2 \
  --resource-path=.:images \
  --css=book-style.css \
  --toc --toc-depth=2 -o book.epub
```

