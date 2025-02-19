document.addEventListener('DOMContentLoaded', function () {
  console.log('document was not ready, place code here');
});

MathJax = {
loader: {load: ['input/asciimath', 'output/chtml']}
}

if (window.chrome) {
navigation.addEventListener('navigate', () => {
  console.log('page changed');
  setTimeout(() => {
    console.log('T');
    translate(true);
  }, 500
  );
}
);  
}

const script = document.createElement('script');
script.onload = function () {
translate();
};

script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js?ts=' + new Date().getTime();
document.head.appendChild(script);

function translate(refresh = false) {
let pres =  document.getElementsByTagName('pre');
pres =  Array.from(document.getElementsByTagName('pre'));

for (let i = 0; i < pres.length; i++) {
  const pre = pres[i];
  if (pre.children[0].classList.contains('language-am')) {
    const para = pre.children[0].innerHTML
    .split('\n')
    .filter(e => e)
    .reduce((acc, code) => acc + '`' + 
    processCode(code)
      + '`' + '<br/>', '');
    pre.outerHTML = '<p style="text-align:center">' + para + '</p>';        
  }
}
if (refresh) {
  MathJax.typeset();
}
}

const SYMBOLS = {
'dom': '\\text{dom}',
'cod': '\\text{cod}',
'rank': '\\text{rank}',
'span': '\\text{span}',
'nullity': '\\text{nullity}',
'arg': '\\text{arg}',
's.t.': '\\text{ s.t. }',
'&lt;' : '<',
'&gt;' : '>',
};

const CONVERTERS = [
{pattern: /\[([^\]]+)\]/g, parser: parseMatrixString},
{pattern: /\{([^\]]+):\}/g, parser: parseMultilineString},
];

function parseMatrixString(str) {  
return parseBlockString(str, '[', ']');
}

function parseMultilineString(str) {  
return parseBlockString(str, '{', ':}');
}

function processCode(code) {
for (let key in SYMBOLS) {
  code = code.replaceAll(key, SYMBOLS[key]);
}
for (let converter of CONVERTERS) {
  code = extractAndReplaceWithFunction(code, converter.pattern, converter.parser);
}
return code;
}

function extractAndReplaceWithFunction(str, regex, parseFunction) {
let match;

while ((match = regex.exec(str)) !== null) {
  let content = match[1].trim();
  if (content.indexOf(';') === -1) {
    continue;
  }
  str = str.replace(match[0], parseFunction(content));
}

return str;
}

function parseBlockString(str, start, end) {
str = str.trim();
if (str.startsWith(start) && str.endsWith(end)) {
    str = str.slice(start.length, -end.length);
}
let rows = str.split(';');
let result = '';
for (let row of rows) {
    row = row.trim();
    if (row === '') {
      continue;
    }
    result += start + row + end + ',';
}  
if (result.endsWith(',')) {
  result = result.slice(0, -1);
}
return start + result + end;
}

console.log('init');
