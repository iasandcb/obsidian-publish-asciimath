document.addEventListener('DOMContentLoaded', function () {
    console.log('document was not ready, place code here');
    // myInitCode();
});

MathJax = {
  loader: {load: ['input/asciimath', 'output/chtml']}
}

if (window.chrome) {
  navigation.addEventListener('navigate', () => {
    console.log('page changed');
    // translate2();
    setTimeout(() => {
      console.log('T');
      translate2(true);
    }, 500
    );
  }
  );  
}

const script = document.createElement('script');
script.onload = function () {
  // myInitCode();
  translate2();
};

script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js?ts=' + new Date().getTime();
document.head.appendChild(script);

function myInitCode() {
  Array.prototype.slice.call(document.getElementsByTagName('pre'))
  .forEach(pre => {
    console.log('pre', pre);
    const codeEl = pre.children[0];
    // const innerHTML = pre.innerHTML;
    if (codeEl.classList.contains('language-am')) {
      console.log('co', codeEl.innerHTML);
      const code = codeEl.innerHTML;
      const codes = code.split('\n').filter(e => e);
      console.log('codes', codes);
      const para = codes.reduce((acc, code) => acc + '`' + 
      extractAndReplaceWithFunction(code, parseMatrixString)
      + '`' + '<br/>', '');
      console.log('para', para);
      pre.outerHTML = '<p style="text-align:center">' + para + '</p>';  
      }
  });
}

function translate2(refresh = false) {
  let pres =  document.getElementsByTagName('pre');
  // const pres =  document.querySelectorAll('pre');
  console.log('pres', pres);
  console.log('pres', pres.length);
  // console.log('pres2', document.getElementsByTagName('pre'));
  pres =  Array.from(document.getElementsByTagName('pre'));

  for (let i = 0; i < pres.length; i++) {
    const pre = pres[i];
    console.log('pre i', i);
    console.log('pre', pre);
    if (pre.children[0].classList.contains('language-am')) {
      const para = pre.children[0].innerHTML
      .split('\n')
      .filter(e => e)
      .reduce((acc, code) => acc + '`' + 
        extractAndReplaceWithFunction(code, parseMatrixString)
        + '`' + '<br/>', '');
      console.log('para', para);
      pre.outerHTML = '<p style="text-align:center">' + para + '</p>';        
    }
  }
  if (refresh) {
    MathJax.typeset();
  }
}

function translate() {
  console.log('doc', document);
  console.log('prep', document.getElementsByTagName('pre'));
  const pres =  Array.from(document.getElementsByTagName('pre'));
  console.log('pres', pres);
  pres.filter(pre => 
    pre.children[0].classList.contains('language-am')  
  ).forEach(pre => {
    const para = pre.children[0].innerHTML
    .split('\n')
    .filter(e => e)
    .reduce((acc, code) => acc + '`' + 
      extractAndReplaceWithFunction(code, parseMatrixString)
      + '`' + '<br/>', '');
    pre.outerHTML = '<p style="text-align:center">' + para + '</p>';        
  });
}

function extractAndReplaceWithFunction(str, parseFunction) {
  const regex = /\[([^\]]+)\]/g;
  let result = str;
  let match;

  while ((match = regex.exec(str)) !== null) {
      let content = match[1].trim();
      if (content.indexOf(';') === -1) {
        continue;
      }
      let parsedContent = parseFunction(content);
      result = result.replace(match[0], JSON.stringify(parsedContent));
  }

  return result;
}

function parseMatrixString(str) {  
  str = str.trim();
  if (str.startsWith('[') && str.endsWith(']')) {
      str = str.slice(1, -1);
  }
  let rows = str.split(';');
  let result = [];
  for (let row of rows) {
      row = row.trim();
      if (row === '') {
        continue;
      }
      let elements = row.split(',');
      // elements = elements.map(el => Number(el.trim()));
      result.push(elements);
  }
  return result;
}

console.log('init');
