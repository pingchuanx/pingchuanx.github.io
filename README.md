# Yundaichuan Zhan — Homepage

Personal academic homepage of **Yundaichuan Zhan** (詹云岱川), M.Eng. student in
Artificial Intelligence at Zhejiang University.

Live site: https://pingchuanx.github.io

## Structure

A simple, dependency-free static site served directly by GitHub Pages.

```
index.html    # Page content (profile, biography, news, publications)
style.css     # All styling and responsive layout
.nojekyll     # Disables Jekyll so the static files are served as-is
images/       # Profile photo, favicons, and publication thumbnails
```

## Local preview

```bash
python3 -m http.server 8099
# then open http://localhost:8099/index.html
```

## Editing

- **Bio / News / Publications**: edit the corresponding sections in `index.html`.
- **Styles**: edit `style.css`.
- **Images**: replace `images/profile.png` with your photo; add publication
  thumbnails to `images/` and reference them in `index.html`.
