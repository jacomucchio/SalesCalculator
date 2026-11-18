# Registro compravendite

Webapp per tenere traccia degli articoli comprati e rivenduti (Vinted e altre piattaforme) e vedere quanto si guadagna.

## Avvio

```powershell
npm install
copy .env.example .env.local   # poi inserisci URL e publishable key di Supabase
npm run dev                    # http://localhost:5173
```

I dati stanno su **Supabase** (tabella `items`), quindi l'app funziona da qualsiasi browser e dispositivo. Si entra con email e password; ogni utente vede solo i propri articoli (Row Level Security).

Versione pubblicata: <https://jacomucchio.github.io/SalesCalculator/>

## Configurazione Supabase (una tantum)

1. **Project Settings → API**: copia *Project URL* e *publishable key* in `.env.local` e in GitHub → Settings → Secrets and variables → Actions → **Variables** come `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (sono chiavi pubbliche, la protezione la fa la RLS).
2. **Integrations → GitHub**: Supabase directory `supabase`, "Deploy to production" sul branch `main`. Le migrazioni in `supabase/migrations` vengono applicate a ogni merge su `main`.
3. **Authentication → Sign In / Providers → Email**: disattiva *Allow new users to sign up*. Poi **Authentication → Users → Add user** per creare il tuo account.
4. **Authentication → URL Configuration**: Site URL `https://jacomucchio.github.io/SalesCalculator/`, redirect aggiuntivo `http://localhost:5173`.
5. GitHub → Settings → **Pages** → Source: *GitHub Actions*. Il workflow `.github/workflows/deploy.yml` pubblica a ogni push su `main`.

## Dati

Tabella `public.items`, una riga per articolo (schema in `supabase/migrations`).

- `status`: `in_magazzino`, `in_vendita`, `venduto`, `tenuto`
- `purchase_price`: totale pagato, tutto compreso. `sale_price`: quanto è stato incassato.
- `estimated_price`: valore stimato di vendita, per gli articoli in magazzino o in vendita (facoltativo).
- `imported = true`: righe importate dal vecchio Excel, per le quali le date sono facoltative.

**Importa JSON** carica un registro nel vecchio formato locale (`{ "version": 1, "items": [...] }`, es. `vinted.json`) o un backup: gli articoli con lo stesso `id` vengono sovrascritti, quindi reimportare lo stesso file non crea doppioni.
**Backup JSON** scarica tutti i dati in quel formato. **Esporta CSV** crea un file apribile in Excel (separatore `;`, decimali con la virgola).

## Calcoli

| Indicatore | Definizione |
|---|---|
| Profitto realizzato | Σ (vendita − acquisto), solo articoli venduti |
| Saldo di cassa | totale vendite − totale acquisti (tutti gli articoli) |
| Valore inventario | costo degli articoli in magazzino / in vendita (con il valore stimato totale) |
| Profitto potenziale | Σ (valore atteso − acquisto) sugli articoli non venduti; valore atteso = valore stimato, altrimenti prezzo annuncio |

Con il filtro per anno, gli acquisti si contano per data di acquisto e le vendite per data di vendita; l'inventario è sempre quello attuale.

## Sviluppo

```powershell
npm test           # Vitest, logica in src/domain
npm run lint
npm run build
```

Struttura:

- `src/domain`: tipi, validazione, calcoli, CSV (senza dipendenze da React, testati)
- `src/storage`: client Supabase, mappatura righe ↔ articoli, hook `useRegistry` (login, caricamento, salvataggio)
- `supabase`: configurazione e migrazioni SQL
- `src/components`: interfaccia (shadcn/ui + Recharts)

> **Nota Windows:** se i test falliscono con `Cannot read properties of undefined (reading 'config')`, il terminale è nella cartella con la lettera di unità minuscola (`c:\...`). Apri il terminale in `C:\...` (maiuscola): è un problema noto di Vitest.
