const comando = process.argv[2]
const secondoArgomento = process.argv[3]

if (comando === 'elenco') {
  process.stdout.write('Questo script non collega Firebase in questo passaggio.\n')
  process.exit(0)
}

if (comando === 'cancella' && secondoArgomento === undefined) {
  process.exit(1)
}

process.exit(1)
