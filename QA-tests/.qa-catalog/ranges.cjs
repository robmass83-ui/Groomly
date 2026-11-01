const r = require('./routes.json'); const g = +process.argv[2]
r.forEach((x, i) => { if (i % 7 !== g) return; const s = x.path === '/' ? '_home' : x.path.replace(/\//g, '_').replace(/:/g, '').replace(/^_/, ''); const a = i * 5 + 1; console.log(`- analyses/${s}.json → T${String(a).padStart(3, '0')}-T${String(a + 4).padStart(3, '0')}`) })
