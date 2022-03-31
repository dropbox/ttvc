// This script immediately mutates the document after loading.
const p = document.createElement('p');
p.innerText = 'This is a paragraph.';
document.body.appendChild(p);
console.log('mutation');
