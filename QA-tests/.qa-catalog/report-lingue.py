# Riassume il giro delle lingue: righe per docs/audit-cinque-lingue.md e l'elenco di ciò che resta da guardare.
# Uso: python QA-tests/.qa-catalog/report-lingue.py <giro.jsonl> <anonimo.json> <righe.md> [--riepilogo]
import collections
import json
import re
import sys

giro, anonimo, uscita = sys.argv[1:4]
misure = [json.loads(l) for l in open(giro, encoding='utf8')]
misure += json.load(open(anonimo, encoding='utf8'))

def nome(r):
    r = re.sub(r'/animali/dog-.*', '/animali/:id', r)
    r = re.sub(r'/appuntamenti/personale/per-.*', '/appuntamenti/personale/:id', r)
    r = re.sub(r'/appuntamenti/apt-fatta.*', '/appuntamenti/:id (completata)', r)
    r = re.sub(r'/appuntamenti/apt-.*', '/appuntamenti/:id', r)
    r = re.sub(r'/chiusure/chi-.*', '/chiusure/:id', r)
    return re.sub(r'/benvenuto passo \d+', '/benvenuto (passi)', r)

# Il foglio di stampa è nella lingua scelta per il listino, di proposito.
# Frasi composte o uguali in due lingue, controllate a mano.
FALSI = ('Backup. ', 'May', 'il est conseillé', 'Editar datos de la')

def estranee(m):
    return [] if m['rotta'] == '/listino/stampa' else [e for e in m.get('estranee', []) if not e['testo'].startswith(FALSI)]

righe = collections.OrderedDict()
for m in misure:
    if 'errore' in m:
        continue
    k = (nome(m['rotta']), m['lingua'])
    d = righe.setdefault(k, dict(ruoli=set(), larghezze=set(), pagine=0, dialoghi=0, est=collections.Counter(), lay=collections.Counter(), sillabe=0))
    d['ruoli'].add(m['ruolo']); d['larghezze'].add(m['larghezza'])
    d['dialoghi' if 'tocco' in m else 'pagine'] += 1
    for e in estranee(m):
        d['est'][e['testo'][:50]] += 1
    for x in m.get('fuori', []) + m.get('tagli', []) + (['scorrimento orizzontale'] if m.get('hscroll') else []):
        d['lay'][re.sub(r'\s+\d.*$', '', x)[:60]] += 1
    d['sillabe'] += len(m.get('spezzate', []))

out = ['| Schermata | Lingua | Ruoli | Larghezze | Misure | Dialoghi | Esito |', '|---|---|---|---|---:|---:|---|']
male = 0
for (rotta, lingua), d in sorted(righe.items(), key=lambda x: (x[0][0], 'it en es fr de'.split().index(x[0][1]))):
    note = [f'testo: {t}' for t in d['est']] + list(d['lay'])
    if note:
        male += 1
    esito = ('ok' + (', va a capo con il trattino' if d['sillabe'] else '')) if not note else 'da vedere: ' + '; '.join(sorted(note)[:3]).replace('|', '/')
    out.append(f"| `{rotta}` | {lingua} | {','.join(sorted(d['ruoli']))} | {','.join(map(str, sorted(d['larghezze'])))} | {d['pagine']} | {d['dialoghi']} | {esito} |")
open(uscita, 'w', encoding='utf8').write('\n'.join(out) + '\n')
print(len(misure), 'misure', len(righe), 'righe', male, 'da vedere', sum(1 for m in misure if 'tocco' in m), 'dialoghi', sum(1 for m in misure if 'errore' in m), 'errori')
if '--riepilogo' in sys.argv:
    c = collections.Counter()
    for (rotta, lingua), d in righe.items():
        for t, n in list(d['est'].items()) + list(d['lay'].items()):
            c[(t, rotta, lingua)] += n
    for k, v in c.most_common(70):
        print(v, k)
