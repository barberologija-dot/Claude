# Slovenian texts for Supabase login emails

Paste these in Supabase under **Authentication**, **Email Templates**.
Keep `{{ .ConfirmationURL }}` exactly as written; Supabase replaces it with the real link.

## Confirm signup

**Subject:** `Potrdi svoj e-naslov`

```html
<h2>Potrdi svoj e-naslov</h2>
<p>Živjo! Še en korak do rezervacije termina.</p>
<p><a href="{{ .ConfirmationURL }}">Potrdi e-naslov</a></p>
<p>Če računa nisi ustvaril ti, to sporočilo preprosto prezri.</p>
```

## Reset password

**Subject:** `Novo geslo`

```html
<h2>Novo geslo</h2>
<p>Klikni spodnjo povezavo in nastavi novo geslo.</p>
<p><a href="{{ .ConfirmationURL }}">Nastavi novo geslo</a></p>
<p>Če tega nisi zahteval ti, to sporočilo preprosto prezri.</p>
```
