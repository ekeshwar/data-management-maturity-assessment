"""
inject_banner.py <env> <filepath>

Injects an environment banner into a copy of index.html.
  env:      'dev' or 'staging'
  filepath: path to the HTML file to modify in-place
"""
import sys

env = sys.argv[1]
filepath = sys.argv[2]

if env == 'dev':
    banner_css = """
  /* Environment banner */
  .env-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    text-align: center; font-size: 0.82rem; font-weight: 700;
    padding: 7px 12px; letter-spacing: 0.04em; font-family: 'Montserrat', sans-serif; }
  .env-dev { background: #f59e0b; color: #1c0a00; }
  body { padding-top: 32px; }
"""
    banner_html = '<div class="env-banner env-dev">\U0001f527 DEVELOPMENT ENVIRONMENT \u2014 Not for live use</div>'

elif env == 'staging':
    banner_css = """
  /* Environment banner */
  .env-banner { position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    text-align: center; font-size: 0.82rem; font-weight: 700;
    padding: 7px 12px; letter-spacing: 0.04em; font-family: 'Montserrat', sans-serif; }
  .env-staging { background: #ef4444; color: #fff; }
  body { padding-top: 32px; }
"""
    banner_html = '<div class="env-banner env-staging">\U0001f9ea TESTING / STAGING ENVIRONMENT \u2014 Pending approval, not for live use</div>'

else:
    print(f"Unknown env: {env}", file=sys.stderr)
    sys.exit(1)

with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('</style>', banner_css + '\n  </style>', 1)
html = html.replace('<body>', '<body>\n' + banner_html, 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Banner injected for env={env} into {filepath}")
