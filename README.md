# obsidian-publish-asciimath

publish.js supports rendering AsciiMath on Obsidian Publish.

The AsciiMath syntax is based on https://asciimath.widcard.win/en/introduction/ since AsciiMath plugin for Obsidian stems from it.

Examples are
 * https://iasandcb.netlify.app/site/blogs/2024-09-04 
 * https://iasandcb.netlify.app/site/blogs/2024-11-11
 * and so on

After running 

node make-pub.js

pandoc --metadata author="Author" --metadata title="Title" *.md --from=gfm+raw_html --to=epub2 --resource-path=.:images --css=book-style.css --toc --toc-depth=2 -o book.epub
