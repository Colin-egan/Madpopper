// Hospital picker on hospitals.html: a dropdown whose options preview each hospital's branded bag.
export const HOSPITALS = [
  {
    id: 'unc', name: 'UNC Health', img: 'assets/images/hospitals/unc-health.webp',
    colors: 'Carolina blue, navy and white',
    alt: 'Clear bag of Carolina blue, navy and white popcorn with a UNC Health label and The Mad Popper sticker',
  },
  {
    id: 'duke', name: 'Duke Health', img: 'assets/images/hospitals/duke-health.webp',
    colors: 'Duke blue and white',
    alt: 'Clear bag of Duke blue and white popcorn with a Duke Health label and The Mad Popper sticker',
  },
  {
    id: 'wakemed', name: 'WakeMed', img: 'assets/images/hospitals/wakemed.webp',
    colors: 'red, gray and white',
    alt: 'Clear bag of red, gray and white popcorn with a WakeMed label and The Mad Popper sticker',
  },
  {
    id: 'other', name: 'Another hospital or clinic', img: 'assets/images/2018_04_colorful-bags.jpg',
    colors: 'your colors (tell us when you order)',
    alt: 'Colorful bags of Mad Popper popcorn',
  },
];

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const selectedHospital = () => {
  const id = document.querySelector('.hospital:checked')?.value;
  return HOSPITALS.find((h) => h.id === id) ?? HOSPITALS[0];
};

function show() {
  const h = selectedHospital();
  $('hospital-summary').innerHTML =
    `<img src="${escapeHtml(h.img)}" alt="" width="40" height="40"><span>${escapeHtml(h.name)}</span>`;
  const img = $('hospital-preview-img');
  img.src = h.img;
  img.alt = h.alt;
  $('hospital-name').textContent = h.name;
  $('hospital-colors').textContent = `Popcorn colors: ${h.colors}.`;
  $('hospital-other').hidden = h.id !== 'other';
  document.querySelectorAll('.hospital-opt').forEach((o) =>
    o.classList.toggle('is-selected', o.querySelector('input').checked));
}

export function initHospitalPicker() {
  $('hospital-list').innerHTML = HOSPITALS.map((h, i) => `
    <label class="hospital-opt">
      <input type="radio" name="hospital" class="hospital" value="${escapeHtml(h.id)}"${i === 0 ? ' checked' : ''}>
      <img src="${escapeHtml(h.img)}" alt="" width="64" height="64">
      <span><strong>${escapeHtml(h.name)}</strong><small>${escapeHtml(h.colors)}</small></span>
    </label>`).join('');

  const dd = $('hospital-dd');
  const close = () => { dd.open = false; dd.querySelector('summary').focus(); };
  // Arrow keys change the choice and keep the list open; a mouse click or Enter picks and closes.
  $('hospital-list').addEventListener('change', () => {
    show();
    document.dispatchEvent(new CustomEvent('hospitalchange'));
  });
  $('hospital-list').addEventListener('click', (e) => {
    if (e.detail > 0 && e.target.closest('.hospital-opt')) close();
  });
  document.addEventListener('click', (e) => {
    if (dd.open && !dd.contains(e.target)) dd.open = false;
  });
  dd.addEventListener('keydown', (e) => {
    if (!dd.open) return;
    if (e.key === 'Escape' || (e.key === 'Enter' && e.target.classList.contains('hospital'))) {
      e.preventDefault();
      close();
    }
  });
  // Opening the list moves focus to the chosen hospital so arrow keys work right away.
  dd.addEventListener('toggle', () => {
    if (dd.open) document.querySelector('.hospital:checked')?.focus();
  });
  show();
}
