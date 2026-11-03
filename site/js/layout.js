const NAV = [
  ['flavors.html', 'Flavors'], ['sizes.html', 'Sizes'], ['allergens.html', 'Allergens'],
  ['fundraisers.html', 'Fundraisers'], ['popcorn-day.html', 'Popcorn Day'], ['gallery.html', 'Gallery'],
  ['about.html', 'About Us'], ['faq.html', 'FAQ'], ['corporate.html', 'Corporate'],
];
const strip = (p) => p.replace(/\.html$/, '');
const page = strip(location.pathname.split('/').pop()) || 'index';

const header = `
<header class="site-header"><div class="container header-inner">
  <a href="index.html" class="logo" aria-label="The Mad Popper, home"><img src="assets/brand/2018_02_Logo-white.png" alt="The Mad Popper: Gourmet Popcorn Shop" width="232" height="223"></a>
  <button type="button" class="nav-toggle" aria-label="Menu" aria-controls="site-nav" aria-expanded="false">☰</button>
  <nav class="nav" id="site-nav">${NAV.map(([href, label]) =>
    `<a href="${href}"${strip(href) === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
</div></header>`;

const footer = `
<footer class="site-footer"><div class="container footer-grid">
  <div><h3>The Mad Popper</h3><p>Durham's Local Gourmet Popcorn Shop</p><p>100% nut-free · non-GMO corn</p></div>
  <div><h3>Visit</h3><p>Homestead Market<br>105 W. NC-54, Suite 259<br>Durham, NC</p><p>919-484-7677</p></div>
  <div><h3>Hours</h3><p>Mon–Fri 11am–6pm<br>Sat 11am–5pm<br>Closed Sunday</p></div>
</div>
<p class="container fineprint">Prototype built for a university case study. Not the official Mad Popper website.</p>
</footer>`;

document.getElementById('site-header').outerHTML = header;
document.getElementById('site-footer').outerHTML = footer;
document.querySelector('.nav-toggle').addEventListener('click', (e) => {
  const open = document.querySelector('.nav').classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
});

const head = document.head;
for (const attrs of [
  { rel: 'icon', type: 'image/png', href: 'assets/brand/2018_03_favicon.png' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
  { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Didact+Gothic&family=Life+Savers:wght@400;700;800&display=swap' },
]) {
  const link = document.createElement('link');
  Object.assign(link, attrs);
  if ('crossorigin' in attrs) link.setAttribute('crossorigin', '');
  head.appendChild(link);
}
