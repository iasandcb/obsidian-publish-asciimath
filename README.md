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
make-pub.js allows you to convert AsciiMath to other formats.
### Installation
```
npm install
```
### Conversion

#### File-base (LaTeX)
```
node make-pub.js convert 1.md 1-out.md
```

#### Directory-base (image)
Configure INPUT_PATH in make-pub.js.
```
node make-pub.js
```

### Compilation
You can make a book from the converted files with Pandoc.
```
pandoc --metadata author="Author" --metadata title="Title" *.md --from=gfm+raw_html --to=epub2 --resource-path=.:images --css=book-style.css --toc --toc-depth=2 -o book.epub
```
