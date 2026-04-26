const fs = require('fs');
const css = `
@keyframes pulse-dot {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 20px currentColor; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

@keyframes scanline {
  0% { left: -40%; }
  100% { left: 100%; }
}
`;
fs.appendFileSync('src/components/Studio.css', css);
console.log('Appended CSS to Studio.css');
