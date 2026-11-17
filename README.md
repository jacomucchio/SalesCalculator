# Registro compravendite

Webapp locale per tenere traccia degli articoli comprati e rivenduti (Vinted e altre piattaforme) e vedere quanto si guadagna.

## Avvio

```powershell
npm install
npm run dev        # http://localhost:5173
```

Usa **Chrome o Edge su PC**: l'app salva su un file JSON tramite la File System Access API, che gli altri browser non supportano.

Al primo avvio scegli **Apri un file esistente** (es. `Documents\Vinted\vinted.json`) o **Crea un nuovo registro**. Ogni modifica viene scritta subito sul file. Alle visite successive l'app ricorda il file, ma il browser chiede di nuovo il permesso con un clic.

## Dati

Il file è un JSON leggibile:

```json
{ "version": 1, "items": [ { "name": "...", "purchasePrice": 81.69, "status": "venduto", ... } ] }
```

- `status`: `in_magazzino`, `in_vendita`, `venduto`, `tenuto`
- `purchasePrice`: totale pagato, tutto compreso. `salePrice`: quanto è stato incassato.
- `imported: true`: righe importate dal vecchio Excel, per le quali le date sono facoltative.

**Esporta CSV** crea un file apribile in Excel (separatore `;`, decimali con la virgola).

## Calcoli

| Indicatore | Definizione |
|---|---|
| Profitto realizzato | Σ (vendita − acquisto), solo articoli venduti |
| Saldo di cassa | totale vendite − totale acquisti (tutti gli articoli) |
| Valore inventario | costo degli articoli in magazzino / in vendita |
| Profitto potenziale | Σ (prezzo annuncio − acquisto), articoli in vendita con prezzo annuncio |

Con il filtro per anno, gli acquisti si contano per data di acquisto e le vendite per data di vendita; l'inventario è sempre quello attuale.

## Sviluppo

```powershell
npm test           # Vitest, logica in src/domain
npm run lint
npm run build
```

Struttura:

- `src/domain`: tipi, validazione, calcoli, CSV (senza dipendenze da React, testati)
- `src/storage`: lettura/scrittura del file JSON e hook `useRegistry`
- `src/components`: interfaccia (shadcn/ui + Recharts)

> **Nota Windows:** se i test falliscono con `Cannot read properties of undefined (reading 'config')`, il terminale è nella cartella con la lettera di unità minuscola (`c:\...`). Apri il terminale in `C:\...` (maiuscola): è un problema noto di Vitest.
