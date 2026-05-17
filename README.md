# gerardobarberena.com

Personal website for Gerardo Barberena — Senior AI/ML Engineer.

Static site (HTML / CSS / vanilla JS) with EN / ES / ZH / FR i18n, served from GitHub Pages.

Repo: <https://github.com/gbarberena2/gerardobarberena>

## Local preview

Use the `gerardobarberena` conda env:

```powershell
conda activate gerardobarberena
python -m http.server 8765
```

Then open <http://localhost:8765>.

To regenerate the cleaned CV PDF (only phone shown as personal contact):

```powershell
python generate_cv_pdf.py
```

## Deploy to GitHub Pages

The repo is `gbarberena2/gerardobarberena` (a project repo, not a user-pages repo). To publish:

1. In the repo on GitHub: **Settings → Pages**
2. **Source**: *Deploy from a branch*
3. **Branch**: `main` / `/ (root)` → **Save**
4. Wait ~1 minute. The site goes live at `https://gbarberena2.github.io/gerardobarberena/` (and at the custom domain once DNS is configured).

## Custom domain (gerardobarberena.com)

The `CNAME` file already declares the apex domain.

At your DNS provider, add:

| Type  | Name | Value                       |
|-------|------|-----------------------------|
| A     | @    | 185.199.108.153             |
| A     | @    | 185.199.109.153             |
| A     | @    | 185.199.110.153             |
| A     | @    | 185.199.111.153             |
| CNAME | www  | `gbarberena2.github.io.`    |

After DNS propagates (a few minutes to a few hours):

- GitHub → **Settings → Pages** should show the green check for `gerardobarberena.com`
- Enable **Enforce HTTPS**

## Structure

```
.
├── index.html             # single page
├── styles.css             # glassmorphism + gradients
├── script.js              # i18n + scroll reveals
├── translations.js        # EN/ES/ZH/FR strings
├── generate_cv_pdf.py     # produces assets/cv_gerardo_barberena.pdf
├── assets/
│   └── cv_gerardo_barberena.pdf
├── foto_gerardo.jpeg
├── CNAME
└── README.md
```
