// ASEAN member flags (simplified SVG, 30x20) for the home-country picker.
// Decorative for now: choosing a country changes only the flag shown.
// Windows doesn't render flag emojis, so these are drawn.

function star(cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
}

const stripes = (colors) => {
  const h = 20 / colors.length;
  return colors.map((c, i) => `<rect y="${(i * h).toFixed(3)}" width="30" height="${(h + 0.05).toFixed(3)}" fill="${c}"/>`).join("");
};

// Order: alphabetical by English name; Thailand first as the default home.
export const ASEAN = [
  { code: "THA", name: "Thailand", svg: stripes(["#A51931", "#F4F5F8", "#2D2A4A", "#2D2A4A", "#F4F5F8", "#A51931"]) },
  { code: "BRN", name: "Brunei", svg: `<rect width="30" height="20" fill="#F7E017"/><polygon points="0,4 30,13 30,17 0,8" fill="#FFFFFF"/><polygon points="0,8 30,17 30,20 0,11" fill="#000000"/><circle cx="15" cy="10" r="3.2" fill="#CF1126"/>` },
  { code: "KHM", name: "Cambodia", svg: `${stripes(["#032EA1", "#E00025", "#E00025", "#032EA1"])}<rect x="10" y="8" width="10" height="5" fill="#FFFFFF"/><rect x="11" y="6.3" width="2" height="2" fill="#FFFFFF"/><rect x="14" y="5.2" width="2" height="3" fill="#FFFFFF"/><rect x="17" y="6.3" width="2" height="2" fill="#FFFFFF"/>` },
  { code: "IDN", name: "Indonesia", svg: stripes(["#CE1126", "#FFFFFF"]) },
  { code: "LAO", name: "Laos", svg: `${stripes(["#CE1126", "#002868", "#002868", "#CE1126"])}<circle cx="15" cy="10" r="4" fill="#FFFFFF"/>` },
  { code: "MYS", name: "Malaysia", svg: `${stripes(["#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF", "#CC0001", "#FFFFFF"])}<rect width="15" height="11.43" fill="#010066"/><circle cx="5.6" cy="5.7" r="3.6" fill="#FFCC00"/><circle cx="6.6" cy="5.7" r="3" fill="#010066"/>${star(11, 5.7, 2.6, "#FFCC00")}` },
  { code: "MMR", name: "Myanmar", svg: `${stripes(["#FECB00", "#34B233", "#EA2839"])}${star(15, 10.6, 6.4, "#FFFFFF")}` },
  { code: "PHL", name: "Philippines", svg: `${stripes(["#0038A8", "#CE1126"])}<polygon points="0,0 17.3,10 0,20" fill="#FFFFFF"/><circle cx="6" cy="10" r="2.4" fill="#FCD116"/>${star(1.8, 2.6, 1.1, "#FCD116")}${star(1.8, 17.4, 1.1, "#FCD116")}${star(14.2, 10, 1.1, "#FCD116")}` },
  { code: "SGP", name: "Singapore", svg: `${stripes(["#EF3340", "#FFFFFF"])}<circle cx="6.2" cy="5" r="3.2" fill="#FFFFFF"/><circle cx="7.4" cy="5" r="3" fill="#EF3340"/>${star(9.2, 3.2, 0.8, "#FFFFFF")}${star(11.4, 4.2, 0.8, "#FFFFFF")}${star(11, 6.4, 0.8, "#FFFFFF")}${star(8.5, 6.5, 0.8, "#FFFFFF")}${star(7.8, 4.6, 0.8, "#FFFFFF")}` },
  { code: "TLS", name: "Timor-Leste", svg: `<rect width="30" height="20" fill="#DC241F"/><polygon points="0,0 15,10 0,20" fill="#FFC726"/><polygon points="0,0 10,10 0,20" fill="#000000"/>${star(3.6, 10, 2.6, "#FFFFFF")}` },
  { code: "VNM", name: "Vietnam", svg: `<rect width="30" height="20" fill="#DA251D"/>${star(15, 10.4, 6, "#FFFF00")}` }
];

export const JAPAN = { code: "JPN", name: "Japan", svg: `<rect width="30" height="20" fill="#FFFFFF"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>` };

export function flagSvg(country) {
  return `<svg class="flag" viewBox="0 0 30 20" role="img" aria-label="${country.name}">${country.svg}</svg>`;
}

export function findCountry(code) {
  return ASEAN.find((c) => c.code === code) || ASEAN[0];
}
