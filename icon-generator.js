// Execute este script no console do navegador para gerar ícones
const generateIcons = () => {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    
    sizes.forEach(size => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Fundo laranja
        ctx.fillStyle = '#FF6B35';
        ctx.fillRect(0, 0, size, size);
        
        // Desenhar ícone de utensílio
        ctx.fillStyle = 'white';
        ctx.font = `bold ${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍳', size/2, size/2);
        
        // Adicionar borda
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = size * 0.02;
        ctx.strokeRect(0, 0, size, size);
        
        // Criar link para download
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `icon-${size}.png`;
        link.click();
    });
    
    console.log('✅ Ícones gerados! Verifique suas downloads.');
};

// Para usar: copie este código, abra o console (F12) e cole: generateIcons()
