const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '../icons');

if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Este é um script placeholder
// Na prática, você precisaria de uma imagem base (512x512)
// e usar uma biblioteca como sharp para gerar os tamanhos

console.log('Gerando ícones para PWA...');
console.log('Coloque uma imagem icon.png (512x512) na pasta icons/');
console.log('Depois use uma ferramenta como: https://realfavicongenerator.net/');